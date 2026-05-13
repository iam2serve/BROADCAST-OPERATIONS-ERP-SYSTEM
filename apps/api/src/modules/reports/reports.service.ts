import { Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { WorkerQueueService } from '../workers/worker-queue.service.js';
import { GenerateReportDto, ListReportsDto, ReportTypeDto } from './dto/report.dto.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: WorkerQueueService,
  ) {}

  async list(principal: AuthenticatedPrincipal, query: ListReportsDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.reportRun.findMany({ where: { organizationId: principal.organizationId }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.reportRun.count({ where: { organizationId: principal.organizationId } }),
    ]);
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async generate(principal: AuthenticatedPrincipal, dto: GenerateReportDto, context: RequestContext) {
    const result = await this.buildReport(principal, dto);
    const run = await this.prisma.reportRun.create({
      data: {
        organizationId: principal.organizationId,
        branchId: principal.branchId ?? null,
        reportType: dto.reportType,
        exportFormat: dto.exportFormat ?? 'JSON',
        filters: this.toJson(dto),
        status: 'COMPLETED',
        result: this.toJson(result),
        requestedById: principal.userId,
        completedAt: new Date(),
      },
    });
    if (dto.exportFormat && String(dto.exportFormat) !== 'JSON') {
      await this.queue.enqueue(principal, 'report.export', 'reports', { reportRunId: run.id, format: dto.exportFormat });
    }
    await this.audit.record({ userId: principal.userId, action: 'reports.generated', entityType: 'ReportRun', entityId: run.id, newValues: dto, context });
    return run;
  }

  private async buildReport(principal: AuthenticatedPrincipal, dto: GenerateReportDto) {
    if (dto.reportType === ReportTypeDto.EXPENSE_BREAKDOWN) {
      return this.prisma.expense.groupBy({ by: ['category', 'status'], where: { organizationId: principal.organizationId, ...(dto.eventId ? { eventId: dto.eventId } : {}) }, _sum: { amount: true }, _count: true });
    }
    if (dto.reportType === ReportTypeDto.PAYROLL_SUMMARY) {
      return this.prisma.payrollPayout.groupBy({ by: ['status'], where: { organizationId: principal.organizationId }, _sum: { amount: true }, _count: true });
    }
    if (dto.reportType === ReportTypeDto.ASSIGNMENT_HISTORY) {
      return {
        operators: await this.prisma.eventOperatorAssignment.count({ where: { organizationId: principal.organizationId } }),
        devices: await this.prisma.eventDeviceAssignment.count({ where: { organizationId: principal.organizationId } }),
        sims: await this.prisma.eventSimAssignment.count({ where: { organizationId: principal.organizationId } }),
        routers: await this.prisma.eventRouterAssignment.count({ where: { organizationId: principal.organizationId } }),
      };
    }
    if (dto.reportType === ReportTypeDto.SIM_UTILIZATION) {
      return this.prisma.eventSimAssignment.groupBy({ by: ['status'], where: { organizationId: principal.organizationId }, _count: true });
    }
    if (dto.reportType === ReportTypeDto.DEVICE_UTILIZATION) {
      return this.prisma.eventDeviceAssignment.groupBy({ by: ['status'], where: { organizationId: principal.organizationId }, _count: true });
    }
    if (dto.reportType === ReportTypeDto.OPERATOR_PAYOUTS) {
      return this.prisma.payrollPayout.groupBy({ by: ['operatorId', 'status'], where: { organizationId: principal.organizationId }, _sum: { amount: true }, _count: true });
    }
    return this.prisma.eventFinancialSnapshot.findMany({ where: { organizationId: principal.organizationId, ...(dto.eventId ? { eventId: dto.eventId } : {}) }, orderBy: { calculatedAt: 'desc' }, take: 50 });
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
