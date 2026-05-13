'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { authenticatedRequest } from '../auth/lib/authenticated-request';
import { ConflictBadge, EventStatusBadge } from './event-status';

type EventRow = {
  id: string;
  name: string;
  clientName: string;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  eventColor?: string | null;
  eventTag?: string | null;
  cooldownBeforeMinutes: number;
  cooldownAfterMinutes: number;
  estimatedCrewSize?: number | null;
  _count?: { operators: number; devices: number; sims: number; routers: number };
};

type TimelineRow = {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  actorUser?: { fullName: string; email: string } | null;
};

type AvailabilityPreview = {
  available: boolean;
  conflicts: Array<{ type: string; eventId?: string; startsAt?: string; endsAt?: string; reason?: string }>;
};

export function EventsManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState({ resourceType: 'DEVICE', resourceId: '' });

  const events = useQuery({
    queryKey: ['events', search],
    queryFn: () => authenticatedRequest<{ items: EventRow[] }>(`/events?search=${encodeURIComponent(search)}`),
  });

  const selectedEvent = useMemo(() => events.data?.items.find((event) => event.id === selectedEventId) ?? events.data?.items[0] ?? null, [events.data?.items, selectedEventId]);

  const timeline = useQuery({
    queryKey: ['event-timeline', selectedEvent?.id],
    enabled: Boolean(selectedEvent?.id),
    queryFn: () => authenticatedRequest<TimelineRow[]>(`/events/${selectedEvent?.id}/timeline`),
  });

  const availability = useQuery({
    queryKey: ['availability-preview', selectedEvent?.id, assignment.resourceType, assignment.resourceId],
    enabled: Boolean(selectedEvent?.id && assignment.resourceId),
    queryFn: () =>
      authenticatedRequest<AvailabilityPreview>('/availability/conflict-preview', {
        method: 'POST',
        body: JSON.stringify({
          eventId: selectedEvent?.id,
          resourceType: assignment.resourceType,
          resourceId: assignment.resourceId,
          startsAt: selectedEvent?.startsAt,
          endsAt: selectedEvent?.endsAt,
        }),
      }),
  });

  const assign = useMutation({
    mutationFn: () => {
      const pathByType: Record<string, string> = { OPERATOR: 'operators', DEVICE: 'devices', SIM: 'sims', ROUTER: 'routers' };
      return authenticatedRequest(`/events/${selectedEvent?.id}/assignments/${pathByType[assignment.resourceType]}`, {
        method: 'POST',
        body: JSON.stringify({ resourceId: assignment.resourceId }),
      });
    },
    onSuccess: async () => {
      setAssignment((current) => ({ ...current, resourceId: '' }));
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.invalidateQueries({ queryKey: ['event-timeline', selectedEvent?.id] });
    },
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Events</h2>
          <p className="text-sm text-muted-foreground">Schedule broadcasts, reserve resources, and trace operational changes.</p>
        </div>
        <input className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Search events" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Resources</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody>
                {events.isLoading ? <tr><td className="px-4 py-4" colSpan={4}>Loading events...</td></tr> : events.data?.items.map((event) => (
                  <tr className={`cursor-pointer border-t border-border ${selectedEvent?.id === event.id ? 'bg-muted/60' : ''}`} key={event.id} onClick={() => setSelectedEventId(event.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: event.eventColor ?? '#64748b' }} /><span className="font-medium">{event.name}</span></div>
                      <div className="text-muted-foreground">{event.clientName} · {event.location ?? 'No location'}</div>
                    </td>
                    <td className="px-4 py-3"><div>{new Date(event.startsAt).toLocaleString()}</div><div className="text-muted-foreground">{new Date(event.endsAt).toLocaleString()}</div></td>
                    <td className="px-4 py-3 text-muted-foreground">Ops {event._count?.operators ?? 0} · Dev {event._count?.devices ?? 0} · SIM {event._count?.sims ?? 0} · Routers {event._count?.routers ?? 0}</td>
                    <td className="px-4 py-3"><EventStatusBadge status={event.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">Calendar Foundation</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {events.data?.items.slice(0, 9).map((event) => (
                <button className="rounded-md border border-border p-3 text-left text-sm" key={event.id} onClick={() => setSelectedEventId(event.id)}>
                  <div className="font-medium">{event.name}</div>
                  <div className="text-muted-foreground">{new Date(event.startsAt).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">Assignment</h3>
            <div className="mt-3 space-y-3">
              <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={assignment.resourceType} onChange={(event) => setAssignment({ resourceType: event.target.value, resourceId: '' })}>
                <option value="OPERATOR">Operator</option>
                <option value="DEVICE">Device</option>
                <option value="SIM">SIM</option>
                <option value="ROUTER">Router</option>
              </select>
              <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Resource ID" value={assignment.resourceId} onChange={(event) => setAssignment((current) => ({ ...current, resourceId: event.target.value }))} />
              <div className="flex items-center justify-between text-sm">
                {availability.data ? <ConflictBadge available={availability.data.available} /> : <span className="text-muted-foreground">Enter a resource ID to preview conflicts</span>}
                <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50" disabled={!selectedEvent || !assignment.resourceId || availability.data?.available === false || assign.isPending} onClick={() => assign.mutate()}>
                  Assign
                </button>
              </div>
              {availability.data?.conflicts.map((conflict, index) => (
                <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900" key={`${conflict.type}-${index}`}>{conflict.type}: {conflict.reason ?? conflict.eventId ?? 'schedule overlap'}</div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">Timeline</h3>
            <div className="mt-3 space-y-3">
              {timeline.data?.length ? timeline.data.map((item) => (
                <div className="border-l-2 border-border pl-3 text-sm" key={item.id}>
                  <div className="font-medium">{item.message}</div>
                  <div className="text-xs text-muted-foreground">{item.actorUser?.fullName ?? 'System'} · {new Date(item.createdAt).toLocaleString()}</div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No timeline entries yet.</p>}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
