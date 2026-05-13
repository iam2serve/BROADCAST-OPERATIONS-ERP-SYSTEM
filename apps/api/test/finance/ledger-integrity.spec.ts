import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, expect, it, vi } from 'vitest';

import { FinanceService } from '../../src/modules/finance/finance.service.js';

const principal = { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' };

describe('FinanceService ledger integrity', () => {
  it('rejects unbalanced ledger postings', async () => {
    const service = new FinanceService({} as never, {} as never);
    await expect(service.postTransaction(principal, {
      type: 'EXPENSE',
      ledgerEntries: [
        { accountCode: '6000', direction: 'DEBIT', amount: 100 },
        { accountCode: '2100', direction: 'CREDIT', amount: 90 },
      ],
    })).rejects.toMatchObject({ response: expect.objectContaining({ code: 'UNBALANCED_LEDGER_TRANSACTION' }) });
  });

  it('creates a transaction with ledger entries when balanced', async () => {
    const prisma = {
      financialTransaction: { create: vi.fn().mockResolvedValue({ id: 'txn-1' }) },
    };
    const service = new FinanceService(prisma as never, {} as never);
    await service.postTransaction(principal, {
      type: 'EXPENSE',
      ledgerEntries: [
        { accountCode: '6000', direction: 'DEBIT', amount: 100 },
        { accountCode: '2100', direction: 'CREDIT', amount: 100 },
      ],
    });
    expect(prisma.financialTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ organizationId: 'org' }), include: { ledgerEntries: true } });
  });
});
