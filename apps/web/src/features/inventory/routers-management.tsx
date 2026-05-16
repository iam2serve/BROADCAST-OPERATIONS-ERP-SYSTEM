'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { permissions } from '@broadcast/auth';

import { useAuth } from '../auth/auth-provider';
import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { buttonClass, cleanPayload, secondaryButtonClass, textInputClass } from './form-utils';
import { InventoryStatusBadge, TelemetryIndicator } from './inventory-status';

type RouterRow = { id: string; imei: string; brand: string; model: string; lanIp?: string | null; assetTag?: string | null; qrCodeIdentifier?: string | null; wifiSsid?: string | null; status: string; lastSeenAt?: string | null; signalRssi?: number | null; vendor?: string | null; warrantyExpiry?: string | null; maintenanceStatus?: string | null; currentSimId?: string | null };

type RouterFormValues = {
  imei: string;
  brand: string;
  model: string;
  lanIp: string;
  wifiSsid: string;
  wifiPassword: string;
  assetTag: string;
  qrCodeIdentifier: string;
  vendor: string;
  warrantyExpiry: string;
  maintenanceStatus: string;
  currentSimId: string;
};

const emptyRouterForm: RouterFormValues = {
  imei: '',
  brand: '',
  model: '',
  lanIp: '',
  wifiSsid: '',
  wifiPassword: '',
  assetTag: '',
  qrCodeIdentifier: '',
  vendor: '',
  warrantyExpiry: '',
  maintenanceStatus: 'OK',
  currentSimId: '',
};

function toRouterForm(router: RouterRow): RouterFormValues {
  return {
    ...emptyRouterForm,
    imei: router.imei,
    brand: router.brand,
    model: router.model,
    lanIp: router.lanIp ?? '',
    wifiSsid: router.wifiSsid ?? '',
    assetTag: router.assetTag ?? '',
    qrCodeIdentifier: router.qrCodeIdentifier ?? '',
    vendor: router.vendor ?? '',
    warrantyExpiry: router.warrantyExpiry?.slice(0, 10) ?? '',
    maintenanceStatus: router.maintenanceStatus ?? 'OK',
    currentSimId: router.currentSimId ?? '',
  };
}

export function RoutersManagement() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedRouterId, setSelectedRouterId] = useState<string | null>(null);
  const [form, setForm] = useState<RouterFormValues>(emptyRouterForm);
  const [formError, setFormError] = useState<string | null>(null);
  const canCreate = auth.permissions.includes(permissions.routersCreate);
  const canUpdate = auth.permissions.includes(permissions.routersUpdate);
  const { data, isLoading } = useQuery({ queryKey: ['routers', search], queryFn: () => authenticatedRequest<{ items: RouterRow[] }>(`/routers?search=${encodeURIComponent(search)}`) });
  const saveRouter = useMutation({
    mutationFn: (values: RouterFormValues) => authenticatedRequest<RouterRow>(selectedRouterId ? `/routers/${selectedRouterId}` : '/routers', {
      method: selectedRouterId ? 'PATCH' : 'POST',
      body: JSON.stringify(cleanPayload(values)),
    }),
    onSuccess: async () => {
      setSelectedRouterId(null);
      setForm(emptyRouterForm);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['routers'] });
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : 'Router could not be saved.'),
  });

  function updateField<K extends keyof RouterFormValues>(field: K, value: RouterFormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editRouter(router: RouterRow) {
    if (!canUpdate) {
      return;
    }

    setSelectedRouterId(router.id);
    setForm(toRouterForm(router));
    setFormError(null);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><h2 className="text-lg font-semibold">Routers</h2><p className="text-sm text-muted-foreground">Manage 4G/5G router inventory, WiFi credentials, SIM links, and telemetry readiness.</p></div>
        <input className={`${textInputClass} w-full max-w-sm`} placeholder="Filter routers" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      {canCreate || selectedRouterId ? (
        <form
          className="rounded-lg border border-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveRouter.mutate(form);
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{selectedRouterId ? 'Edit router' : 'Add router'}</h3>
            {selectedRouterId ? <button className={secondaryButtonClass} type="button" onClick={() => { setSelectedRouterId(null); setForm(emptyRouterForm); }}>Cancel edit</button> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input className={textInputClass} placeholder="IMEI" required value={form.imei} onChange={(event) => updateField('imei', event.target.value)} />
            <input className={textInputClass} placeholder="Brand" required value={form.brand} onChange={(event) => updateField('brand', event.target.value)} />
            <input className={textInputClass} placeholder="Model" required value={form.model} onChange={(event) => updateField('model', event.target.value)} />
            <input className={textInputClass} placeholder="LAN IP" value={form.lanIp} onChange={(event) => updateField('lanIp', event.target.value)} />
            <input className={textInputClass} placeholder="WiFi SSID" value={form.wifiSsid} onChange={(event) => updateField('wifiSsid', event.target.value)} />
            <input className={textInputClass} placeholder="WiFi password" type="password" value={form.wifiPassword} onChange={(event) => updateField('wifiPassword', event.target.value)} />
            <input className={textInputClass} placeholder="Asset tag" value={form.assetTag} onChange={(event) => updateField('assetTag', event.target.value)} />
            <input className={textInputClass} placeholder="QR code" value={form.qrCodeIdentifier} onChange={(event) => updateField('qrCodeIdentifier', event.target.value)} />
            <input className={textInputClass} placeholder="Vendor" value={form.vendor} onChange={(event) => updateField('vendor', event.target.value)} />
            <input className={textInputClass} type="date" value={form.warrantyExpiry} onChange={(event) => updateField('warrantyExpiry', event.target.value)} />
            <select className={textInputClass} value={form.maintenanceStatus} onChange={(event) => updateField('maintenanceStatus', event.target.value)}>
              {['OK', 'DUE', 'IN_PROGRESS', 'BLOCKED'].map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
            </select>
            <input className={textInputClass} placeholder="Current SIM ID" value={form.currentSimId} onChange={(event) => updateField('currentSimId', event.target.value)} />
          </div>
          {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}
          <button className={`${buttonClass} mt-4`} disabled={saveRouter.isPending || (!selectedRouterId && !canCreate)} type="submit">
            {saveRouter.isPending ? 'Saving...' : selectedRouterId ? 'Save changes' : 'Create router'}
          </button>
        </form>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="px-4 py-3">Router</th><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Telemetry</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td className="px-4 py-4" colSpan={5}>Loading routers...</td></tr> : data?.items.map((router) => (
              <tr className="border-t border-border" key={router.id}>
                <td className="px-4 py-3"><div className="font-medium">{router.brand} {router.model}</div><div className="text-muted-foreground">{router.imei} · {router.wifiSsid ?? 'No SSID'}</div></td>
                <td className="px-4 py-3"><div>{router.assetTag ?? 'No asset tag'}</div><div className="text-muted-foreground">{router.qrCodeIdentifier ?? 'No QR'}</div></td>
                <td className="px-4 py-3"><InventoryStatusBadge status={router.status} /></td>
                <td className="px-4 py-3"><TelemetryIndicator lastSeenAt={router.lastSeenAt} /><div className="text-muted-foreground">RSSI {router.signalRssi ?? '-'}</div></td>
                <td className="px-4 py-3">{canUpdate ? <button className={secondaryButtonClass} type="button" onClick={() => editRouter(router)}>Edit</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
