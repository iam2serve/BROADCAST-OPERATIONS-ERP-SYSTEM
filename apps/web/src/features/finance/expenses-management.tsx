'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { ExpenseStatusBadge, Money } from './finance-status';

type ExpenseRow = {
  id: string;
  amount: string;
  currency: string;
  category: string;
  status: string;
  paymentMethod: string;
  submittedAt?: string | null;
  reimbursedAt?: string | null;
  event?: { name: string };
  operator?: { user?: { fullName: string } };
  receipts?: unknown[];
};

export function ExpensesManagement() {
  const queryClient = useQueryClient();
  const expenses = useQuery({
    queryKey: ['expenses'],
    queryFn: () => authenticatedRequest<{ items: ExpenseRow[] }>('/expenses'),
  });
  const action = useMutation({
    mutationFn: ({ id, actionName }: { id: string; actionName: 'review' | 'approve' | 'reject' | 'reimburse' }) =>
      authenticatedRequest(`/expenses/${id}/${actionName}`, {
        method: 'POST',
        body: JSON.stringify(actionName === 'reimburse' ? { paymentMethod: 'cash' } : {}),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold">Expenses</h2><p className="text-sm text-muted-foreground">Review, approve, reject, and reimburse operator expenses.</p></div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="px-4 py-3">Expense</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Receipts</th><th className="px-4 py-3">Workflow</th></tr></thead>
          <tbody>
            {expenses.isLoading ? <tr><td className="px-4 py-4" colSpan={5}>Loading expenses...</td></tr> : expenses.data?.items.map((expense) => (
              <tr className="border-t border-border" key={expense.id}>
                <td className="px-4 py-3"><div className="font-medium">{expense.category}</div><div className="text-muted-foreground">{expense.event?.name ?? 'No event'} · {expense.operator?.user?.fullName ?? 'No operator'}</div></td>
                <td className="px-4 py-3"><Money amount={expense.amount} currency={expense.currency} /><div className="text-muted-foreground">{expense.paymentMethod}</div></td>
                <td className="px-4 py-3"><ExpenseStatusBadge status={expense.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{expense.receipts?.length ?? 0} attached</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => action.mutate({ id: expense.id, actionName: 'review' })}>Review</button>
                    <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => action.mutate({ id: expense.id, actionName: 'approve' })}>Approve</button>
                    <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => action.mutate({ id: expense.id, actionName: 'reject' })}>Reject</button>
                    <button className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground" onClick={() => action.mutate({ id: expense.id, actionName: 'reimburse' })}>Reimburse</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
