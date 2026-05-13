'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { authenticatedRequest } from '../auth/lib/authenticated-request';

type ReportRun = { id: string; reportType: string; exportFormat: string; status: string; createdAt: string };

export function ReportsDashboard() {
  const queryClient = useQueryClient();
  const [reportType, setReportType] = useState('EVENT_PROFITABILITY');
  const reports = useQuery({ queryKey: ['reports'], queryFn: () => authenticatedRequest<{ items: ReportRun[] }>('/reports') });
  const generate = useMutation({
    mutationFn: () => authenticatedRequest('/reports/generate', { method: 'POST', body: JSON.stringify({ reportType, exportFormat: 'JSON' }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold">Reports</h2><p className="text-sm text-muted-foreground">Operational and financial report runs with export preparation.</p></div>
      <div className="flex gap-2">
        <select className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={reportType} onChange={(event) => setReportType(event.target.value)}>
          {['EVENT_PROFITABILITY', 'OPERATOR_PAYOUTS', 'SIM_UTILIZATION', 'DEVICE_UTILIZATION', 'ASSIGNMENT_HISTORY', 'EXPENSE_BREAKDOWN', 'PAYROLL_SUMMARY'].map((type) => <option key={type}>{type}</option>)}
        </select>
        <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => generate.mutate()}>Generate</button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border"><table className="w-full text-sm"><tbody>{reports.data?.items.map((run) => <tr className="border-t border-border" key={run.id}><td className="px-4 py-3">{run.reportType}</td><td>{run.exportFormat}</td><td>{run.status}</td><td>{new Date(run.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>
    </section>
  );
}
