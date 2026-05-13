import { Body, Controller, Get, Param, Patch, Post, Query, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { BulkMarkReadDto, DispatchNotificationDto, ListNotificationsDto } from './dto/notification.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get() @Version('1') @RequirePermissions(permissions.notificationsRead)
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListNotificationsDto) { return this.notifications.list(principal, query); }

  @Post('dispatch') @Version('1') @RequirePermissions(permissions.notificationsManage)
  dispatch(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: DispatchNotificationDto, @Req() request: Request) {
    return this.notifications.dispatch(principal, dto, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }

  @Patch(':id/read') @Version('1') @RequirePermissions(permissions.notificationsRead)
  markRead(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string) { return this.notifications.markRead(principal, id); }

  @Patch('bulk-read') @Version('1') @RequirePermissions(permissions.notificationsRead)
  bulkRead(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: BulkMarkReadDto) { return this.notifications.bulkMarkRead(principal, dto); }
}
