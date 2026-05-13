import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, expect, it, vi } from 'vitest';

import { SyncResolutionDto } from '../../src/modules/sync/dto/sync.dto.js';
import { SyncService } from '../../src/modules/sync/sync.service.js';

const principal = { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' };

describe('SyncService', () => {
  it('blocks safe-field merge for financial conflicts', async () => {
    const prisma = { syncConflict: { findFirst: vi.fn().mockResolvedValue({ id: 'c1', entityType: 'FinancialTransaction', entityId: 't1' }) } };
    const service = new SyncService(prisma as never, { record: vi.fn() } as never);

    await expect(service.resolve(principal, 'c1', { resolution: SyncResolutionDto.MERGE_SAFE_FIELDS }, {})).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SYNC_ENTITY_NOT_MERGEABLE' }),
    });
  });
});
