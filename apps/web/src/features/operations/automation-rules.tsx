'use client';

import { useQuery } from '@tanstack/react-query';

import { authenticatedRequest } from '../auth/lib/authenticated-request';

type Rule = { id: string; name: string; triggerType: string; status: string; nextRunAt?: string | null };

export function AutomationRules() {
  const rules = useQuery({ queryKey: ['automation-rules'], queryFn: () => authenticatedRequest<{ items: Rule[] }>('/automation/rules') });
  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold">Automation</h2><p className="text-sm text-muted-foreground">Trigger and scheduled rules queued for background execution.</p></div>
      <div className="grid gap-3 md:grid-cols-2">{rules.data?.items.map((rule) => <div className="rounded-lg border border-border p-4 text-sm" key={rule.id}><div className="font-medium">{rule.name}</div><div className="text-muted-foreground">{rule.triggerType} · {rule.status}</div></div>)}</div>
    </section>
  );
}
