import 'reflect-metadata';

import { describe, expect, it, vi } from 'vitest';

import { AutomationService } from '../../src/modules/automation/automation.service.js';

const principal = { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' };

describe('AutomationService', () => {
  it('queues execution for an automation rule', async () => {
    const prisma = { automationRule: { findFirst: vi.fn().mockResolvedValue({ id: 'rule-1', triggerType: 'SCHEDULED' }), update: vi.fn() } };
    const queue = { enqueue: vi.fn().mockResolvedValue({ id: 'job-1' }) };
    const service = new AutomationService(prisma as never, { record: vi.fn() } as never, queue as never);

    await service.execute(principal, 'rule-1', {}, {});

    expect(queue.enqueue).toHaveBeenCalledWith(principal, 'automation.execute', 'automation', expect.objectContaining({ ruleId: 'rule-1' }));
  });
});
