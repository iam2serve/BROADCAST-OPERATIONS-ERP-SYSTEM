import { Body, Controller, Get, Param, Post, Query, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { PullUpdatesDto, PushMutationsDto, ResolveConflictDto } from './dto/sync.dto.js';
import { SyncService } from './sync.service.js';

@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push') @Version('1') @RequirePermissions(permissions.syncManage)
  push(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: PushMutationsDto, @Req() request: Request) {
    return this.sync.push(principal, dto, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }

  @Get('pull') @Version('1') @RequirePermissions(permissions.syncManage)
  pull(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: PullUpdatesDto) { return this.sync.pull(principal, query); }

  @Get('conflicts') @Version('1') @RequirePermissions(permissions.syncManage)
  conflicts(@CurrentUser() principal: AuthenticatedPrincipal) { return this.sync.conflicts(principal); }

  @Post('conflicts/:id/resolve') @Version('1') @RequirePermissions(permissions.syncManage)
  resolve(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: ResolveConflictDto, @Req() request: Request) {
    return this.sync.resolve(principal, id, dto, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }
}
