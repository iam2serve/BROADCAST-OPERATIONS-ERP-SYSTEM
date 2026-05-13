'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { AppNavigation } from '@/src/components/layout/app-navigation';
import { useAuth } from './auth-provider';

export function ProtectedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.replace('/login');
    }
  }, [auth.isLoading, auth.user, router]);

  if (auth.isLoading) {
    return <main className="grid min-h-screen place-items-center">Loading session...</main>;
  }

  if (!auth.user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppNavigation permissions={auth.permissions} />
      <div className="min-w-0 flex-1">
        <header className="border-b border-border px-6 py-4">
          <h1 className="text-base font-semibold">Operations Workspace</h1>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
