import { Body, Controller, Get, Post, Req, Res, Version } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { AuthService } from './services/auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @Version('1')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.auth.login(dto, this.getContext(request), response);
  }

  @Post('logout')
  @Version('1')
  logout(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: LogoutDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.logout(principal, this.getContext(request), dto, response);
  }

  @Public()
  @Post('refresh')
  @Version('1')
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, string | undefined> | undefined;

    return this.auth.refresh(
      dto.refreshToken ?? cookies?.broadcast_refresh_token,
      this.getContext(request),
      response,
    );
  }

  @Get('me')
  @Version('1')
  me(@CurrentUser() principal: AuthenticatedPrincipal) {
    return this.auth.me(principal);
  }

  @Public()
  @Post('password-reset/request')
  @Version('1')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  requestPasswordReset(@Body() dto: PasswordResetRequestDto, @Req() request: Request) {
    return this.auth.requestPasswordReset(dto, this.getContext(request));
  }

  private getContext(request: Request) {
    return {
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }
}
