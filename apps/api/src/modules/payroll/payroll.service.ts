import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { FinanceService } from '../finance/finance.service.js';
import { CreatePayrollAdjustmentDto, CreatePayrollPeriodDto, CreatePayoutDto, CreateSalaryProfileDto, ListPayrollDto, UpdateSalaryProfileDto } from './dto/payroll.dto.js';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly finance: FinanceService,
  ) {}

  async salaryProfiles(principal: AuthenticatedPrincipal, query: ListPayrollDto) {
    const where: Prisma.SalaryProfileWhereInput = { organizationId: principal.organizationId, deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.salaryProfile.findMany({ where, include: { operator: { include: { user: { select: { fullName: true } } } } }, orderBy: { effectiveFrom: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.salaryProfile.count({ where }),
    ]);
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async createSalaryProfile(principal: AuthenticatedPrincipal, dto: CreateSalaryProfileDto, context: RequestContext) {
    await this.ensureOperator(principal, dto.operatorId);
    const profile = await this.prisma.salaryProfile.create({
      data: {
        organizationId: principal.organizationId,
        branchId: principal.branchId ?? null,
        operatorId: dto.operatorId,
        salaryType: dto.salaryType,
        dailyRate: dto.dailyRate ?? null,
        eventRate: dto.eventRate ?? null,
        monthlyRate: dto.monthlyRate ?? null,
        overtimeRate: dto.overtimeRate ?? null,
        currency: dto.currency ?? 'EGP',
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        notes: dto.notes ?? null,
      },
    });
    await this.audit.record({ userId: principal.userId, action: 'payroll.salary_profile_created', entityType: 'SalaryProfile', entityId: profile.id, newValues: dto, context });
    return profile;
  }

  async updateSalaryProfile(principal: AuthenticatedPrincipal, id: string, dto: UpdateSalaryProfileDto, context: RequestContext) {
    const current = await this.prisma.salaryProfile.findFirst({ where: { id, organizationId: principal.organizationId, deletedAt: null } });
    if (!current) throw new NotFoundException({ code: 'SALARY_PROFILE_NOT_FOUND', message: 'Salary profile was not found.' });
    const profile = await this.prisma.salaryProfile.update({
      where: { id },
      data: {
        ...(dto.salaryType ? { salaryType: dto.salaryType } : {}),
        ...(dto.dailyRate !== undefined ? { dailyRate: dto.dailyRate } : {}),
        ...(dto.eventRate !== undefined ? { eventRate: dto.eventRate } : {}),
        ...(dto.monthlyRate !== undefined ? { monthlyRate: dto.monthlyRate } : {}),
        ...(dto.overtimeRate !== undefined ? { overtimeRate: dto.overtimeRate } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.effectiveFrom ? { effectiveFrom: new Date(dto.effectiveFrom) } : {}),
        ...(dto.effectiveTo ? { effectiveTo: new Date(dto.effectiveTo) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    await this.audit.record({ userId: principal.userId, action: 'payroll.salary_profile_updated', entityType: 'SalaryProfile', entityId: id, oldValues: current, newValues: dto, context });
    return profile;
  }

  async createPeriod(principal: AuthenticatedPrincipal, dto: CreatePayrollPeriodDto, context: RequestContext) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException({ code: 'INVALID_PAYROLL_PERIOD', message: 'Payroll period end must be after start.' });
    const period = await this.prisma.payrollPeriod.create({ data: { organizationId: principal.organizationId, branchId: principal.branchId ?? null, name: dto.name, startsAt, endsAt } });
    await this.audit.record({ userId: principal.userId, action: 'payroll.period_created', entityType: 'PayrollPeriod', entityId: period.id, newValues: dto, context });
    return period;
  }

  async createPayout(principal: AuthenticatedPrincipal, dto: CreatePayoutDto, context: RequestContext) {
    await this.finance.assertPayrollPeriodUnlocked(principal.organizationId, dto.payrollPeriodId);
    await this.ensureOperator(principal, dto.operatorId);
    const payout = await this.prisma.payrollPayout.create({
      data: { organizationId: principal.organizationId, branchId: principal.branchId ?? null, payrollPeriodId: dto.payrollPeriodId, operatorId: dto.operatorId, amount: dto.amount, currency: dto.currency ?? 'EGP', notes: dto.notes ?? null, createdById: principal.userId },
    });
    await this.audit.record({ userId: principal.userId, action: 'payroll.payout_created', entityType: 'PayrollPayout', entityId: payout.id, newValues: dto, context });
    return payout;
  }

  async payPayout(principal: AuthenticatedPrincipal, id: string, context: RequestContext) {
    const payout = await this.prisma.payrollPayout.findFirst({ where: { id, organizationId: principal.organizationId } });
    if (!payout) throw new NotFoundException({ code: 'PAYROLL_PAYOUT_NOT_FOUND', message: 'Payroll payout was not found.' });
    await this.finance.assertPayrollPeriodUnlocked(principal.organizationId, payout.payrollPeriodId);
    if (String(payout.status) === 'PAID') return payout;
    const updated = await this.prisma.$transaction(async (tx) => {
      const paid = await tx.payrollPayout.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } });
      await this.finance.postTransaction(principal, {
        type: 'PAYROLL_PAYOUT',
        description: `Payroll payout ${id}`,
        referenceType: 'PayrollPayout',
        referenceId: id,
        payrollPayoutId: id,
        currency: payout.currency,
        ledgerEntries: [
          { accountCode: '6100_PAYROLL_EXPENSE', direction: 'DEBIT', amount: payout.amount, description: 'Payroll payout expense' },
          { accountCode: '1000_CASH', direction: 'CREDIT', amount: payout.amount, description: 'Payroll cash paid' },
        ],
      }, tx);
      return paid;
    });
    await this.audit.record({ userId: principal.userId, action: 'payroll.payout_paid', entityType: 'PayrollPayout', entityId: id, context });
    return updated;
  }

  async createAdjustment(principal: AuthenticatedPrincipal, dto: CreatePayrollAdjustmentDto, context: RequestContext) {
    if (dto.payrollPeriodId) await this.finance.assertPayrollPeriodUnlocked(principal.organizationId, dto.payrollPeriodId);
    await this.ensureOperator(principal, dto.operatorId);
    const adjustment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payrollAdjustment.create({
        data: { organizationId: principal.organizationId, branchId: principal.branchId ?? null, payrollPeriodId: dto.payrollPeriodId ?? null, operatorId: dto.operatorId, type: dto.type, amount: dto.amount, currency: dto.currency ?? 'EGP', notes: dto.notes ?? null, createdById: principal.userId },
      });
      const isDebit = ['ADVANCE', 'OVERTIME', 'BONUS'].includes(String(dto.type));
      await this.finance.postTransaction(principal, {
        type: String(dto.type) === 'DEDUCTION' ? 'DEDUCTION' : 'ADVANCE',
        description: `Payroll ${dto.type.toLowerCase()}`,
        referenceType: 'PayrollAdjustment',
        referenceId: created.id,
        payrollAdjustmentId: created.id,
        currency: dto.currency ?? 'EGP',
        ledgerEntries: [
          { accountCode: isDebit ? '1200_EMPLOYEE_ADVANCES' : '2100_PAYROLL_PAYABLE', direction: 'DEBIT', amount: dto.amount },
          { accountCode: isDebit ? '1000_CASH' : '6100_PAYROLL_EXPENSE', direction: 'CREDIT', amount: dto.amount },
        ],
      }, tx);
      return created;
    });
    await this.audit.record({ userId: principal.userId, action: 'payroll.adjustment_created', entityType: 'PayrollAdjustment', entityId: adjustment.id, newValues: dto, context });
    return adjustment;
  }

  private async ensureOperator(principal: AuthenticatedPrincipal, operatorId: string) {
    const operator = await this.prisma.operatorProfile.findFirst({ where: { id: operatorId, organizationId: principal.organizationId, deletedAt: null } });
    if (!operator) throw new NotFoundException({ code: 'OPERATOR_NOT_FOUND', message: 'Operator was not found.' });
  }
}
