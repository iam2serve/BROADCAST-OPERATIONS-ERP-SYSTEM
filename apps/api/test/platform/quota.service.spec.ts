import 'reflect-metadata';

import { describe, expect, it, vi } from 'vitest';

import { QuotasService } from '../../src/modules/platform/quotas.service.js';

describe('QuotasService', () => {
  it('creates quota defaults for organizations', async () => {
    const prisma = { organizationQuota: { upsert: vi.fn().mockResolvedValue({ organizationId: 'org', maxUsers: 50 }) } };
    const service = new QuotasService(prisma as never);

    const quota = await service.getForOrganization({ userId: 'u', organizationId: 'org', roleId: 'r', permissions: [], sessionId: 's' });

    expect(quota.maxUsers).toBe(50);
  });
});
