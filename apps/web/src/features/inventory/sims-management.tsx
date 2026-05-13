'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { InventoryStatusBadge } from './inventory-status';

type SimRow = { id: string; phoneNumber: string; iccid: string; carrier: string; packageType?: string | null; packageRenewalDate?: string | null; assetTag?: string | null; qrCodeIdentifier?: string | null; status: string };

export function SimsManagement() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['sims', search], queryFn: () => authenticatedRequest<{ items: SimRow[] }>(`/sims?search=${encodeURIComponent(search)}`) });

  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold">SIM Cards</h2><p className="text-sm text-muted-foreground">Manage carrier inventory, package renewal, credentials, and recharge history.</p></div>
      <input className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Filter SIMs" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="px-4 py-3">SIM</th><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Package</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td className="px-4 py-4" colSpan={4}>Loading SIMs...</td></tr> : data?.items.map((sim) => (
              <tr className="border-t border-border" key={sim.id}>
                <td className="px-4 py-3"><div className="font-medium">{sim.phoneNumber}</div><div className="text-muted-foreground">{sim.carrier} · {sim.iccid}</div></td>
                <td className="px-4 py-3"><div>{sim.assetTag ?? 'No asset tag'}</div><div className="text-muted-foreground">{sim.qrCodeIdentifier ?? 'No QR'}</div></td>
                <td className="px-4 py-3"><div>{sim.packageType ?? '-'}</div><div className="text-muted-foreground">{sim.packageRenewalDate ? new Date(sim.packageRenewalDate).toLocaleDateString() : 'No renewal date'}</div></td>
                <td className="px-4 py-3"><InventoryStatusBadge status={sim.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
