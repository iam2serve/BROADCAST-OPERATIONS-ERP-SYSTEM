import { Body, Controller, Get, Param, Post, Query, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { AutomationService } from './automation.service.js';
import { CreateAutomationRuleDto, ExecuteAutomationDto, ListAutomationRulesDto } from './dto/automation.dto.js';

@Controller('automation/rules')
export class AutomationController {
  constructor(private readonly automation: AutomationService) {}

  @Get() @Version('1') @RequirePermissions(permissions.automationRead)
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListAutomationRulesDto) { return this.automation.list(principal, query); }

  @Post() @Version('1') @RequirePermissions(permissions.automationManage)
  create(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: CreateAutomationRuleDto, @Req() request: Request) {
    return this.automation.create(principal, dto, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }

  @Post(':id/execute') @Version('1') @RequirePermissions(permissions.automationManage)
  execute(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: ExecuteAutomationDto, @Req() request: Request) {
    return this.automation.execute(principal, id, dto, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }

  @Post('execute-scheduled') @Version('1') @RequirePermissions(permissions.automationManage)
  scheduled(@CurrentUser() principal: AuthenticatedPrincipal) { return this.automation.executeScheduled(principal); }
}
