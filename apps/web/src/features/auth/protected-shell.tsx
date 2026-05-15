'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { LogOut } from 'lucide-react';

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
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h1 className="text-base font-semibold">Operations Workspace</h1>
            <p className="text-sm text-muted-foreground">{auth.user.fullName}</p>
          </div>
          <button
            aria-label="Sign out"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => void auth.logout().then(() => router.replace('/login'))}
            type="button"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
