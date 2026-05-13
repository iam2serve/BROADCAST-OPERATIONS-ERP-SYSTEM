import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, expect, it, vi } from 'vitest';

import { WorkerQueueService } from '../../src/modules/workers/worker-queue.service.js';

describe('WorkerQueueService', () => {
  it('claims due queued jobs for a worker', async () => {
    const jobs = [{ id: 'job-1' }];
    const prisma = { workerJob: { findMany: vi.fn().mockResolvedValue(jobs), update: vi.fn().mockResolvedValue({}) } };
    const service = new WorkerQueueService(prisma as never);

    const claimed = await service.claimDue('notifications', 'worker-1');

    expect(claimed).toEqual(jobs);
    expect(prisma.workerJob.update).toHaveBeenCalledWith({ where: { id: 'job-1' }, data: expect.objectContaining({ status: 'PROCESSING', lockedBy: 'worker-1' }) });
  });
});
