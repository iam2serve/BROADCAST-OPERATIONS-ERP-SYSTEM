'use client';

import { useQuery } from '@tanstack/react-query';

import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { Money } from './finance-status';

type SalaryProfile = { id: string; salaryType: string; dailyRate?: string | null; eventRate?: string | null; monthlyRate?: string | null; currency: string; operator?: { user?: { fullName: string } } };

export function PayrollManagement() {
  const profiles = useQuery({ queryKey: ['salary-profiles'], queryFn: () => authenticatedRequest<{ items: SalaryProfile[] }>('/payroll/salary-profiles') });
  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold">Payroll</h2><p className="text-sm text-muted-foreground">Salary profiles, payout tracking, advances, deductions, and overtime foundation.</p></div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="px-4 py-3">Operator</th><th className="px-4 py-3">Salary Type</th><th className="px-4 py-3">Rates</th><th className="px-4 py-3">Payout State</th></tr></thead>
          <tbody>
            {profiles.isLoading ? <tr><td className="px-4 py-4" colSpan={4}>Loading payroll...</td></tr> : profiles.data?.items.map((profile) => (
              <tr className="border-t border-border" key={profile.id}>
                <td className="px-4 py-3 font-medium">{profile.operator?.user?.fullName ?? 'Operator'}</td>
                <td className="px-4 py-3">{profile.salaryType}</td>
                <td className="px-4 py-3 text-muted-foreground">Daily <Money amount={profile.dailyRate ?? 0} currency={profile.currency} /> · Event <Money amount={profile.eventRate ?? 0} currency={profile.currency} /> · Monthly <Money amount={profile.monthlyRate ?? 0} currency={profile.currency} /></td>
                <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Foundation</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
