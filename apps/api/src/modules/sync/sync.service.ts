import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PushMutationsDto, PullUpdatesDto, ResolveConflictDto, SyncResolutionDto } from './dto/sync.dto.js';

const neverMergePrefixes = ['Event', 'Assignment', 'Expense', 'Financial', 'Ledger', 'Payroll'];

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async push(principal: AuthenticatedPrincipal, dto: PushMutationsDto, context: RequestContext) {
    await this.prisma.syncClient.upsert({ where: { id: dto.clientId }, update: { userId: principal.userId, lastSeenAt: new Date() }, create: { id: dto.clientId, name: dto.clientId, userId: principal.userId, lastSeenAt: new Date() } });
    const results = [];
    for (const mutation of dto.mutations) {
      const conflict = await this.detectConflict(principal, dto.clientId, mutation.entityType, mutation.entityId, mutation.payload, mutation.baseVersion);
      if (conflict) {
        results.push({ clientMutationId: mutation.clientMutationId, status: 'CONFLICT', conflict });
        continue;
      }
      const operation = await this.prisma.syncOperation.create({
        data: {
          clientId: dto.clientId,
          organizationId: principal.organizationId,
          userId: principal.userId,
          entityType: mutation.entityType,
          entityId: mutation.entityId,
          operation: mutation.operation,
          payload: this.toJson(mutation.payload),
          clientMutationId: mutation.clientMutationId,
          baseVersion: mutation.baseVersion ? new Date(mutation.baseVersion) : null,
          status: 'QUEUED',
        },
      });
      results.push({ clientMutationId: mutation.clientMutationId, status: operation.status, operationId: operation.id });
    }
    await this.audit.record({ userId: principal.userId, action: 'sync.push', entityType: 'SyncOperation', newValues: { count: dto.mutations.length }, context });
    return { results };
  }

  async pull(principal: AuthenticatedPrincipal, query: PullUpdatesDto) {
    const since = query.since ? new Date(query.since) : new Date(0);
    const [events, devices, sims, routers, expenses] = await Promise.all([
      this.prisma.event.findMany({ where: { organizationId: principal.organizationId, updatedAt: { gt: since } }, take: 100 }),
      this.prisma.broadcastDevice.findMany({ where: { organizationId: principal.organizationId, updatedAt: { gt: since } }, take: 100 }),
      this.prisma.simCard.findMany({ where: { organizationId: principal.organizationId, updatedAt: { gt: since } }, take: 100 }),
      this.prisma.router.findMany({ where: { organizationId: principal.organizationId, updatedAt: { gt: since } }, take: 100 }),
      this.prisma.expense.findMany({ where: { organizationId: principal.organizationId, updatedAt: { gt: since } }, take: 100 }),
    ]);
    return { serverTime: new Date(), changes: { events, devices, sims, routers, expenses } };
  }

  async conflicts(principal: AuthenticatedPrincipal) {
    return this.prisma.syncConflict.findMany({ where: { organizationId: principal.organizationId, status: 'OPEN' }, orderBy: { createdAt: 'desc' } });
  }

  async resolve(principal: AuthenticatedPrincipal, id: string, dto: ResolveConflictDto, context: RequestContext) {
    const conflict = await this.prisma.syncConflict.findFirst({ where: { id, organizationId: principal.organizationId, status: 'OPEN' } });
    if (!conflict) throw new NotFoundException({ code: 'SYNC_CONFLICT_NOT_FOUND', message: 'Sync conflict was not found.' });
    if (dto.resolution === SyncResolutionDto.MERGE_SAFE_FIELDS && neverMergePrefixes.some((prefix) => conflict.entityType.startsWith(prefix))) {
      throw new BadRequestException({ code: 'SYNC_ENTITY_NOT_MERGEABLE', message: 'Assignment and financial conflicts require manual review or server/client retry.' });
    }
    const resolved = await this.prisma.syncConflict.update({ where: { id }, data: { status: 'RESOLVED', resolution: dto.resolution, resolvedById: principal.userId, resolvedAt: new Date(), notes: dto.mergedPayload ? JSON.stringify(dto.mergedPayload) : null } });
    await this.audit.record({ userId: principal.userId, action: 'sync.conflict_resolved', entityType: conflict.entityType, entityId: conflict.entityId, newValues: dto, context });
    return resolved;
  }

  private async detectConflict(principal: AuthenticatedPrincipal, clientId: string, entityType: string, entityId: string, clientVersion: unknown, baseVersion?: string) {
    if (!baseVersion) return null;
    const serverVersion = await this.findServerVersion(principal.organizationId, entityType, entityId);
    if (!serverVersion?.updatedAt || new Date(serverVersion.updatedAt) <= new Date(baseVersion)) return null;
    await this.audit.record({ userId: principal.userId, action: 'sync.conflict_detected', entityType, entityId, newValues: { baseVersion } });
    return this.prisma.syncConflict.create({
      data: {
        clientId,
        organizationId: principal.organizationId,
        entityType,
        entityId,
        serverVersion: this.toJson(serverVersion),
        clientVersion: this.toJson(clientVersion),
        baseVersion: new Date(baseVersion),
      },
    });
  }

  private findServerVersion(organizationId: string, entityType: string, entityId: string): Promise<{ updatedAt?: Date } | null> {
    if (entityType === 'Event') return this.prisma.event.findFirst({ where: { id: entityId, organizationId } });
    if (entityType === 'BroadcastDevice') return this.prisma.broadcastDevice.findFirst({ where: { id: entityId, organizationId } });
    if (entityType === 'SimCard') return this.prisma.simCard.findFirst({ where: { id: entityId, organizationId } });
    if (entityType === 'Router') return this.prisma.router.findFirst({ where: { id: entityId, organizationId } });
    if (entityType === 'Expense') return this.prisma.expense.findFirst({ where: { id: entityId, organizationId } });
    return Promise.resolve(null);
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
