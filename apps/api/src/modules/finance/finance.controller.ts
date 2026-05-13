import { Body, Controller, Get, Param, Post, Query, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CreateFinancialLockDto, FinancialSummaryDto, LedgerQueryDto } from './dto/finance.dto.js';
import { FinanceService } from './finance.service.js';

@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('ledger')
  @Version('1')
  @RequirePermissions(permissions.financeRead)
  ledger(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: LedgerQueryDto) {
    return this.finance.ledger(principal, query);
  }

  @Get('summary')
  @Version('1')
  @RequirePermissions(permissions.financeRead)
  summary(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: FinancialSummaryDto) {
    return this.finance.summary(principal, query);
  }

  @Get('events/:eventId/profitability')
  @Version('1')
  @RequirePermissions(permissions.financeRead)
  profitability(@CurrentUser() principal: AuthenticatedPrincipal, @Param('eventId') eventId: string) {
    return this.finance.eventProfitability(principal, eventId);
  }

  @Post('locks')
  @Version('1')
  @RequirePermissions(permissions.financeLock)
  lock(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: CreateFinancialLockDto, @Req() request: Request) {
    return this.finance.lock(principal, dto, { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
  }
}
