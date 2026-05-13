import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CreateEventDto, ListEventsDto, UpdateEventDto, UpdateEventStatusDto } from './dto/event.dto.js';
import { EventsService } from './events.service.js';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @Version('1')
  @RequirePermissions(permissions.eventsRead)
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListEventsDto) {
    return this.events.list(principal, query);
  }

  @Get(':id')
  @Version('1')
  @RequirePermissions(permissions.eventsRead)
  get(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.events.get(principal, id);
  }

  @Get(':id/timeline')
  @Version('1')
  @RequirePermissions(permissions.eventsRead)
  timeline(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.events.timelineForEvent(principal, id);
  }

  @Post()
  @Version('1')
  @RequirePermissions(permissions.eventsCreate)
  create(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: CreateEventDto, @Req() request: Request) {
    return this.events.create(principal, dto, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }

  @Patch(':id')
  @Version('1')
  @RequirePermissions(permissions.eventsUpdate)
  update(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateEventDto, @Req() request: Request) {
    return this.events.update(principal, id, dto, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }

  @Patch(':id/status')
  @Version('1')
  @RequirePermissions(permissions.eventsManageStatus)
  updateStatus(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateEventStatusDto, @Req() request: Request) {
    return this.events.updateStatus(principal, id, dto, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }

  @Delete(':id')
  @Version('1')
  @RequirePermissions(permissions.eventsDelete)
  remove(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Req() request: Request) {
    return this.events.remove(principal, id, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }
}
