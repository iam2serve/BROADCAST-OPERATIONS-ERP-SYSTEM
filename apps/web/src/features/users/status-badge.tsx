export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'ACTIVE'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'SUSPENDED'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${tone}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
