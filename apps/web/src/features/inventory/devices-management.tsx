'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { permissions } from '@broadcast/auth';

import { useAuth } from '../auth/auth-provider';
import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { buttonClass, cleanPayload, secondaryButtonClass, textInputClass } from './form-utils';
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
  firmwareVersion?: string | null;
  vendor?: string | null;
  warrantyExpiry?: string | null;
  maintenanceStatus?: string | null;
  supportsCellular?: boolean | null;
  supportsEthernet?: boolean | null;
  supportsWifi?: boolean | null;
  notes?: string | null;
};

type DeviceFormValues = {
  serialNumber: string;
  alias: string;
  deviceType: string;
  firmwareVersion: string;
  assetTag: string;
  qrCodeIdentifier: string;
  purchaseDate: string;
  vendor: string;
  warrantyExpiry: string;
  maintenanceStatus: string;
  supportsCellular: boolean;
  supportsEthernet: boolean;
  supportsWifi: boolean;
  credentials: string;
  notes: string;
};

const emptyDeviceForm: DeviceFormValues = {
  serialNumber: '',
  alias: '',
  deviceType: 'LIVEU',
  firmwareVersion: '',
  assetTag: '',
  qrCodeIdentifier: '',
  purchaseDate: '',
  vendor: '',
  warrantyExpiry: '',
  maintenanceStatus: 'OK',
  supportsCellular: true,
  supportsEthernet: true,
  supportsWifi: false,
  credentials: '',
  notes: '',
};

function toDeviceForm(device: DeviceRow): DeviceFormValues {
  return {
    ...emptyDeviceForm,
    serialNumber: device.serialNumber,
    alias: device.alias,
    deviceType: device.deviceType,
    firmwareVersion: device.firmwareVersion ?? '',
    assetTag: device.assetTag ?? '',
    qrCodeIdentifier: device.qrCodeIdentifier ?? '',
    vendor: device.vendor ?? '',
    warrantyExpiry: device.warrantyExpiry?.slice(0, 10) ?? '',
    maintenanceStatus: device.maintenanceStatus ?? 'OK',
    supportsCellular: device.supportsCellular ?? true,
    supportsEthernet: device.supportsEthernet ?? true,
    supportsWifi: device.supportsWifi ?? false,
    notes: device.notes ?? '',
  };
}

