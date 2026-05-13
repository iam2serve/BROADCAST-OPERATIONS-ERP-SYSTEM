import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, expect, it, vi } from 'vitest';

import { AvailabilityService } from '../../src/modules/availability/availability.service.js';
import { AssignmentResourceTypeDto } from '../../src/modules/assignments/dto/assignment.dto.js';

const principal = { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' };

describe('AvailabilityService', () => {
  it('reports assignment conflicts for overlapping reservations', async () => {
    const prisma = {
      event: { findFirst: vi.fn().mockResolvedValue({ cooldownBeforeMinutes: 0, cooldownAfterMinutes: 0 }) },
      eventDeviceAssignment: {
        findMany: vi.fn().mockResolvedValue([{ id: 'a1', eventId: 'other-event', startsAt: new Date(), endsAt: new Date(), status: 'RESERVED' }]),
      },
      assetMaintenanceWindow: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new AvailabilityService(prisma as never, { record: vi.fn() } as never);

    const preview = await service.preview(principal, {
      resourceType: AssignmentResourceTypeDto.DEVICE,
      resourceId: 'device-1',
      eventId: 'event-1',
      startsAt: '2026-06-01T10:00:00.000Z',
      endsAt: '2026-06-01T12:00:00.000Z',
    });

    expect(preview.available).toBe(false);
    expect(preview.conflicts[0]?.type).toBe('ASSIGNMENT');
    expect(prisma.eventDeviceAssignment.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deviceId: 'device-1',
        eventId: { not: 'event-1' },
      }),
      select: expect.any(Object),
    });
  });

  it('applies event cooldown buffers to preview ranges', async () => {
    const prisma = {
      event: { findFirst: vi.fn().mockResolvedValue({ cooldownBeforeMinutes: 15, cooldownAfterMinutes: 20 }) },
      eventSimAssignment: { findMany: vi.fn().mockResolvedValue([]) },
      assetMaintenanceWindow: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new AvailabilityService(prisma as never, { record: vi.fn() } as never);

    const preview = await service.preview(principal, {
      resourceType: AssignmentResourceTypeDto.SIM,
      resourceId: 'sim-1',
      eventId: 'event-1',
      startsAt: '2026-06-01T10:00:00.000Z',
      endsAt: '2026-06-01T12:00:00.000Z',
    });

    expect(preview.range.effectiveStartsAt).toEqual(new Date('2026-06-01T09:45:00.000Z'));
    expect(preview.range.effectiveEndsAt).toEqual(new Date('2026-06-01T12:20:00.000Z'));
  });
});
