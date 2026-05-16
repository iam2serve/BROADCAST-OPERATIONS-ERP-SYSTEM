'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { permissions } from '@broadcast/auth';

import { useAuth } from '../auth/auth-provider';
import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { buttonClass, cleanPayload, secondaryButtonClass, textInputClass } from './form-utils';
import { InventoryStatusBadge } from './inventory-status';

type SimRow = { id: string; phoneNumber: string; iccid: string; imsi?: string | null; carrier: string; packageType?: string | null; packageRenewalDate?: string | null; mainControllingNumber?: string | null; apn?: string | null; assetTag?: string | null; qrCodeIdentifier?: string | null; status: string; notes?: string | null };

type SimFormValues = {
  phoneNumber: string;
  iccid: string;
  imsi: string;
  carrier: string;
  packageType: string;
  packageRenewalDate: string;
  mainControllingNumber: string;
  apn: string;
  assetTag: string;
  qrCodeIdentifier: string;
  credentials: string;
  notes: string;
};

const emptySimForm: SimFormValues = {
  phoneNumber: '',
  iccid: '',
  imsi: '',
  carrier: 'VODAFONE',
  packageType: '',
  packageRenewalDate: '',
  mainControllingNumber: '',
  apn: '',
  assetTag: '',
  qrCodeIdentifier: '',
  credentials: '',
  notes: '',
};

function toSimForm(sim: SimRow): SimFormValues {
  return {
    ...emptySimForm,
    phoneNumber: sim.phoneNumber,
    iccid: sim.iccid,
    imsi: sim.imsi ?? '',
    carrier: sim.carrier,
    packageType: sim.packageType ?? '',
    packageRenewalDate: sim.packageRenewalDate?.slice(0, 10) ?? '',
    mainControllingNumber: sim.mainControllingNumber ?? '',
    apn: sim.apn ?? '',
    assetTag: sim.assetTag ?? '',
    qrCodeIdentifier: sim.qrCodeIdentifier ?? '',
    notes: sim.notes ?? '',
  };
}

export function SimsManagement() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const [form, setForm] = useState<SimFormValues>(emptySimForm);
  const [formError, setFormError] = useState<string | null>(null);
  const canCreate = auth.permissions.includes(permissions.simsCreate);
  const canUpdate = auth.permissions.includes(permissions.simsUpdate);
  const { data, isLoading } = useQuery({ queryKey: ['sims', search], queryFn: () => authenticatedRequest<{ items: SimRow[] }>(`/sims?search=${encodeURIComponent(search)}`) });
  const saveSim = useMutation({
    mutationFn: (values: SimFormValues) => authenticatedRequest<SimRow>(selectedSimId ? `/sims/${selectedSimId}` : '/sims', {
      method: selectedSimId ? 'PATCH' : 'POST',
      body: JSON.stringify(cleanPayload(values)),
    }),
    onSuccess: async () => {
      setSelectedSimId(null);
      setForm(emptySimForm);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['sims'] });
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : 'SIM could not be saved.'),
  });

  function updateField<K extends keyof SimFormValues>(field: K, value: SimFormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editSim(sim: SimRow) {
    if (!canUpdate) {
      return;
    }

    setSelectedSimId(sim.id);
    setForm(toSimForm(sim));
    setFormError(null);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><h2 className="text-lg font-semibold">SIM Cards</h2><p className="text-sm text-muted-foreground">Manage carrier inventory, package renewal, credentials, and recharge history.</p></div>
        <input className={`${textInputClass} w-full max-w-sm`} placeholder="Filter SIMs" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      {canCreate || selectedSimId ? (
        <form
          className="rounded-lg border border-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveSim.mutate(form);
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{selectedSimId ? 'Edit SIM' : 'Add SIM'}</h3>
            {selectedSimId ? <button className={secondaryButtonClass} type="button" onClick={() => { setSelectedSimId(null); setForm(emptySimForm); }}>Cancel edit</button> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input className={textInputClass} placeholder="Phone number" required value={form.phoneNumber} onChange={(event) => updateField('phoneNumber', event.target.value)} />
            <input className={textInputClass} placeholder="ICCID" required value={form.iccid} onChange={(event) => updateField('iccid', event.target.value)} />
            <input className={textInputClass} placeholder="IMSI" value={form.imsi} onChange={(event) => updateField('imsi', event.target.value)} />
            <select className={textInputClass} value={form.carrier} onChange={(event) => updateField('carrier', event.target.value)}>
              {['VODAFONE', 'ORANGE', 'ETISALAT', 'WE'].map((carrier) => <option key={carrier} value={carrier}>{carrier}</option>)}
            </select>
            <input className={textInputClass} placeholder="Package type" value={form.packageType} onChange={(event) => updateField('packageType', event.target.value)} />
            <input className={textInputClass} type="date" value={form.packageRenewalDate} onChange={(event) => updateField('packageRenewalDate', event.target.value)} />
            <input className={textInputClass} placeholder="Main controlling number" value={form.mainControllingNumber} onChange={(event) => updateField('mainControllingNumber', event.target.value)} />
            <input className={textInputClass} placeholder="APN" value={form.apn} onChange={(event) => updateField('apn', event.target.value)} />
            <input className={textInputClass} placeholder="Asset tag" value={form.assetTag} onChange={(event) => updateField('assetTag', event.target.value)} />
            <input className={textInputClass} placeholder="QR code" value={form.qrCodeIdentifier} onChange={(event) => updateField('qrCodeIdentifier', event.target.value)} />
            <input className={textInputClass} placeholder="Encrypted credentials input" value={form.credentials} onChange={(event) => updateField('credentials', event.target.value)} />
            <input className={textInputClass} placeholder="Notes" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
          </div>
          {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}
          <button className={`${buttonClass} mt-4`} disabled={saveSim.isPending || (!selectedSimId && !canCreate)} type="submit">
            {saveSim.isPending ? 'Saving...' : selectedSimId ? 'Save changes' : 'Create SIM'}
          </button>
        </form>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="px-4 py-3">SIM</th><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Package</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td className="px-4 py-4" colSpan={5}>Loading SIMs...</td></tr> : data?.items.map((sim) => (
              <tr className="border-t border-border" key={sim.id}>
                <td className="px-4 py-3"><div className="font-medium">{sim.phoneNumber}</div><div className="text-muted-foreground">{sim.carrier} · {sim.iccid}</div></td>
                <td className="px-4 py-3"><div>{sim.assetTag ?? 'No asset tag'}</div><div className="text-muted-foreground">{sim.qrCodeIdentifier ?? 'No QR'}</div></td>
                <td className="px-4 py-3"><div>{sim.packageType ?? '-'}</div><div className="text-muted-foreground">{sim.packageRenewalDate ? new Date(sim.packageRenewalDate).toLocaleDateString() : 'No renewal date'}</div></td>
                <td className="px-4 py-3"><InventoryStatusBadge status={sim.status} /></td>
                <td className="px-4 py-3">{canUpdate ? <button className={secondaryButtonClass} type="button" onClick={() => editSim(sim)}>Edit</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
