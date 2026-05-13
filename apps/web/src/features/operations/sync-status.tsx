'use client';

import { useQuery } from '@tanstack/react-query';

import { authenticatedRequest } from '../auth/lib/authenticated-request';

type Conflict = { id: string; entityType: string; entityId: string; status: string; createdAt: string };

export function SyncStatus() {
  const conflicts = useQuery({ queryKey: ['sync-conflicts'], queryFn: () => authenticatedRequest<Conflict[]>('/sync/conflicts') });
  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold">Sync</h2><p className="text-sm text-muted-foreground">Offline mutation status and conflict review foundation.</p></div>
      <div className="overflow-hidden rounded-lg border border-border"><table className="w-full text-sm"><tbody>{conflicts.data?.map((conflict) => <tr className="border-t border-border" key={conflict.id}><td className="px-4 py-3">{conflict.entityType}</td><td>{conflict.entityId}</td><td>{conflict.status}</td><td>{new Date(conflict.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>
    </section>
  );
}
