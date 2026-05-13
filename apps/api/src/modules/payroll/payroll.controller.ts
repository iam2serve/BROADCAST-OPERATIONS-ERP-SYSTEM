import { Body, Controller, Get, Param, Patch, Post, Query, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CreatePayrollAdjustmentDto, CreatePayrollPeriodDto, CreatePayoutDto, CreateSalaryProfileDto, ListPayrollDto, UpdateSalaryProfileDto } from './dto/payroll.dto.js';
import { PayrollService } from './payroll.service.js';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get('salary-profiles') @Version('1') @RequirePermissions(permissions.payrollRead)
  salaryProfiles(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListPayrollDto) { return this.payroll.salaryProfiles(principal, query); }

  @Post('salary-profiles') @Version('1') @RequirePermissions(permissions.payrollManage)
  createSalaryProfile(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: CreateSalaryProfileDto, @Req() request: Request) { return this.payroll.createSalaryProfile(principal, dto, this.context(request)); }

  @Patch('salary-profiles/:id') @Version('1') @RequirePermissions(permissions.payrollManage)
  updateSalaryProfile(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateSalaryProfileDto, @Req() request: Request) { return this.payroll.updateSalaryProfile(principal, id, dto, this.context(request)); }

  @Post('periods') @Version('1') @RequirePermissions(permissions.payrollManage)
  createPeriod(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: CreatePayrollPeriodDto, @Req() request: Request) { return this.payroll.createPeriod(principal, dto, this.context(request)); }

  @Post('payouts') @Version('1') @RequirePermissions(permissions.payrollManage)
  createPayout(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: CreatePayoutDto, @Req() request: Request) { return this.payroll.createPayout(principal, dto, this.context(request)); }

  @Post('payouts/:id/pay') @Version('1') @RequirePermissions(permissions.payrollManage)
  payPayout(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Req() request: Request) { return this.payroll.payPayout(principal, id, this.context(request)); }

  @Post('adjustments') @Version('1') @RequirePermissions(permissions.payrollManage)
  createAdjustment(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: CreatePayrollAdjustmentDto, @Req() request: Request) { return this.payroll.createAdjustment(principal, dto, this.context(request)); }

  private context(request: Request) {
    return { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] };
  }
}
