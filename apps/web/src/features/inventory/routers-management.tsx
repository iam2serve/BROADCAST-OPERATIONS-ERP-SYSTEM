'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { InventoryStatusBadge, TelemetryIndicator } from './inventory-status';

type RouterRow = { id: string; imei: string; brand: string; model: string; assetTag?: string | null; qrCodeIdentifier?: string | null; wifiSsid?: string | null; status: string; lastSeenAt?: string | null; signalRssi?: number | null };

export function RoutersManagement() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['routers', search], queryFn: () => authenticatedRequest<{ items: RouterRow[] }>(`/routers?search=${encodeURIComponent(search)}`) });
  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold">Routers</h2><p className="text-sm text-muted-foreground">Manage 4G/5G router inventory, WiFi credentials, SIM links, and telemetry readiness.</p></div>
      <input className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Filter routers" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="px-4 py-3">Router</th><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Telemetry</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td className="px-4 py-4" colSpan={4}>Loading routers...</td></tr> : data?.items.map((router) => (
              <tr className="border-t border-border" key={router.id}>
                <td className="px-4 py-3"><div className="font-medium">{router.brand} {router.model}</div><div className="text-muted-foreground">{router.imei} · {router.wifiSsid ?? 'No SSID'}</div></td>
                <td className="px-4 py-3"><div>{router.assetTag ?? 'No asset tag'}</div><div className="text-muted-foreground">{router.qrCodeIdentifier ?? 'No QR'}</div></td>
                <td className="px-4 py-3"><InventoryStatusBadge status={router.status} /></td>
                <td className="px-4 py-3"><TelemetryIndicator lastSeenAt={router.lastSeenAt} /><div className="text-muted-foreground">RSSI {router.signalRssi ?? '-'}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
