'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { InventoryStatusBadge, TelemetryIndicator } from './inventory-status';

type DeviceRow = {
  id: string;
  serialNumber: string;
  alias: string;
  deviceType: string;
  assetTag?: string | null;
  qrCodeIdentifier?: string | null;
  status: string;
  batteryLevel?: number | null;
  signalRssi?: number | null;
  lastSeenAt?: string | null;
};

export function DevicesManagement() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['devices', search],
    queryFn: () => authenticatedRequest<{ items: DeviceRow[] }>(`/devices?search=${encodeURIComponent(search)}`),
  });

  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold">Broadcast Devices</h2><p className="text-sm text-muted-foreground">Manage encoders, lifecycle state, SIM slots, and telemetry readiness.</p></div>
      <input className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Filter devices" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="px-4 py-3">Device</th><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Telemetry</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td className="px-4 py-4" colSpan={4}>Loading devices...</td></tr> : data?.items.map((device) => (
              <tr className="border-t border-border" key={device.id}>
                <td className="px-4 py-3"><div className="font-medium">{device.alias}</div><div className="text-muted-foreground">{device.deviceType} · {device.serialNumber}</div></td>
                <td className="px-4 py-3"><div>{device.assetTag ?? 'No asset tag'}</div><div className="text-muted-foreground">{device.qrCodeIdentifier ?? 'No QR'}</div></td>
                <td className="px-4 py-3"><InventoryStatusBadge status={device.status} /></td>
                <td className="px-4 py-3"><TelemetryIndicator lastSeenAt={device.lastSeenAt} /><div className="text-muted-foreground">RSSI {device.signalRssi ?? '-'} · Battery {device.batteryLevel ?? '-'}%</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
