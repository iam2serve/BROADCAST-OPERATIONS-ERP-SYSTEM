import { BadRequestException, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import { PrismaService } from '../../database/prisma.service.js';
import { EventTimelineService } from '../events/event-timeline.service.js';
import { AssignmentResourceTypeDto } from '../assignments/dto/assignment.dto.js';
import { AvailabilitySearchDto, ConflictPreviewDto } from './dto/availability.dto.js';

const blockingAssignmentStatuses = ['RESERVED', 'ACTIVE'] as const;

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: EventTimelineService,
  ) {}

  async search(principal: AuthenticatedPrincipal, dto: AvailabilitySearchDto) {
    const range = await this.resolveRange(principal, dto.startsAt, dto.endsAt, dto.eventId);
    const candidates = await this.findCandidates(principal, dto.resourceType, dto.search);
    const results = await Promise.all(
      candidates.map(async (resource) => {
        const conflicts = await this.findConflicts(principal, dto.resourceType, resource.id, range.effectiveStartsAt, range.effectiveEndsAt, dto.eventId);
        return { resource, available: conflicts.length === 0, conflicts };
      }),
    );
    return { resourceType: dto.resourceType, range, items: results };
  }

  async preview(principal: AuthenticatedPrincipal, dto: ConflictPreviewDto) {
    const range = await this.resolveRange(principal, dto.startsAt, dto.endsAt, dto.eventId);
    const conflicts = await this.findConflicts(principal, dto.resourceType, dto.resourceId, range.effectiveStartsAt, range.effectiveEndsAt, dto.eventId);
    if (conflicts.length > 0 && dto.eventId) {
      await this.timeline.record({
        eventId: dto.eventId,
        principal,
        action: 'assignment.conflict_previewed',
        message: 'Assignment conflict previewed',
        entityType: dto.resourceType,
        entityId: dto.resourceId,
        metadata: { conflicts },
      });
    }
    return { resourceType: dto.resourceType, resourceId: dto.resourceId, range, available: conflicts.length === 0, conflicts };
  }

  async ensureAvailable(
    principal: AuthenticatedPrincipal,
    resourceType: AssignmentResourceTypeDto,
    resourceId: string,
    startsAt: Date,
    endsAt: Date,
    eventId?: string,
  ) {
    const conflicts = await this.findConflicts(principal, resourceType, resourceId, startsAt, endsAt, eventId);
    if (conflicts.length > 0) {
      if (eventId) {
        await this.timeline.record({
          eventId,
          principal,
          action: 'assignment.conflict_blocked',
          message: 'Assignment blocked by availability conflict',
          entityType: resourceType,
          entityId: resourceId,
          metadata: { conflicts },
        });
      }
      throw new BadRequestException({ code: 'RESOURCE_NOT_AVAILABLE', message: 'Resource is not available for the requested schedule.', details: conflicts });
    }
  }

  async resolveRange(principal: AuthenticatedPrincipal, startsAtInput: string, endsAtInput: string, eventId?: string) {
    const startsAt = new Date(startsAtInput);
    const endsAt = new Date(endsAtInput);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException({ code: 'INVALID_ASSIGNMENT_RANGE', message: 'Assignment end time must be after start time.' });
    }

    if (!eventId) return { startsAt, endsAt, effectiveStartsAt: startsAt, effectiveEndsAt: endsAt };

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId: principal.organizationId, deletedAt: null },
      select: { cooldownBeforeMinutes: true, cooldownAfterMinutes: true },
    });
    if (!event) return { startsAt, endsAt, effectiveStartsAt: startsAt, effectiveEndsAt: endsAt };

    return {
      startsAt,
      endsAt,
      effectiveStartsAt: this.addMinutes(startsAt, -event.cooldownBeforeMinutes),
      effectiveEndsAt: this.addMinutes(endsAt, event.cooldownAfterMinutes),
    };
  }

  private async findConflicts(
    principal: AuthenticatedPrincipal,
    resourceType: AssignmentResourceTypeDto,
    resourceId: string,
    effectiveStartsAt: Date,
    effectiveEndsAt: Date,
    eventId?: string,
  ) {
    const [assignments, maintenance] = await Promise.all([
      this.findAssignmentConflicts(principal, resourceType, resourceId, effectiveStartsAt, effectiveEndsAt, eventId),
      this.prisma.assetMaintenanceWindow.findMany({
        where: {
          organizationId: principal.organizationId,
          assetType: resourceType === AssignmentResourceTypeDto.OPERATOR ? 'OPERATOR' : resourceType,
          assetId: resourceId,
          startsAt: { lt: effectiveEndsAt },
          endsAt: { gt: effectiveStartsAt },
        },
        select: { id: true, startsAt: true, endsAt: true, reason: true },
      }),
    ]);
    return [
      ...assignments.map((assignment) => ({ type: 'ASSIGNMENT', ...assignment })),
      ...maintenance.map((window) => ({ type: 'MAINTENANCE', ...window })),
    ];
  }

  private async findAssignmentConflicts(
    principal: AuthenticatedPrincipal,
    resourceType: AssignmentResourceTypeDto,
    resourceId: string,
    effectiveStartsAt: Date,
    effectiveEndsAt: Date,
    eventId?: string,
  ) {
    const where = {
      organizationId: principal.organizationId,
      status: { in: [...blockingAssignmentStatuses] },
      effectiveStartsAt: { lt: effectiveEndsAt },
      effectiveEndsAt: { gt: effectiveStartsAt },
      ...(eventId ? { eventId: { not: eventId } } : {}),
    };
    const select = { id: true, eventId: true, startsAt: true, endsAt: true, status: true };

    if (resourceType === AssignmentResourceTypeDto.OPERATOR) {
      return this.prisma.eventOperatorAssignment.findMany({ where: { ...where, operatorId: resourceId }, select });
    }
    if (resourceType === AssignmentResourceTypeDto.DEVICE) {
      return this.prisma.eventDeviceAssignment.findMany({ where: { ...where, deviceId: resourceId }, select });
    }
    if (resourceType === AssignmentResourceTypeDto.SIM) {
      return this.prisma.eventSimAssignment.findMany({ where: { ...where, simId: resourceId }, select });
    }
    return this.prisma.eventRouterAssignment.findMany({ where: { ...where, routerId: resourceId }, select });
  }

  private async findCandidates(principal: AuthenticatedPrincipal, resourceType: AssignmentResourceTypeDto, search?: string) {
    const branchWhere = principal.branchId ? { OR: [{ branchId: principal.branchId }, { branchId: null }] } : {};
    if (resourceType === AssignmentResourceTypeDto.OPERATOR) {
      return this.prisma.operatorProfile.findMany({
        where: { organizationId: principal.organizationId, deletedAt: null, status: 'ACTIVE', ...branchWhere, ...(search ? { user: { fullName: { contains: search, mode: 'insensitive' } } } : {}) },
        select: { id: true, role: true, user: { select: { fullName: true, email: true } } },
        take: 100,
      });
    }
    if (resourceType === AssignmentResourceTypeDto.DEVICE) {
      return this.prisma.broadcastDevice.findMany({
        where: { organizationId: principal.organizationId, deletedAt: null, status: 'AVAILABLE', maintenanceStatus: 'OK', ...branchWhere, ...(search ? { OR: [{ alias: { contains: search, mode: 'insensitive' } }, { serialNumber: { contains: search, mode: 'insensitive' } }] } : {}) },
        select: { id: true, alias: true, serialNumber: true, deviceType: true, assetTag: true },
        take: 100,
      });
    }
    if (resourceType === AssignmentResourceTypeDto.SIM) {
      return this.prisma.simCard.findMany({
        where: { organizationId: principal.organizationId, deletedAt: null, status: 'AVAILABLE', ...branchWhere, ...(search ? { OR: [{ phoneNumber: { contains: search, mode: 'insensitive' } }, { iccid: { contains: search, mode: 'insensitive' } }] } : {}) },
        select: { id: true, phoneNumber: true, carrier: true, packageType: true, assetTag: true },
        take: 100,
      });
    }
    return this.prisma.router.findMany({
      where: { organizationId: principal.organizationId, deletedAt: null, status: 'AVAILABLE', maintenanceStatus: 'OK', ...branchWhere, ...(search ? { OR: [{ brand: { contains: search, mode: 'insensitive' } }, { model: { contains: search, mode: 'insensitive' } }, { imei: { contains: search, mode: 'insensitive' } }] } : {}) },
      select: { id: true, brand: true, model: true, imei: true, assetTag: true },
      take: 100,
    });
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60_000);
  }

  toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
