import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { EventTimelineService } from '../events/event-timeline.service.js';
import { AssignResourceDto, AssignmentResourceTypeDto, AssignmentStatusDto, BulkAssignmentDto, ReassignResourceDto, ReleaseAssignmentDto } from './dto/assignment.dto.js';

type EventAssignmentWindow = {
  eventId: string;
  organizationId: string;
  branchId: string | null;
  startsAt: Date;
  endsAt: Date;
  effectiveStartsAt: Date;
  effectiveEndsAt: Date;
};

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly availability: AvailabilityService,
    private readonly timeline: EventTimelineService,
  ) {}

  assignOperator(principal: AuthenticatedPrincipal, eventId: string, dto: AssignResourceDto, context: RequestContext) {
    return this.assign(principal, eventId, AssignmentResourceTypeDto.OPERATOR, dto, context);
  }

  assignDevice(principal: AuthenticatedPrincipal, eventId: string, dto: AssignResourceDto, context: RequestContext) {
    return this.assign(principal, eventId, AssignmentResourceTypeDto.DEVICE, dto, context);
  }

  assignSim(principal: AuthenticatedPrincipal, eventId: string, dto: AssignResourceDto, context: RequestContext) {
    return this.assign(principal, eventId, AssignmentResourceTypeDto.SIM, dto, context);
  }

  assignRouter(principal: AuthenticatedPrincipal, eventId: string, dto: AssignResourceDto, context: RequestContext) {
    return this.assign(principal, eventId, AssignmentResourceTypeDto.ROUTER, dto, context);
  }

  async bulkAssign(principal: AuthenticatedPrincipal, eventId: string, dto: BulkAssignmentDto, context: RequestContext) {
    const results = [];
    for (const item of dto.assignments) {
      results.push(await this.assign(principal, eventId, item.resourceType, item, context));
    }
    await this.timeline.record({ eventId, principal, action: 'assignment.bulk_created', message: 'Bulk assignments created', entityType: 'Event', entityId: eventId, metadata: { count: results.length }, context });
    return { items: results };
  }

  async release(principal: AuthenticatedPrincipal, resourceType: AssignmentResourceTypeDto, assignmentId: string, dto: ReleaseAssignmentDto, context: RequestContext) {
    const status = dto.status ?? AssignmentStatusDto.RELEASED;
    if (![AssignmentStatusDto.RELEASED, AssignmentStatusDto.CANCELLED, AssignmentStatusDto.COMPLETED].includes(status)) {
      throw new BadRequestException({ code: 'INVALID_RELEASE_STATUS', message: 'Release status must be RELEASED, CANCELLED, or COMPLETED.' });
    }
    const assignment = await this.findAssignment(principal, resourceType, assignmentId);
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await this.updateAssignmentStatus(tx, resourceType, assignmentId, status, principal.userId, dto.notes);
      await this.updateResourceStatusAfterRelease(tx, resourceType, this.assignmentResourceId(resourceType, assignment));
      await this.timeline.record({ tx, eventId: assignment.eventId, principal, action: 'assignment.released', message: `${resourceType} assignment ${status.toLowerCase()}`, entityType: resourceType, entityId: this.assignmentResourceId(resourceType, assignment), metadata: { assignmentId, status, notes: dto.notes }, context });
      return updated;
    });
    await this.audit.record({ userId: principal.userId, action: 'assignments.released', entityType: resourceType, entityId: assignmentId, newValues: dto, context });
    return result;
  }

  async reassign(principal: AuthenticatedPrincipal, resourceType: AssignmentResourceTypeDto, assignmentId: string, dto: ReassignResourceDto, context: RequestContext) {
    const oldAssignment = await this.findAssignment(principal, resourceType, assignmentId);
    const replacement: AssignResourceDto = {
      resourceId: dto.newResourceId,
      startsAt: dto.startsAt ?? oldAssignment.startsAt.toISOString(),
      endsAt: dto.endsAt ?? oldAssignment.endsAt.toISOString(),
      status: oldAssignment.status === 'ACTIVE' ? AssignmentStatusDto.ACTIVE : AssignmentStatusDto.RESERVED,
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    };
    const result = await this.prisma.$transaction(async (tx) => {
      await this.updateAssignmentStatus(tx, resourceType, assignmentId, AssignmentStatusDto.RELEASED, principal.userId, dto.notes);
      return this.createAssignment(principal, oldAssignment.eventId, resourceType, replacement, context, tx);
    });
    await this.timeline.record({ eventId: oldAssignment.eventId, principal, action: 'assignment.reassigned', message: `${resourceType} assignment reassigned`, entityType: resourceType, entityId: dto.newResourceId, metadata: { oldAssignmentId: assignmentId, oldResourceId: this.assignmentResourceId(resourceType, oldAssignment), newResourceId: dto.newResourceId }, context });
    await this.audit.record({ userId: principal.userId, action: 'assignments.reassigned', entityType: resourceType, entityId: assignmentId, newValues: dto, context });
    return result;
  }

  private async assign(principal: AuthenticatedPrincipal, eventId: string, resourceType: AssignmentResourceTypeDto, dto: AssignResourceDto, context: RequestContext) {
    const event = await this.resolveAssignmentWindow(principal, eventId, dto);
    await this.ensureResourceAssignable(principal, resourceType, dto.resourceId);
    await this.availability.ensureAvailable(principal, resourceType, dto.resourceId, event.effectiveStartsAt, event.effectiveEndsAt, eventId);
    try {
      const assignment = await this.prisma.$transaction((tx) => this.createAssignment(principal, eventId, resourceType, dto, context, tx, event));
      await this.audit.record({ userId: principal.userId, action: 'assignments.created', entityType: resourceType, entityId: dto.resourceId, newValues: { eventId, resourceType, ...dto }, context });
      return assignment;
    } catch (error) {
      await this.timeline.record({ eventId, principal, action: 'assignment.conflict_error', message: 'Assignment failed because of a database conflict', entityType: resourceType, entityId: dto.resourceId, metadata: { error: error instanceof Error ? error.message : String(error) }, context });
      throw new ConflictException({ code: 'ASSIGNMENT_CONFLICT', message: 'Resource assignment conflicts with another active reservation.' });
    }
  }

  private async createAssignment(
    principal: AuthenticatedPrincipal,
    eventId: string,
    resourceType: AssignmentResourceTypeDto,
    dto: AssignResourceDto,
    context: RequestContext,
    tx: Prisma.TransactionClient,
    resolvedWindow?: EventAssignmentWindow,
  ) {
    const event = resolvedWindow ?? (await this.resolveAssignmentWindow(principal, eventId, dto));
    await this.ensureResourceAssignable(principal, resourceType, dto.resourceId);
    await this.availability.ensureAvailable(principal, resourceType, dto.resourceId, event.effectiveStartsAt, event.effectiveEndsAt, eventId);
    const base = {
      organizationId: event.organizationId,
      branchId: event.branchId,
      eventId,
      status: dto.status ?? AssignmentStatusDto.RESERVED,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      effectiveStartsAt: event.effectiveStartsAt,
      effectiveEndsAt: event.effectiveEndsAt,
      assignedById: principal.userId,
      notes: dto.notes ?? null,
    };
    const assignment =
      resourceType === AssignmentResourceTypeDto.OPERATOR
        ? await tx.eventOperatorAssignment.create({ data: { ...base, operatorId: dto.resourceId } })
        : resourceType === AssignmentResourceTypeDto.DEVICE
          ? await tx.eventDeviceAssignment.create({ data: { ...base, deviceId: dto.resourceId } })
          : resourceType === AssignmentResourceTypeDto.SIM
            ? await tx.eventSimAssignment.create({ data: { ...base, simId: dto.resourceId } })
            : await tx.eventRouterAssignment.create({ data: { ...base, routerId: dto.resourceId } });

    await this.updateResourceStatusAfterAssign(tx, resourceType, dto.resourceId);
    await this.timeline.record({ tx, eventId, principal, action: 'assignment.created', message: `${resourceType} assigned`, entityType: resourceType, entityId: dto.resourceId, metadata: { assignmentId: assignment.id, status: assignment.status }, context });
    return assignment;
  }

  private async resolveAssignmentWindow(principal: AuthenticatedPrincipal, eventId: string, dto: AssignResourceDto): Promise<EventAssignmentWindow> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId: principal.organizationId, deletedAt: null },
      select: { id: true, organizationId: true, branchId: true, startsAt: true, endsAt: true, cooldownBeforeMinutes: true, cooldownAfterMinutes: true },
    });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event was not found.' });
    const startsAt = new Date(dto.startsAt ?? event.startsAt);
    const endsAt = new Date(dto.endsAt ?? event.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException({ code: 'INVALID_ASSIGNMENT_RANGE', message: 'Assignment end time must be after start time.' });
    return {
      eventId,
      organizationId: event.organizationId,
      branchId: event.branchId,
      startsAt,
      endsAt,
      effectiveStartsAt: new Date(startsAt.getTime() - event.cooldownBeforeMinutes * 60_000),
      effectiveEndsAt: new Date(endsAt.getTime() + event.cooldownAfterMinutes * 60_000),
    };
  }

  private async ensureResourceAssignable(principal: AuthenticatedPrincipal, resourceType: AssignmentResourceTypeDto, resourceId: string) {
    const branchWhere = principal.branchId ? { OR: [{ branchId: principal.branchId }, { branchId: null }] } : {};
    const unavailable = { code: 'RESOURCE_UNAVAILABLE', message: 'Resource is not available for assignment.' };
    if (resourceType === AssignmentResourceTypeDto.OPERATOR) {
      const operator = await this.prisma.operatorProfile.findFirst({ where: { id: resourceId, organizationId: principal.organizationId, deletedAt: null, ...branchWhere }, select: { status: true } });
      if (!operator) throw new NotFoundException({ code: 'OPERATOR_NOT_FOUND', message: 'Operator was not found.' });
      if (operator.status !== 'ACTIVE') throw new BadRequestException(unavailable);
      return;
    }
    if (resourceType === AssignmentResourceTypeDto.DEVICE) {
      const device = await this.prisma.broadcastDevice.findFirst({ where: { id: resourceId, organizationId: principal.organizationId, deletedAt: null, ...branchWhere }, select: { status: true, maintenanceStatus: true } });
      if (!device) throw new NotFoundException({ code: 'DEVICE_NOT_FOUND', message: 'Device was not found.' });
      if (device.status !== 'AVAILABLE' || device.maintenanceStatus !== 'OK') throw new BadRequestException(unavailable);
      return;
    }
    if (resourceType === AssignmentResourceTypeDto.SIM) {
      const sim = await this.prisma.simCard.findFirst({ where: { id: resourceId, organizationId: principal.organizationId, deletedAt: null, ...branchWhere }, select: { status: true } });
      if (!sim) throw new NotFoundException({ code: 'SIM_NOT_FOUND', message: 'SIM card was not found.' });
      if (sim.status !== 'AVAILABLE') throw new BadRequestException(unavailable);
      return;
    }
    const router = await this.prisma.router.findFirst({ where: { id: resourceId, organizationId: principal.organizationId, deletedAt: null, ...branchWhere }, select: { status: true, maintenanceStatus: true } });
    if (!router) throw new NotFoundException({ code: 'ROUTER_NOT_FOUND', message: 'Router was not found.' });
    if (router.status !== 'AVAILABLE' || router.maintenanceStatus !== 'OK') throw new BadRequestException(unavailable);
  }

  private async findAssignment(principal: AuthenticatedPrincipal, resourceType: AssignmentResourceTypeDto, assignmentId: string) {
    const where = { id: assignmentId, organizationId: principal.organizationId };
    const assignment =
      resourceType === AssignmentResourceTypeDto.OPERATOR
        ? await this.prisma.eventOperatorAssignment.findFirst({ where })
        : resourceType === AssignmentResourceTypeDto.DEVICE
          ? await this.prisma.eventDeviceAssignment.findFirst({ where })
          : resourceType === AssignmentResourceTypeDto.SIM
            ? await this.prisma.eventSimAssignment.findFirst({ where })
            : await this.prisma.eventRouterAssignment.findFirst({ where });
    if (!assignment) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Assignment was not found.' });
    return assignment;
  }

  private async updateAssignmentStatus(tx: Prisma.TransactionClient, resourceType: AssignmentResourceTypeDto, assignmentId: string, status: AssignmentStatusDto, releasedById: string, notes?: string) {
    const data = { status, releasedById, releasedAt: new Date(), ...(notes !== undefined ? { notes } : {}) };
    if (resourceType === AssignmentResourceTypeDto.OPERATOR) return tx.eventOperatorAssignment.update({ where: { id: assignmentId }, data });
    if (resourceType === AssignmentResourceTypeDto.DEVICE) return tx.eventDeviceAssignment.update({ where: { id: assignmentId }, data });
    if (resourceType === AssignmentResourceTypeDto.SIM) return tx.eventSimAssignment.update({ where: { id: assignmentId }, data });
    return tx.eventRouterAssignment.update({ where: { id: assignmentId }, data });
  }

  private async updateResourceStatusAfterAssign(tx: Prisma.TransactionClient, resourceType: AssignmentResourceTypeDto, resourceId: string) {
    if (resourceType === AssignmentResourceTypeDto.DEVICE) await tx.broadcastDevice.update({ where: { id: resourceId }, data: { status: 'ASSIGNED' } });
    if (resourceType === AssignmentResourceTypeDto.SIM) await tx.simCard.update({ where: { id: resourceId }, data: { status: 'ASSIGNED' } });
    if (resourceType === AssignmentResourceTypeDto.ROUTER) await tx.router.update({ where: { id: resourceId }, data: { status: 'ASSIGNED' } });
  }

  private async updateResourceStatusAfterRelease(tx: Prisma.TransactionClient, resourceType: AssignmentResourceTypeDto, resourceId: string) {
    if (resourceType === AssignmentResourceTypeDto.DEVICE) await tx.broadcastDevice.update({ where: { id: resourceId }, data: { status: 'AVAILABLE' } });
    if (resourceType === AssignmentResourceTypeDto.SIM) await tx.simCard.update({ where: { id: resourceId }, data: { status: 'AVAILABLE' } });
    if (resourceType === AssignmentResourceTypeDto.ROUTER) await tx.router.update({ where: { id: resourceId }, data: { status: 'AVAILABLE' } });
  }

  private assignmentResourceId(resourceType: AssignmentResourceTypeDto, assignment: { operatorId?: string; deviceId?: string; simId?: string; routerId?: string }) {
    if (resourceType === AssignmentResourceTypeDto.OPERATOR) return assignment.operatorId ?? '';
    if (resourceType === AssignmentResourceTypeDto.DEVICE) return assignment.deviceId ?? '';
    if (resourceType === AssignmentResourceTypeDto.SIM) return assignment.simId ?? '';
    return assignment.routerId ?? '';
  }
}
