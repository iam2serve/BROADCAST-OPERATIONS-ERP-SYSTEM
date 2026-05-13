import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */

import { describe, expect, it, vi } from 'vitest';

import { ExpensesService } from '../../src/modules/expenses/expenses.service.js';

const principal = { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' };

describe('ExpensesService workflow', () => {
  it('approves submitted expenses and posts payable ledger entries', async () => {
    const expense = { id: 'expense-1', eventId: 'event-1', status: 'SUBMITTED', amount: 125, currency: 'EGP' };
    const tx = { expense: { update: vi.fn().mockResolvedValue({ ...expense, status: 'APPROVED' }) } };
    const prisma = { expense: { findFirst: vi.fn().mockResolvedValue(expense) }, $transaction: vi.fn((callback) => callback(tx)) };
    const finance = { postTransaction: vi.fn().mockResolvedValue({ id: 'txn-1' }) };
    const service = new ExpensesService(prisma as never, { record: vi.fn() } as never, finance as never, { record: vi.fn() } as never);

    await service.approve(principal, 'expense-1', {}, {});

    expect(finance.postTransaction).toHaveBeenCalledWith(principal, expect.objectContaining({ type: 'EXPENSE', expenseId: 'expense-1' }), tx);
  });

  it('reimburses only approved expenses', async () => {
    const prisma = { expense: { findFirst: vi.fn().mockResolvedValue({ id: 'expense-1', status: 'SUBMITTED' }) } };
    const service = new ExpensesService(prisma as never, {} as never, {} as never, {} as never);

    await expect(service.reimburse(principal, 'expense-1', { paymentMethod: 'cash' }, {})).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EXPENSE_NOT_REIMBURSABLE' }),
    });
  });
});
