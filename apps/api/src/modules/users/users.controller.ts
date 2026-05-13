import { Body, Controller, Get, Param, Patch, Post, Query, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { AcceptInviteDto } from './dto/accept-invite.dto.js';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { ListUsersDto } from './dto/list-users.dto.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Version('1')
  @RequirePermissions(permissions.usersRead)
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListUsersDto) {
    return this.users.list(principal, query);
  }

  @Get(':id')
  @Version('1')
  @RequirePermissions(permissions.usersRead)
  getById(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.users.getById(principal, id);
  }

  @Post('invite')
  @Version('1')
  @RequirePermissions(permissions.usersInvite)
  invite(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: InviteUserDto,
    @Req() request: Request,
  ) {
    return this.users.invite(principal, dto, {
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Public()
  @Post('accept-invite')
  @Version('1')
  acceptInvite(@Body() dto: AcceptInviteDto, @Req() request: Request) {
    return this.users.acceptInvite(dto, {
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Patch(':id')
  @Version('1')
  @RequirePermissions(permissions.usersUpdate)
  update(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: Request,
  ) {
    return this.users.update(principal, id, dto, {
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Patch(':id/status')
  @Version('1')
  @RequirePermissions(permissions.usersManageStatus)
  updateStatus(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() request: Request,
  ) {
    return this.users.updateStatus(principal, id, dto, {
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Patch(':id/preferences')
  @Version('1')
  updatePreferences(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.users.updatePreferences(principal, id, dto);
  }
}
