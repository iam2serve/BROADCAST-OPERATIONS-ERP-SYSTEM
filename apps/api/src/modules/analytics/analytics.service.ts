import { Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';

import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(principal: AuthenticatedPrincipal) {
    const [events, activeAssignments, devices, sims, expenses] = await Promise.all([
      this.prisma.event.count({ where: { organizationId: principal.organizationId, deletedAt: null } }),
      this.prisma.eventDeviceAssignment.count({ where: { organizationId: principal.organizationId, status: { in: ['RESERVED', 'ACTIVE'] } } }),
      this.prisma.broadcastDevice.groupBy({ by: ['status'], where: { organizationId: principal.organizationId }, _count: true }),
      this.prisma.simCard.groupBy({ by: ['status'], where: { organizationId: principal.organizationId }, _count: true }),
      this.prisma.expense.groupBy({ by: ['status'], where: { organizationId: principal.organizationId }, _sum: { amount: true }, _count: true }),
    ]);
    return { events, activeAssignments, deviceUtilization: devices, simUsageTrends: sims, expenseTrends: expenses };
  }

  async utilization(principal: AuthenticatedPrincipal) {
    const [deviceAssignments, operatorAssignments, simAssignments] = await Promise.all([
      this.prisma.eventDeviceAssignment.groupBy({ by: ['deviceId'], where: { organizationId: principal.organizationId }, _count: true, orderBy: { _count: { deviceId: 'desc' } }, take: 50 }),
      this.prisma.eventOperatorAssignment.groupBy({ by: ['operatorId'], where: { organizationId: principal.organizationId }, _count: true, orderBy: { _count: { operatorId: 'desc' } }, take: 50 }),
      this.prisma.eventSimAssignment.groupBy({ by: ['simId'], where: { organizationId: principal.organizationId }, _count: true, orderBy: { _count: { simId: 'desc' } }, take: 50 }),
    ]);
    return { deviceAssignments, operatorWorkload: operatorAssignments, simAssignmentFrequency: simAssignments };
  }
}
