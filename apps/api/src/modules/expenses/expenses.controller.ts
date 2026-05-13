import { Body, Controller, Get, Param, Patch, Post, Query, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CreateExpenseDto, ListExpensesDto, ReimburseExpenseDto, ReviewExpenseDto, UpdateExpenseDto } from './dto/expense.dto.js';
import { ExpensesService } from './expenses.service.js';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get() @Version('1') @RequirePermissions(permissions.expensesRead)
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListExpensesDto) { return this.expenses.list(principal, query); }

  @Get(':id') @Version('1') @RequirePermissions(permissions.expensesRead)
  get(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string) { return this.expenses.get(principal, id); }

  @Post() @Version('1') @RequirePermissions(permissions.expensesSubmit)
  create(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: CreateExpenseDto, @Req() request: Request) { return this.expenses.create(principal, dto, this.context(request)); }

  @Patch(':id') @Version('1') @RequirePermissions(permissions.expensesSubmit)
  update(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateExpenseDto, @Req() request: Request) { return this.expenses.update(principal, id, dto, this.context(request)); }

  @Post(':id/submit') @Version('1') @RequirePermissions(permissions.expensesSubmit)
  submit(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Req() request: Request) { return this.expenses.submit(principal, id, this.context(request)); }

  @Post(':id/review') @Version('1') @RequirePermissions(permissions.expensesReview)
  review(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: ReviewExpenseDto, @Req() request: Request) { return this.expenses.review(principal, id, dto, this.context(request)); }

  @Post(':id/approve') @Version('1') @RequirePermissions(permissions.expensesApprove)
  approve(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: ReviewExpenseDto, @Req() request: Request) { return this.expenses.approve(principal, id, dto, this.context(request)); }

  @Post(':id/reject') @Version('1') @RequirePermissions(permissions.expensesReject)
  reject(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: ReviewExpenseDto, @Req() request: Request) { return this.expenses.reject(principal, id, dto, this.context(request)); }

  @Post(':id/reimburse') @Version('1') @RequirePermissions(permissions.expensesReimburse)
  reimburse(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: ReimburseExpenseDto, @Req() request: Request) { return this.expenses.reimburse(principal, id, dto, this.context(request)); }

  private context(request: Request) {
    return { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] };
  }
}
