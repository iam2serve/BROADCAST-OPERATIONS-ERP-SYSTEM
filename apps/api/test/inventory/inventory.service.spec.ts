import 'reflect-metadata';

import { describe, expect, it, vi } from 'vitest';

import { AssetTypeDto } from '../../src/modules/inventory/dto/inventory-common.dto.js';
import { InventoryService } from '../../src/modules/inventory/inventory.service.js';

describe('InventoryService', () => {
  it('closes open ownership history before creating a new handover', async () => {
    const prisma = {
      broadcastDevice: { findFirst: vi.fn().mockResolvedValue({ id: 'asset-1' }) },
      assetOwnershipHistory: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'history-1' }),
      },
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const service = new InventoryService(prisma as never, audit as never);

    await service.transferOwnership(
      { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' },
      AssetTypeDto.DEVICE,
      'asset-1',
      { assignedToUserId: 'operator-1' },
    );

    const updateCall = prisma.assetOwnershipHistory.updateMany.mock.calls[0]?.[0] as {
      where: { returnedAt: null };
    };
    expect(updateCall.where.returnedAt).toBeNull();
    expect(prisma.assetOwnershipHistory.create).toHaveBeenCalled();
  });
});
