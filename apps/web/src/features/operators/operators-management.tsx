'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { StatusBadge } from '../users/status-badge';

type OperatorRow = {
  id: string;
  role: string;
  status: string;
  salaryType: string;
  user: {
    fullName: string;
    email: string;
    phone?: string | null;
  };
};

type OperatorsResponse = {
  items: OperatorRow[];
};

export function OperatorsManagement() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['operators', search],
    queryFn: () => authenticatedRequest<OperatorsResponse>(`/operators?search=${encodeURIComponent(search)}`),
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Operators</h2>
        <p className="text-sm text-muted-foreground">Manage operator profiles, rates, and assignment ownership.</p>
      </div>
      <input
        className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm"
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Filter operators"
        value={search}
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Salary Type</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="px-4 py-4" colSpan={4}>Loading operators...</td></tr>
            ) : (
              data?.items.map((operator) => (
                <tr className="border-t border-border" key={operator.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{operator.user.fullName}</div>
                    <div className="text-muted-foreground">{operator.user.email}</div>
                  </td>
                  <td className="px-4 py-3">{operator.role}</td>
                  <td className="px-4 py-3">{operator.salaryType}</td>
                  <td className="px-4 py-3"><StatusBadge status={operator.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
