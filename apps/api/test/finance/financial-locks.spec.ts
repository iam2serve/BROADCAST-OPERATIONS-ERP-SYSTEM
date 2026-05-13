import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, expect, it, vi } from 'vitest';

import { FinanceService } from '../../src/modules/finance/finance.service.js';

describe('financial locks', () => {
  it('blocks locked event financial changes', async () => {
    const prisma = { financialLock: { findFirst: vi.fn().mockResolvedValue({ id: 'lock-1' }) } };
    const service = new FinanceService(prisma as never, {} as never);

    await expect(service.assertEventUnlocked('org', 'event-1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EVENT_FINANCIALLY_LOCKED' }),
    });
  });
});
