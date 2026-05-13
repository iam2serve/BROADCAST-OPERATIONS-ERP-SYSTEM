import { Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';

type TimelineInput = {
  eventId: string;
  principal?: AuthenticatedPrincipal;
  action: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: unknown;
  context?: RequestContext;
  tx?: Prisma.TransactionClient;
};

@Injectable()
export class EventTimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: TimelineInput) {
    const client = input.tx ?? this.prisma;
    return client.eventActivityLog.create({
      data: {
        eventId: input.eventId,
        actorUserId: input.principal?.userId ?? null,
        action: input.action,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        ...(input.metadata === undefined ? {} : { metadata: this.toJsonValue(input.metadata) }),
        requestId: input.context?.requestId ?? null,
      },
    });
  }

  async list(eventId: string) {
    return this.prisma.eventActivityLog.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { actorUser: { select: { id: true, fullName: true, email: true } } },
    });
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
