import { Controller, Get, Version } from '@nestjs/common';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview') @Version('1') @RequirePermissions(permissions.analyticsRead)
  overview(@CurrentUser() principal: AuthenticatedPrincipal) { return this.analytics.overview(principal); }

  @Get('utilization') @Version('1') @RequirePermissions(permissions.analyticsRead)
  utilization(@CurrentUser() principal: AuthenticatedPrincipal) { return this.analytics.utilization(principal); }
}
