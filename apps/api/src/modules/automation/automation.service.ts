import { Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { WorkerQueueService } from '../workers/worker-queue.service.js';
import { CreateAutomationRuleDto, ExecuteAutomationDto, ListAutomationRulesDto } from './dto/automation.dto.js';

@Injectable()
export class AutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: WorkerQueueService,
  ) {}

  async list(principal: AuthenticatedPrincipal, query: ListAutomationRulesDto) {
    const where = { organizationId: principal.organizationId, deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.automationRule.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.automationRule.count({ where }),
    ]);
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async create(principal: AuthenticatedPrincipal, dto: CreateAutomationRuleDto, context: RequestContext) {
    const rule = await this.prisma.automationRule.create({
      data: {
        organizationId: principal.organizationId,
        branchId: principal.branchId ?? null,
        name: dto.name,
        triggerType: dto.triggerType,
        scheduleCron: dto.scheduleCron ?? null,
        nextRunAt: dto.nextRunAt ? new Date(dto.nextRunAt) : null,
        actions: this.toJson([{ type: 'CREATE_NOTIFICATION' }]),
        createdById: principal.userId,
      },
    });
    await this.audit.record({ userId: principal.userId, action: 'automation.rule_created', entityType: 'AutomationRule', entityId: rule.id, newValues: dto, context });
    return rule;
  }

  async execute(principal: AuthenticatedPrincipal, id: string, dto: ExecuteAutomationDto, context: RequestContext) {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, organizationId: principal.organizationId, deletedAt: null } });
    if (!rule) throw new NotFoundException({ code: 'AUTOMATION_RULE_NOT_FOUND', message: 'Automation rule was not found.' });
    const job = await this.queue.enqueue(principal, 'automation.execute', 'automation', { ruleId: id, entityId: dto.entityId, triggerType: rule.triggerType });
    await this.prisma.automationRule.update({ where: { id }, data: { lastRunAt: new Date() } });
    await this.audit.record({ userId: principal.userId, action: 'automation.executed', entityType: 'AutomationRule', entityId: id, newValues: dto, context });
    return job;
  }

  async executeScheduled(principal: AuthenticatedPrincipal) {
    const rules = await this.prisma.automationRule.findMany({ where: { organizationId: principal.organizationId, status: 'ACTIVE', nextRunAt: { lte: new Date() }, deletedAt: null } });
    const jobs = await Promise.all(rules.map((rule) => this.queue.enqueue(principal, 'automation.execute', 'automation', { ruleId: rule.id, triggerType: rule.triggerType })));
    return { count: jobs.length, jobs };
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
