import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { AuthenticatedPrincipal, TokenPair } from '@broadcast/auth';

import { AppConfigService } from '../../../system/app-config.service.js';
import type { JwtPayload } from '../types/jwt-payload.js';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async createAccessToken(principal: AuthenticatedPrincipal): Promise<string> {
    const payload: JwtPayload = {
      sub: principal.userId,
      sid: principal.sessionId,
      org: principal.organizationId,
      role: principal.roleId,
    };

    if (principal.branchId) {
      payload.branch = principal.branchId;
    }

    return this.jwt.signAsync(payload, {
      secret: this.config.values.JWT_ACCESS_SECRET,
      expiresIn: this.config.values.JWT_ACCESS_TTL,
    });
  }

  createRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  async createTokenPair(principal: AuthenticatedPrincipal, refreshToken: string): Promise<TokenPair> {
    return {
      accessToken: await this.createAccessToken(principal),
      refreshToken,
      expiresIn: this.parseAccessTokenTtlSeconds(),
    };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.config.values.JWT_ACCESS_SECRET,
    });
  }

  getRefreshTokenExpiry(): Date {
    return new Date(Date.now() + this.parseDurationMs(this.config.values.JWT_REFRESH_TTL));
  }

  private parseAccessTokenTtlSeconds(): number {
    return Math.floor(this.parseDurationMs(this.config.values.JWT_ACCESS_TTL) / 1000);
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);

    if (!match) {
      return Number(value) * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multiplier = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;

    return amount * multiplier;
  }
}
