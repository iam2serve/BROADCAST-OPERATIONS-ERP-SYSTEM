export function InventoryStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'AVAILABLE'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'MAINTENANCE'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : status === 'LOST' || status === 'RETIRED'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-slate-200 bg-slate-50 text-slate-700';

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${tone}`}>{status}</span>;
}

export function TelemetryIndicator({ lastSeenAt }: { lastSeenAt?: string | null | undefined }) {
  return (
    <span className="text-xs text-muted-foreground">
      {lastSeenAt ? `Seen ${new Date(lastSeenAt).toLocaleString()}` : 'No telemetry'}
    </span>
  );
}
