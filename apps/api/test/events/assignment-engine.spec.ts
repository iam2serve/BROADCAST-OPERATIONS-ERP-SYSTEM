import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */

import { describe, expect, it, vi } from 'vitest';

import { AssignmentResourceTypeDto } from '../../src/modules/assignments/dto/assignment.dto.js';
import { AssignmentsService } from '../../src/modules/assignments/assignments.service.js';

const principal = { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' };

describe('AssignmentsService', () => {
  it('creates device assignments in a database transaction and stores buffered ranges', async () => {
    const event = {
      id: 'event-1',
      organizationId: 'org',
      branchId: null,
      startsAt: new Date('2026-06-01T10:00:00.000Z'),
      endsAt: new Date('2026-06-01T12:00:00.000Z'),
      cooldownBeforeMinutes: 30,
      cooldownAfterMinutes: 45,
    };
    const tx = {
      eventDeviceAssignment: { create: vi.fn().mockResolvedValue({ id: 'assignment-1', status: 'RESERVED' }) },
      broadcastDevice: { update: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      event: { findFirst: vi.fn().mockResolvedValue(event) },
      broadcastDevice: { findFirst: vi.fn().mockResolvedValue({ status: 'AVAILABLE', maintenanceStatus: 'OK' }) },
      $transaction: vi.fn((callback) => callback(tx)),
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const availability = { ensureAvailable: vi.fn().mockResolvedValue(undefined) };
    const timeline = { record: vi.fn().mockResolvedValue(undefined) };
    const service = new AssignmentsService(prisma as never, audit as never, availability as never, timeline as never);

    await service.assignDevice(principal, 'event-1', { resourceId: 'device-1' }, {});

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.eventDeviceAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deviceId: 'device-1',
        effectiveStartsAt: new Date('2026-06-01T09:30:00.000Z'),
        effectiveEndsAt: new Date('2026-06-01T12:45:00.000Z'),
      }),
    });
  });

  it('releases assignments with terminal status only', async () => {
    const prisma = {
      eventDeviceAssignment: { findFirst: vi.fn().mockResolvedValue({ id: 'a1', eventId: 'event-1', deviceId: 'device-1' }) },
      $transaction: vi.fn(),
    };
    const service = new AssignmentsService(prisma as never, {} as never, {} as never, {} as never);

    await expect(service.release(principal, AssignmentResourceTypeDto.DEVICE, 'a1', { status: 'ACTIVE' as never }, {})).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_RELEASE_STATUS' }),
    });
  });
});
