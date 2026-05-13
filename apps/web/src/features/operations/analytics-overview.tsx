'use client';

import { useQuery } from '@tanstack/react-query';

import { authenticatedRequest } from '../auth/lib/authenticated-request';

type Overview = { events: number; activeAssignments: number };

export function AnalyticsOverview() {
  const overview = useQuery({ queryKey: ['analytics-overview'], queryFn: () => authenticatedRequest<Overview>('/analytics/overview') });
  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold">Analytics</h2><p className="text-sm text-muted-foreground">Utilization, workload, SIM trends, and profitability foundation.</p></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border p-4"><div className="text-sm text-muted-foreground">Events</div><div className="text-2xl font-semibold">{overview.data?.events ?? 0}</div></div>
        <div className="rounded-lg border border-border p-4"><div className="text-sm text-muted-foreground">Active Assignments</div><div className="text-2xl font-semibold">{overview.data?.activeAssignments ?? 0}</div></div>
      </div>
    </section>
  );
}
