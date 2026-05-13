import { Injectable } from '@nestjs/common';

import type { Prisma } from '@broadcast/database';

import { PrismaService } from '../../database/prisma.service.js';
import type { RequestContext } from '../../common/context/request-context.js';

type AuditInput = {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  context?: RequestContext;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
        ...(input.oldValues === undefined ? {} : { oldValues: this.toJsonValue(input.oldValues) }),
        ...(input.newValues === undefined ? {} : { newValues: this.toJsonValue(input.newValues) }),
        ...(input.context?.ipAddress ? { ipAddress: input.context.ipAddress } : {}),
        ...(input.context?.userAgent ? { userAgent: input.context.userAgent } : {}),
        ...(input.context?.requestId ? { requestId: input.context.requestId } : {}),
      },
    });
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
