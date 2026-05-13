import { Body, Controller, Get, Post, Query, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { GenerateReportDto, ListReportsDto } from './dto/report.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get() @Version('1') @RequirePermissions(permissions.reportsRead)
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListReportsDto) { return this.reports.list(principal, query); }

  @Post('generate') @Version('1') @RequirePermissions(permissions.reportsRead)
  generate(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: GenerateReportDto, @Req() request: Request) {
    return this.reports.generate(principal, dto, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }
}
