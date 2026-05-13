import 'reflect-metadata';

import { describe, expect, it, vi } from 'vitest';

import { HealthService } from '../../src/system/health.service.js';

describe('HealthService', () => {
  it('returns readiness checks with dependency statuses', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      workerJob: { count: vi.fn().mockResolvedValue(0) },
      syncConflict: { count: vi.fn().mockResolvedValue(0) },
    };
    const service = new HealthService(
      prisma as never,
      { snapshot: vi.fn().mockReturnValue({ counters: {}, timings: {} }) } as never,
      { values: { REDIS_URL: 'redis://localhost:6379', S3_ENDPOINT: 'http://127.0.0.1:1' } } as never,
    );

    const readiness = await service.readiness();

    expect(readiness.checks.database.status).toBe('ok');
    expect(readiness.checks.queue.status).toBe('ok');
    expect(readiness.checks.sync.status).toBe('ok');
  });
});
