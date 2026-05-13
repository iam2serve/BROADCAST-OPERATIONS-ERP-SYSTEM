'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authenticatedRequest } from '../auth/lib/authenticated-request';

type NotificationRow = { id: string; title: string; body: string; type: string; isRead: boolean; priority: string; deliveryStatus: string; createdAt: string };

export function NotificationsCenter() {
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => authenticatedRequest<{ items: NotificationRow[] }>('/notifications') });
  const markRead = useMutation({
    mutationFn: (id: string) => authenticatedRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-semibold">Notifications</h2><p className="text-sm text-muted-foreground">In-app delivery, future email/push channels, retry tracking, and read state.</p></div>
      <div className="space-y-3">
        {notifications.data?.items.map((item) => (
          <button className="w-full rounded-lg border border-border p-4 text-left text-sm" key={item.id} onClick={() => markRead.mutate(item.id)}>
            <div className="flex items-center justify-between gap-3"><span className="font-medium">{item.title}</span><span className="rounded-full bg-muted px-2 py-1 text-xs">{item.priority}</span></div>
            <p className="mt-1 text-muted-foreground">{item.body}</p>
            <div className="mt-2 text-xs text-muted-foreground">{item.type} · {item.deliveryStatus} · {item.isRead ? 'Read' : 'Unread'}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
