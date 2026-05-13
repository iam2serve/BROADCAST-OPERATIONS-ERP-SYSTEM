const statusClass: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PLANNED: 'bg-sky-100 text-sky-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-neutral-100 text-neutral-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

export function EventStatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass[status] ?? statusClass.DRAFT}`}>{status}</span>;
}

export function ConflictBadge({ available }: { available: boolean }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${available ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
      {available ? 'Available' : 'Conflict'}
    </span>
  );
}
