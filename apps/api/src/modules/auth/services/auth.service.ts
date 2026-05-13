import { randomBytes } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';

import type { AuthenticatedPrincipal, TokenPair } from '@broadcast/auth';
import type { Permission } from '@broadcast/auth';

import type { RequestContext } from '../../../common/context/request-context.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { AppConfigService } from '../../../system/app-config.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { UsersService } from '../../users/users.service.js';
import { LoginDto } from '../dto/login.dto.js';
import { PasswordResetRequestDto } from '../dto/password-reset-request.dto.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

type AuthResult = {
  user: Awaited<ReturnType<UsersService['findAuthProfileById']>>;
  tokens: TokenPair;
};

@Injectable()
export class AuthService {
  private readonly refreshCookieName = 'broadcast_refresh_token';

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  async login(dto: LoginDto, context: RequestContext, response?: Response): Promise<AuthResult> {
    const user = await this.users.findActiveByEmail(dto.email);

    if (!user || !(await this.passwords.verify(user.passwordHash, dto.password))) {
      await this.audit.record({
        action: 'auth.login_failed',
        entityType: 'User',
        newValues: { email: dto.email.toLowerCase() },
        context,
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const refreshToken = this.tokens.createRefreshToken();
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: await this.passwords.hash(refreshToken),
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
        expiresAt: this.tokens.getRefreshTokenExpiry(),
      },
    });

    const principal = this.toPrincipal(user, session.id);
    const authProfile = await this.users.findAuthProfileById(user.id);
    const tokenPair = await this.tokens.createTokenPair(principal, refreshToken);

    this.setRefreshCookie(response, refreshToken);

    await this.audit.record({
      userId: user.id,
      action: 'auth.login',
      entityType: 'Session',
      entityId: session.id,
      context,
    });

    return {
      user: authProfile,
      tokens: tokenPair,
    };
  }

  async refresh(refreshToken: string | undefined, context: RequestContext, response?: Response): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token is required.',
      });
    }

    const activeSessions = await this.prisma.session.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: {
          deletedAt: null,
          status: 'ACTIVE',
        },
      },
      include: {
        user: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
            operatorProfile: true,
          },
        },
      },
    });

    const session = await this.findSessionByRefreshToken(activeSessions, refreshToken);

    if (!session) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired.',
      });
    }

    const nextRefreshToken = this.tokens.createRefreshToken();
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: await this.passwords.hash(nextRefreshToken),
        expiresAt: this.tokens.getRefreshTokenExpiry(),
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
      },
    });

    const principal = this.toPrincipal(session.user, session.id);
    const authProfile = await this.users.findAuthProfileById(session.userId);
    const tokenPair = await this.tokens.createTokenPair(principal, nextRefreshToken);

    this.setRefreshCookie(response, nextRefreshToken);

    return {
      user: authProfile,
      tokens: tokenPair,
    };
  }

  async logout(
    principal: AuthenticatedPrincipal,
    context: RequestContext,
    options: { allSessions?: boolean },
    response?: Response,
  ): Promise<{ revoked: true }> {
    const where = options.allSessions
      ? { userId: principal.userId, revokedAt: null }
      : { id: principal.sessionId, revokedAt: null };

    await this.prisma.session.updateMany({
      where,
      data: { revokedAt: new Date() },
    });

    this.clearRefreshCookie(response);

    await this.audit.record({
      userId: principal.userId,
      action: options.allSessions ? 'auth.session_revoked' : 'auth.logout',
      entityType: 'Session',
      entityId: principal.sessionId,
      context,
    });

    return { revoked: true };
  }

  async me(principal: AuthenticatedPrincipal) {
    return this.users.findAuthProfileById(principal.userId);
  }

  async requestPasswordReset(dto: PasswordResetRequestDto, context: RequestContext): Promise<{ accepted: true }> {
    const user = await this.users.findActiveByEmail(dto.email);

    if (user) {
      const resetToken = randomBytes(32).toString('base64url');
      const expiresAt = new Date(
        Date.now() + this.config.values.PASSWORD_RESET_TTL_MINUTES * 60_000,
      );

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: await this.passwords.hash(resetToken),
          expiresAt,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
      });

      await this.audit.record({
        userId: user.id,
        action: 'auth.password_reset_requested',
        entityType: 'User',
        entityId: user.id,
        context,
      });
    }

    return { accepted: true };
  }

  private async findSessionByRefreshToken<T extends { refreshTokenHash: string }>(
    sessions: T[],
    refreshToken: string,
  ): Promise<T | null> {
    for (const session of sessions) {
      if (await this.passwords.verify(session.refreshTokenHash, refreshToken)) {
        return session;
      }
    }

    return null;
  }

  private toPrincipal(
    user: NonNullable<Awaited<ReturnType<UsersService['findActiveByEmail']>>>,
    sessionId: string,
  ): AuthenticatedPrincipal {
    const principal: AuthenticatedPrincipal = {
      userId: user.id,
      organizationId: user.organizationId,
      roleId: user.role.name,
      permissions: user.role.permissions.map((rolePermission) => rolePermission.permission.key) as Permission[],
      sessionId,
    };

    if (user.branchId) {
      principal.branchId = user.branchId;
    }

    return principal;
  }

  private setRefreshCookie(response: Response | undefined, refreshToken: string): void {
    response?.cookie(this.refreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.values.AUTH_COOKIE_SECURE,
      domain: this.config.values.AUTH_COOKIE_DOMAIN || undefined,
      path: '/api/v1/auth',
      expires: this.tokens.getRefreshTokenExpiry(),
    });
  }

  private clearRefreshCookie(response: Response | undefined): void {
    response?.clearCookie(this.refreshCookieName, {
      domain: this.config.values.AUTH_COOKIE_DOMAIN || undefined,
      path: '/api/v1/auth',
    });
  }
}
