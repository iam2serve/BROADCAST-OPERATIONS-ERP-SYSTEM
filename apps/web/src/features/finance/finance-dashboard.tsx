'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { Money } from './finance-status';

type Summary = { transactionCount: number; debit: number; credit: number };
type LedgerRow = { id: string; accountCode: string; direction: string; amount: string; currency: string; transaction?: { type: string; description?: string | null } };

export function FinanceDashboard() {
  const [eventId, setEventId] = useState('');
  const summary = useQuery({ queryKey: ['finance-summary'], queryFn: () => authenticatedRequest<Summary>('/finance/summary') });
  const ledger = useQuery({ queryKey: ['ledger'], queryFn: () => authenticatedRequest<{ items: LedgerRow[] }>('/finance/ledger') });
  const profitability = useQuery({
    queryKey: ['profitability', eventId],
    enabled: Boolean(eventId),
    queryFn: () => authenticatedRequest(`/finance/events/${eventId}/profitability`),
  });

  return (
    <section className="space-y-5">
      <div><h2 className="text-lg font-semibold">Finance</h2><p className="text-sm text-muted-foreground">Ledger, profitability, financial summaries, and lock-ready reporting.</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border p-4"><div className="text-sm text-muted-foreground">Transactions</div><div className="text-2xl font-semibold">{summary.data?.transactionCount ?? 0}</div></div>
        <div className="rounded-lg border border-border p-4"><div className="text-sm text-muted-foreground">Debits</div><div className="text-2xl font-semibold"><Money amount={summary.data?.debit ?? 0} /></div></div>
        <div className="rounded-lg border border-border p-4"><div className="text-sm text-muted-foreground">Credits</div><div className="text-2xl font-semibold"><Money amount={summary.data?.credit ?? 0} /></div></div>
      </div>
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Event Profitability Snapshot</h3>
        <div className="mt-3 flex gap-2">
          <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Event ID" value={eventId} onChange={(event) => setEventId(event.target.value)} />
          <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" disabled={!eventId} onClick={() => { void profitability.refetch(); }}>Calculate</button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Direction</th><th className="px-4 py-3">Amount</th></tr></thead>
          <tbody>{ledger.data?.items.map((line) => (
            <tr className="border-t border-border" key={line.id}><td className="px-4 py-3">{line.accountCode}</td><td className="px-4 py-3">{line.transaction?.type}</td><td className="px-4 py-3">{line.direction}</td><td className="px-4 py-3"><Money amount={line.amount} currency={line.currency} /></td></tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
