'use client';

import Link from 'next/link';
import { Activity, CalendarDays, CreditCard, RadioTower, ShieldCheck, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/src/features/auth/auth-provider';
import { getApiUrl } from '@/src/features/auth/lib/auth-api';
import type { ApiResponse } from '@broadcast/types';

type HealthLive = {
  status: string;
  service: string;
  time: string;
};

const quickLinks = [
  { href: '/events', label: 'Events', description: 'Schedule and operational timeline', icon: CalendarDays },
  { href: '/devices', label: 'Inventory', description: 'Devices, SIM cards, and routers', icon: RadioTower },
  { href: '/users', label: 'Users', description: 'Identity, access, and invitations', icon: Users },
  { href: '/finance', label: 'Finance', description: 'Ledger, expenses, and profitability', icon: CreditCard },
];

export default function DashboardPage() {
  const auth = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['api-health-live'],
    queryFn: async () => {
      const response = await fetch(`${getApiUrl()}/health/live`, { cache: 'no-store' });
      const payload = (await response.json()) as ApiResponse<HealthLive>;

      if (!payload.success) {
        throw new Error(payload.error.message);
      }

      return payload.data;
    },
  });

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Broadcast Operations ERP</p>
              <h2 className="mt-2 text-2xl font-semibold">Welcome, {auth.user?.fullName}</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Your production foundation is active. Authentication, protected routing, API connectivity,
                and role-aware navigation are ready for the operational modules.
              </p>
            </div>
            <ShieldCheck className="h-8 w-8 shrink-0 text-primary" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <Activity className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">API status</p>
              <p className="text-lg font-semibold">{isLoading ? 'Checking' : data?.status ?? 'Unavailable'}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {data?.time ? `Last response: ${new Date(data.time).toLocaleString()}` : 'Waiting for health response'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="rounded-lg border border-border bg-background p-5 transition hover:border-primary hover:bg-muted"
              href={item.href}
              key={item.href}
            >
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{item.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
