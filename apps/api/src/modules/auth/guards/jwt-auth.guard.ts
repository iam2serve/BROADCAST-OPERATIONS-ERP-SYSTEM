import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Permission } from '@broadcast/auth';

import { PrismaService } from '../../../database/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { isPublicKey } from '../decorators/public.decorator.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import { TokenService } from '../services/token.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(isPublicKey, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'ACCESS_TOKEN_REQUIRED',
        message: 'Access token is required.',
      });
    }

    const payload = await this.tokens.verifyAccessToken(token).catch(() => {
      throw new UnauthorizedException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is invalid or expired.',
      });
    });

    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message: 'Session is no longer active.',
      });
    }

    const user = await this.users.findAuthProfileById(payload.sub);

    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_INACTIVE',
        message: 'User is inactive or unavailable.',
      });
    }

    const principal: AuthenticatedPrincipal = {
      userId: user.id,
      organizationId: user.organizationId,
      roleId: user.role.name,
      permissions: user.role.permissions.map((rolePermission) => rolePermission.permission.key) as Permission[],
      sessionId: session.id,
    };

    if (user.branchId) {
      principal.branchId = user.branchId;
    }

    request.user = principal;

    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | null {
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      return null;
    }

    return header.slice('Bearer '.length);
  }
}
