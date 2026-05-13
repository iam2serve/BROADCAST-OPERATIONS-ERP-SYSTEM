import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */

import { describe, expect, it, vi } from 'vitest';

import { PayrollService } from '../../src/modules/payroll/payroll.service.js';

const principal = { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' };

describe('PayrollService', () => {
  it('posts ledger entries when payout is paid', async () => {
    const payout = { id: 'payout-1', payrollPeriodId: 'period-1', status: 'DRAFT', amount: 500, currency: 'EGP' };
    const tx = { payrollPayout: { update: vi.fn().mockResolvedValue({ ...payout, status: 'PAID' }) } };
    const prisma = { payrollPayout: { findFirst: vi.fn().mockResolvedValue(payout) }, $transaction: vi.fn((callback) => callback(tx)) };
    const finance = { assertPayrollPeriodUnlocked: vi.fn(), postTransaction: vi.fn() };
    const service = new PayrollService(prisma as never, { record: vi.fn() } as never, finance as never);

    await service.payPayout(principal, 'payout-1', {});

    expect(finance.postTransaction).toHaveBeenCalledWith(principal, expect.objectContaining({ type: 'PAYROLL_PAYOUT', payrollPayoutId: 'payout-1' }), tx);
  });
});
