import { describe, expect, it, vi } from 'vitest';

import { SimsService } from '../../src/modules/sims/sims.service.js';

describe('SIM package management', () => {
  it('records package recharge history and updates the SIM renewal date', async () => {
    const prisma = {
      simCard: {
        findFirst: vi.fn().mockResolvedValue({ id: 'sim-1' }),
        update: vi.fn().mockResolvedValue({ id: 'sim-1' }),
      },
      simPackageHistory: {
        create: vi.fn().mockResolvedValue({ id: 'pkg-1' }),
      },
    };
    const service = new SimsService(prisma as never, { record: vi.fn() } as never, {} as never);

    const result = await service.recharge(
      { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' },
      'sim-1',
      { rechargeDate: '2026-05-13', packageType: 'Monthly 100GB', amount: 500, expiryDate: '2026-06-13' },
    );

    expect(result).toEqual({ id: 'pkg-1' });
    expect(prisma.simPackageHistory.create).toHaveBeenCalled();
    const updateCall = prisma.simCard.update.mock.calls[0]?.[0] as {
      data: { packageType: string };
    };
    expect(updateCall.data.packageType).toBe('Monthly 100GB');
  });
});