export function DevicesManagement() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [form, setForm] = useState<DeviceFormValues>(emptyDeviceForm);
  const [formError, setFormError] = useState<string | null>(null);
  const canCreate = auth.permissions.includes(permissions.devicesCreate);
  const canUpdate = auth.permissions.includes(permissions.devicesUpdate);
  const { data, isLoading } = useQuery({
    queryKey: ['devices', search],
    queryFn: () => authenticatedRequest<{ items: DeviceRow[] }>(`/devices?search=${encodeURIComponent(search)}`),
  });
  const saveDevice = useMutation({
    mutationFn: (values: DeviceFormValues) => {
      const payload = cleanPayload(values);
      const path = selectedDeviceId ? `/devices/${selectedDeviceId}` : '/devices';

      return authenticatedRequest<DeviceRow>(path, {
        method: selectedDeviceId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      setForm(emptyDeviceForm);
      setSelectedDeviceId(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : 'Device could not be saved.'),
  });

  function updateField<K extends keyof DeviceFormValues>(field: K, value: DeviceFormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editDevice(device: DeviceRow) {
    if (!canUpdate) {
      return;
    }

    setSelectedDeviceId(device.id);
    setForm(toDeviceForm(device));
    setFormError(null);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><h2 className="text-lg font-semibold">Broadcast Devices</h2><p className="text-sm text-muted-foreground">Manage encoders, lifecycle state, SIM slots, and telemetry readiness.</p></div>
        <input className={`${textInputClass} w-full max-w-sm`} placeholder="Filter devices" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      {canCreate || selectedDeviceId ? (
        <form
          className="rounded-lg border border-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveDevice.mutate(form);
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{selectedDeviceId ? 'Edit device' : 'Add device'}</h3>
            {selectedDeviceId ? <button className={secondaryButtonClass} type="button" onClick={() => { setSelectedDeviceId(null); setForm(emptyDeviceForm); }}>Cancel edit</button> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input className={textInputClass} placeholder="Serial number" required value={form.serialNumber} onChange={(event) => updateField('serialNumber', event.target.value)} />
            <input className={textInputClass} placeholder="Alias name" required value={form.alias} onChange={(event) => updateField('alias', event.target.value)} />
            <select className={textInputClass} value={form.deviceType} onChange={(event) => updateField('deviceType', event.target.value)}>
              {['LIVEU', 'TVU', 'DEJERO', 'SRT', 'CUSTOM'].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input className={textInputClass} placeholder="Firmware version" value={form.firmwareVersion} onChange={(event) => updateField('firmwareVersion', event.target.value)} />
            <input className={textInputClass} placeholder="Asset tag" value={form.assetTag} onChange={(event) => updateField('assetTag', event.target.value)} />
            <input className={textInputClass} placeholder="QR code" value={form.qrCodeIdentifier} onChange={(event) => updateField('qrCodeIdentifier', event.target.value)} />
            <input className={textInputClass} placeholder="Vendor" value={form.vendor} onChange={(event) => updateField('vendor', event.target.value)} />
            <input className={textInputClass} type="date" value={form.purchaseDate} onChange={(event) => updateField('purchaseDate', event.target.value)} />
            <input className={textInputClass} type="date" value={form.warrantyExpiry} onChange={(event) => updateField('warrantyExpiry', event.target.value)} />
            <select className={textInputClass} value={form.maintenanceStatus} onChange={(event) => updateField('maintenanceStatus', event.target.value)}>
              {['OK', 'DUE', 'IN_PROGRESS', 'BLOCKED'].map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
            </select>
            <input className={textInputClass} placeholder="Encrypted credentials input" value={form.credentials} onChange={(event) => updateField('credentials', event.target.value)} />
            <input className={textInputClass} placeholder="Notes" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input checked={form.supportsCellular} type="checkbox" onChange={(event) => updateField('supportsCellular', event.target.checked)} /> Cellular</label>
            <label className="flex items-center gap-2"><input checked={form.supportsEthernet} type="checkbox" onChange={(event) => updateField('supportsEthernet', event.target.checked)} /> Ethernet</label>
            <label className="flex items-center gap-2"><input checked={form.supportsWifi} type="checkbox" onChange={(event) => updateField('supportsWifi', event.target.checked)} /> WiFi</label>
          </div>
          {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}
          <button className={`${buttonClass} mt-4`} disabled={saveDevice.isPending || (!selectedDeviceId && !canCreate)} type="submit">
            {saveDevice.isPending ? 'Saving...' : selectedDeviceId ? 'Save changes' : 'Create device'}
          </button>
        </form>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="px-4 py-3">Device</th><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Telemetry</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td className="px-4 py-4" colSpan={5}>Loading devices...</td></tr> : data?.items.map((device) => (
              <tr className="border-t border-border" key={device.id}>
                <td className="px-4 py-3"><div className="font-medium">{device.alias}</div><div className="text-muted-foreground">{device.deviceType} · {device.serialNumber}</div></td>
                <td className="px-4 py-3"><div>{device.assetTag ?? 'No asset tag'}</div><div className="text-muted-foreground">{device.qrCodeIdentifier ?? 'No QR'}</div></td>
                <td className="px-4 py-3"><InventoryStatusBadge status={device.status} /></td>
                <td className="px-4 py-3"><TelemetryIndicator lastSeenAt={device.lastSeenAt} /><div className="text-muted-foreground">RSSI {device.signalRssi ?? '-'} · Battery {device.batteryLevel ?? '-'}%</div></td>
                <td className="px-4 py-3">{canUpdate ? <button className={secondaryButtonClass} type="button" onClick={() => editDevice(device)}>Edit</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
