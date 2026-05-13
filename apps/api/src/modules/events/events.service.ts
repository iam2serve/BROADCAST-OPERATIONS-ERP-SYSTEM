import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateEventDto, EventStatusDto, ListEventsDto, UpdateEventDto, UpdateEventStatusDto } from './dto/event.dto.js';
import { EventTimelineService } from './event-timeline.service.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: EventTimelineService,
  ) {}

  async list(principal: AuthenticatedPrincipal, query: ListEventsDto) {
    const where: Prisma.EventWhereInput = {
      organizationId: principal.organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            startsAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { clientName: { contains: query.search, mode: 'insensitive' } },
              { location: { contains: query.search, mode: 'insensitive' } },
              { eventTag: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { _count: { select: { operators: true, devices: true, sims: true, routers: true } } },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async get(principal: AuthenticatedPrincipal, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, organizationId: principal.organizationId, deletedAt: null },
      include: {
        operators: { include: { operator: { include: { user: { select: { fullName: true, email: true } } } } } },
        devices: { include: { device: true } },
        sims: { include: { sim: true } },
        routers: { include: { router: true } },
      },
    });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event was not found.' });
    return event;
  }

  async create(principal: AuthenticatedPrincipal, dto: CreateEventDto, context: RequestContext) {
    this.assertSchedule(dto.startsAt, dto.endsAt);
    const status = dto.status ?? EventStatusDto.DRAFT;
    const event = await this.prisma.event.create({
      data: {
        organizationId: principal.organizationId,
        branchId: principal.branchId ?? null,
        name: dto.name,
        clientName: dto.clientName,
        location: dto.location ?? null,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        status,
        isDraft: dto.isDraft ?? status === EventStatusDto.DRAFT,
        eventColor: dto.eventColor ?? null,
        eventTag: dto.eventTag ?? null,
        cooldownBeforeMinutes: dto.cooldownBeforeMinutes ?? 0,
        cooldownAfterMinutes: dto.cooldownAfterMinutes ?? 0,
        estimatedCrewSize: dto.estimatedCrewSize ?? null,
        notes: dto.notes ?? null,
      },
    });

    await this.timeline.record({ eventId: event.id, principal, action: 'event.created', message: 'Event created', entityType: 'Event', entityId: event.id, metadata: dto, context });
    await this.audit.record({ userId: principal.userId, action: 'events.created', entityType: 'Event', entityId: event.id, newValues: dto, context });
    return event;
  }

  async update(principal: AuthenticatedPrincipal, id: string, dto: UpdateEventDto, context: RequestContext) {
    const current = await this.get(principal, id);
    const startsAt = dto.startsAt ?? current.startsAt.toISOString();
    const endsAt = dto.endsAt ?? current.endsAt.toISOString();
    this.assertSchedule(startsAt, endsAt);

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.clientName ? { clientName: dto.clientName } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.startsAt ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt ? { endsAt: new Date(dto.endsAt) } : {}),
        ...(dto.status ? { status: dto.status, isDraft: dto.status === EventStatusDto.DRAFT } : {}),
        ...(dto.isDraft !== undefined ? { isDraft: dto.isDraft } : {}),
        ...(dto.eventColor !== undefined ? { eventColor: dto.eventColor } : {}),
        ...(dto.eventTag !== undefined ? { eventTag: dto.eventTag } : {}),
        ...(dto.cooldownBeforeMinutes !== undefined ? { cooldownBeforeMinutes: dto.cooldownBeforeMinutes } : {}),
        ...(dto.cooldownAfterMinutes !== undefined ? { cooldownAfterMinutes: dto.cooldownAfterMinutes } : {}),
        ...(dto.estimatedCrewSize !== undefined ? { estimatedCrewSize: dto.estimatedCrewSize } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    const scheduleChanged = dto.startsAt !== undefined || dto.endsAt !== undefined || dto.cooldownBeforeMinutes !== undefined || dto.cooldownAfterMinutes !== undefined;
    await this.timeline.record({ eventId: id, principal, action: scheduleChanged ? 'event.schedule_changed' : 'event.updated', message: scheduleChanged ? 'Event schedule changed' : 'Event updated', entityType: 'Event', entityId: id, metadata: dto, context });
    await this.audit.record({ userId: principal.userId, action: scheduleChanged ? 'events.schedule_updated' : 'events.updated', entityType: 'Event', entityId: id, oldValues: current, newValues: dto, context });
    return event;
  }

  async updateStatus(principal: AuthenticatedPrincipal, id: string, dto: UpdateEventStatusDto, context: RequestContext) {
    const current = await this.get(principal, id);
    const event = await this.prisma.event.update({
      where: { id },
      data: { status: dto.status, isDraft: dto.status === EventStatusDto.DRAFT, ...(dto.notes !== undefined ? { notes: dto.notes } : {}) },
    });
    await this.timeline.record({ eventId: id, principal, action: 'event.status_changed', message: `Event status changed to ${dto.status}`, entityType: 'Event', entityId: id, metadata: { from: current.status, to: dto.status, notes: dto.notes }, context });
    await this.audit.record({ userId: principal.userId, action: 'events.status_changed', entityType: 'Event', entityId: id, oldValues: { status: current.status }, newValues: dto, context });
    return event;
  }

  async remove(principal: AuthenticatedPrincipal, id: string, context: RequestContext) {
    await this.get(principal, id);
    const event = await this.prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.timeline.record({ eventId: id, principal, action: 'event.deleted', message: 'Event deleted', entityType: 'Event', entityId: id, context });
    await this.audit.record({ userId: principal.userId, action: 'events.deleted', entityType: 'Event', entityId: id, context });
    return event;
  }

  async timelineForEvent(principal: AuthenticatedPrincipal, id: string) {
    await this.get(principal, id);
    return this.timeline.list(id);
  }

  private assertSchedule(startsAtInput: string, endsAtInput: string) {
    const startsAt = new Date(startsAtInput);
    const endsAt = new Date(endsAtInput);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException({ code: 'INVALID_EVENT_SCHEDULE', message: 'Event end time must be after start time.' });
    }
  }
}
