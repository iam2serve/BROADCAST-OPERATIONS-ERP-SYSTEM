import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { EventTimelineService } from '../events/event-timeline.service.js';
import { FinanceService } from '../finance/finance.service.js';
import { CreateExpenseDto, ListExpensesDto, ReimburseExpenseDto, ReviewExpenseDto, UpdateExpenseDto } from './dto/expense.dto.js';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly finance: FinanceService,
    private readonly timeline: EventTimelineService,
  ) {}

  async list(principal: AuthenticatedPrincipal, query: ListExpensesDto) {
    const where: Prisma.ExpenseWhereInput = { organizationId: principal.organizationId, deletedAt: null, ...(query.status ? { status: query.status } : {}), ...(query.eventId ? { eventId: query.eventId } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({ where, include: { event: true, operator: { include: { user: { select: { fullName: true } } } }, receipts: true }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.expense.count({ where }),
    ]);
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async get(principal: AuthenticatedPrincipal, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, organizationId: principal.organizationId, deletedAt: null }, include: { receipts: true, transaction: { include: { ledgerEntries: true } } } });
    if (!expense) throw new NotFoundException({ code: 'EXPENSE_NOT_FOUND', message: 'Expense was not found.' });
    return expense;
  }

  async create(principal: AuthenticatedPrincipal, dto: CreateExpenseDto, context: RequestContext) {
    await this.finance.assertEventUnlocked(principal.organizationId, dto.eventId);
    await this.ensureEventAndOperator(principal, dto.eventId, dto.operatorId);
    const expense = await this.prisma.expense.create({
      data: {
        organizationId: principal.organizationId,
        branchId: principal.branchId ?? null,
        eventId: dto.eventId,
        operatorId: dto.operatorId,
        amount: dto.amount,
        currency: dto.currency ?? 'EGP',
        category: dto.category,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes ?? null,
        createdById: principal.userId,
        ...(dto.attachmentIds?.length ? { receipts: { connect: dto.attachmentIds.map((id) => ({ id })) } } : {}),
      },
    });
    await this.audit.record({ userId: principal.userId, action: 'expenses.created', entityType: 'Expense', entityId: expense.id, newValues: dto, context });
    return expense;
  }

  async update(principal: AuthenticatedPrincipal, id: string, dto: UpdateExpenseDto, context: RequestContext) {
    const current = await this.get(principal, id);
    if (current.status !== 'DRAFT') throw new BadRequestException({ code: 'EXPENSE_NOT_EDITABLE', message: 'Only draft expenses can be edited.' });
    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.paymentMethod ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    await this.audit.record({ userId: principal.userId, action: 'expenses.updated', entityType: 'Expense', entityId: id, oldValues: current, newValues: dto, context });
    return expense;
  }

  async submit(principal: AuthenticatedPrincipal, id: string, context: RequestContext) {
    const current = await this.get(principal, id);
    if (current.status !== 'DRAFT') throw new BadRequestException({ code: 'EXPENSE_NOT_SUBMITTABLE', message: 'Only draft expenses can be submitted.' });
    const expense = await this.prisma.expense.update({ where: { id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
    await this.timeline.record({ eventId: expense.eventId, principal, action: 'expense.submitted', message: 'Expense submitted', entityType: 'Expense', entityId: id, context });
    await this.audit.record({ userId: principal.userId, action: 'expenses.submitted', entityType: 'Expense', entityId: id, context });
    return expense;
  }

  async review(principal: AuthenticatedPrincipal, id: string, dto: ReviewExpenseDto, context: RequestContext) {
    return this.changeReviewState(principal, id, 'UNDER_REVIEW', 'expenses.reviewed', dto, context);
  }

  async approve(principal: AuthenticatedPrincipal, id: string, dto: ReviewExpenseDto, context: RequestContext) {
    const current = await this.get(principal, id);
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(current.status)) throw new BadRequestException({ code: 'EXPENSE_NOT_APPROVABLE', message: 'Expense must be submitted or under review.' });
    const expense = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({ where: { id }, data: { status: 'APPROVED', approvedById: principal.userId, reviewedById: principal.userId, reviewedAt: new Date(), approvalMetadata: this.toJson({ notes: dto.notes }) } });
      await this.finance.postTransaction(principal, {
        type: 'EXPENSE',
        description: `Approved expense ${id}`,
        referenceType: 'Expense',
        referenceId: id,
        eventId: current.eventId,
        expenseId: id,
        currency: current.currency,
        ledgerEntries: [
          { accountCode: '6000_EVENT_EXPENSES', direction: 'DEBIT', amount: current.amount, description: 'Approved event expense' },
          { accountCode: '2100_REIMBURSEMENTS_PAYABLE', direction: 'CREDIT', amount: current.amount, description: 'Operator reimbursement payable' },
        ],
      }, tx);
      return updated;
    });
    await this.timeline.record({ eventId: expense.eventId, principal, action: 'expense.approved', message: 'Expense approved', entityType: 'Expense', entityId: id, metadata: dto, context });
    await this.audit.record({ userId: principal.userId, action: 'expenses.approved', entityType: 'Expense', entityId: id, newValues: dto, context });
    return expense;
  }

  async reject(principal: AuthenticatedPrincipal, id: string, dto: ReviewExpenseDto, context: RequestContext) {
    return this.changeReviewState(principal, id, 'REJECTED', 'expenses.rejected', dto, context);
  }

  async reimburse(principal: AuthenticatedPrincipal, id: string, dto: ReimburseExpenseDto, context: RequestContext) {
    const current = await this.get(principal, id);
    if (current.status !== 'APPROVED') throw new BadRequestException({ code: 'EXPENSE_NOT_REIMBURSABLE', message: 'Only approved expenses can be reimbursed.' });
    await this.finance.assertEventUnlocked(principal.organizationId, current.eventId);
    const expense = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({ where: { id }, data: { status: 'REIMBURSED', reimbursedById: principal.userId, reimbursedAt: new Date(), reimbursementMetadata: this.toJson(dto) } });
      await this.finance.postTransaction(principal, {
        type: 'REIMBURSEMENT',
        description: `Reimbursed expense ${id}`,
        referenceType: 'Expense',
        referenceId: id,
        eventId: current.eventId,
        currency: current.currency,
        ledgerEntries: [
          { accountCode: '2100_REIMBURSEMENTS_PAYABLE', direction: 'DEBIT', amount: current.amount, description: 'Clear reimbursement payable' },
          { accountCode: '1000_CASH', direction: 'CREDIT', amount: current.amount, description: 'Cash reimbursement paid' },
        ],
      }, tx);
      return updated;
    });
    await this.timeline.record({ eventId: expense.eventId, principal, action: 'expense.reimbursed', message: 'Expense reimbursed', entityType: 'Expense', entityId: id, metadata: dto, context });
    await this.audit.record({ userId: principal.userId, action: 'expenses.reimbursed', entityType: 'Expense', entityId: id, newValues: dto, context });
    return expense;
  }

  private async changeReviewState(principal: AuthenticatedPrincipal, id: string, status: 'UNDER_REVIEW' | 'REJECTED', action: string, dto: ReviewExpenseDto, context: RequestContext) {
    const current = await this.get(principal, id);
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(current.status)) throw new BadRequestException({ code: 'INVALID_EXPENSE_STATE', message: 'Expense is not in a reviewable state.' });
    const expense = await this.prisma.expense.update({ where: { id }, data: { status, reviewedById: principal.userId, reviewedAt: new Date(), approvalMetadata: this.toJson({ notes: dto.notes }) } });
    await this.timeline.record({ eventId: expense.eventId, principal, action, message: status === 'REJECTED' ? 'Expense rejected' : 'Expense under review', entityType: 'Expense', entityId: id, metadata: dto, context });
    await this.audit.record({ userId: principal.userId, action, entityType: 'Expense', entityId: id, newValues: dto, context });
    return expense;
  }

  private async ensureEventAndOperator(principal: AuthenticatedPrincipal, eventId: string, operatorId: string) {
    const [event, operator] = await Promise.all([
      this.prisma.event.findFirst({ where: { id: eventId, organizationId: principal.organizationId, deletedAt: null } }),
      this.prisma.operatorProfile.findFirst({ where: { id: operatorId, organizationId: principal.organizationId, deletedAt: null } }),
    ]);
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event was not found.' });
    if (!operator) throw new NotFoundException({ code: 'OPERATOR_NOT_FOUND', message: 'Operator was not found.' });
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
