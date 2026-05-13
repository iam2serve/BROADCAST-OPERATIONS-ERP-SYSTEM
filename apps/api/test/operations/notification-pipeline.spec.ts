import 'reflect-metadata';

import { describe, expect, it, vi } from 'vitest';

import { NotificationsService } from '../../src/modules/notifications/notifications.service.js';

const principal = { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' };

describe('NotificationsService', () => {
  it('creates notifications and enqueues delivery jobs', async () => {
    const prisma = { notification: { createManyAndReturn: vi.fn().mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]) } };
    const queue = { enqueue: vi.fn().mockResolvedValue({ id: 'job' }) };
    const service = new NotificationsService(prisma as never, { record: vi.fn() } as never, queue as never);

    await service.dispatch(principal, { userIds: ['u1', 'u2'], title: 'Title', body: 'Body', type: 'event_assignment' }, {});

    expect(queue.enqueue).toHaveBeenCalledTimes(2);
  });
});
