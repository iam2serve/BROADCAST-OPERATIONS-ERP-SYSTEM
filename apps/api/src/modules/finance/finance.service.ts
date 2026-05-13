import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateFinancialLockDto, FinancialLockTypeDto, FinancialSummaryDto, LedgerQueryDto } from './dto/finance.dto.js';

type LedgerAmount = number | string | Prisma.Decimal;
type LedgerLine = { accountCode: string; direction: 'DEBIT' | 'CREDIT'; amount: LedgerAmount; description?: string };
type PostTransactionInput = {
  type: 'SALARY' | 'ADVANCE' | 'DEDUCTION' | 'PAYROLL_PAYOUT' | 'EXPENSE' | 'REIMBURSEMENT' | 'EVENT_PAYMENT' | 'SIM_RECHARGE' | 'REPAIR' | 'ADJUSTMENT';
  description?: string;
  referenceType?: string;
  referenceId?: string;
  eventId?: string;
  expenseId?: string;
  payrollPayoutId?: string;
  payrollAdjustmentId?: string;
  currency?: string;
  metadata?: unknown;
  ledgerEntries: LedgerLine[];
};

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async assertEventUnlocked(organizationId: string, eventId: string) {
    const lock = await this.prisma.financialLock.findFirst({ where: { organizationId, eventId, lockType: 'EVENT' } });
    if (lock) throw new ConflictException({ code: 'EVENT_FINANCIALLY_LOCKED', message: 'Event financials are locked.' });
  }

  async assertPayrollPeriodUnlocked(organizationId: string, payrollPeriodId: string) {
    const lock = await this.prisma.financialLock.findFirst({ where: { organizationId, payrollPeriodId, lockType: 'PAYROLL_PERIOD' } });
    if (lock) throw new ConflictException({ code: 'PAYROLL_PERIOD_LOCKED', message: 'Payroll period is financially locked.' });
  }

  async postTransaction(principal: AuthenticatedPrincipal, input: PostTransactionInput, tx?: Prisma.TransactionClient) {
    this.assertBalanced(input.ledgerEntries);
    const client = tx ?? this.prisma;
    return client.financialTransaction.create({
      data: {
        organizationId: principal.organizationId,
        type: input.type,
        description: input.description ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        eventId: input.eventId ?? null,
        expenseId: input.expenseId ?? null,
        payrollPayoutId: input.payrollPayoutId ?? null,
        payrollAdjustmentId: input.payrollAdjustmentId ?? null,
        createdById: principal.userId,
        currency: input.currency ?? 'EGP',
        ...(input.metadata === undefined ? {} : { metadata: this.toJson(input.metadata) }),
        ledgerEntries: {
          create: input.ledgerEntries.map((entry) => ({
            accountCode: entry.accountCode,
            direction: entry.direction,
            amount: entry.amount,
            currency: input.currency ?? 'EGP',
            description: entry.description ?? null,
          })),
        },
      },
      include: { ledgerEntries: true },
    });
  }

  async ledger(principal: AuthenticatedPrincipal, query: LedgerQueryDto) {
    const where: Prisma.LedgerEntryWhereInput = {
      ...(query.accountCode ? { accountCode: query.accountCode } : {}),
      transaction: { organizationId: principal.organizationId, ...(query.eventId ? { eventId: query.eventId } : {}) },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({ where, include: { transaction: true }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.ledgerEntry.count({ where }),
    ]);
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async summary(principal: AuthenticatedPrincipal, query: FinancialSummaryDto) {
    const postedAt = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) };
    const transactions = await this.prisma.financialTransaction.findMany({
      where: { organizationId: principal.organizationId, ...(query.from || query.to ? { postedAt } : {}) },
      include: { ledgerEntries: true },
    });
    const debit = this.sum(transactions.flatMap((transaction) => transaction.ledgerEntries.filter((line) => line.direction === 'DEBIT').map((line) => line.amount)));
    const credit = this.sum(transactions.flatMap((transaction) => transaction.ledgerEntries.filter((line) => line.direction === 'CREDIT').map((line) => line.amount)));
    return { transactionCount: transactions.length, debit, credit };
  }

  async eventProfitability(principal: AuthenticatedPrincipal, eventId: string) {
    const event = await this.prisma.event.findFirstOrThrow({ where: { id: eventId, organizationId: principal.organizationId } });
    const expenses = await this.prisma.expense.aggregate({ where: { eventId, organizationId: principal.organizationId, status: { in: ['APPROVED', 'REIMBURSED'] } }, _sum: { amount: true } });
    const payouts = await this.prisma.payrollPayout.aggregate({ where: { organizationId: principal.organizationId, status: 'PAID' }, _sum: { amount: true } });
    const actualExpenses = Number(expenses._sum.amount ?? 0);
    const actualPayouts = Number(payouts._sum.amount ?? 0);
    const actualRevenue = Number(event.estimatedRevenue ?? 0);
    const snapshot = await this.prisma.eventFinancialSnapshot.create({
      data: {
        eventId,
        organizationId: principal.organizationId,
        estimatedBudget: event.estimatedBudget,
        estimatedRevenue: event.estimatedRevenue,
        actualExpenses,
        actualPayouts,
        actualRevenue,
        actualProfit: actualRevenue - actualExpenses - actualPayouts,
      },
    });
    await this.prisma.event.update({ where: { id: eventId }, data: { actualProfit: snapshot.actualProfit } });
    return snapshot;
  }

  async lock(principal: AuthenticatedPrincipal, dto: CreateFinancialLockDto, context: RequestContext) {
    if (dto.lockType === FinancialLockTypeDto.EVENT && !dto.eventId) throw new BadRequestException({ code: 'EVENT_LOCK_REQUIRES_EVENT', message: 'Event lock requires eventId.' });
    if (dto.lockType === FinancialLockTypeDto.PAYROLL_PERIOD && !dto.payrollPeriodId) throw new BadRequestException({ code: 'PERIOD_LOCK_REQUIRES_PERIOD', message: 'Payroll period lock requires payrollPeriodId.' });
    const lock = await this.prisma.financialLock.create({
      data: {
        organizationId: principal.organizationId,
        lockType: dto.lockType,
        eventId: dto.eventId ?? null,
        payrollPeriodId: dto.payrollPeriodId ?? null,
        reason: dto.reason ?? null,
        lockedById: principal.userId,
      },
    });
    await this.audit.record({ userId: principal.userId, action: 'finance.locked', entityType: dto.lockType, ...(dto.eventId ?? dto.payrollPeriodId ? { entityId: dto.eventId ?? dto.payrollPeriodId } : {}), newValues: dto, context });
    return lock;
  }

  private assertBalanced(lines: LedgerLine[]) {
    const debit = this.sum(lines.filter((line) => line.direction === 'DEBIT').map((line) => line.amount));
    const credit = this.sum(lines.filter((line) => line.direction === 'CREDIT').map((line) => line.amount));
    if (debit <= 0 || debit !== credit) throw new BadRequestException({ code: 'UNBALANCED_LEDGER_TRANSACTION', message: 'Ledger entries must balance debit and credit amounts.' });
  }

  private sum(values: LedgerAmount[]) {
    return values.reduce<number>((total, value) => total + Number(value), 0);
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
