'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(12),
});

type Values = z.infer<typeof schema>;

function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;
  }

  return 'http://api:4000/api/v1';
}

export function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: searchParams.get('token') ?? '',
      password: '',
    },
  });

  async function onSubmit(values: Values): Promise<void> {
    setError(null);
    const response = await fetch(`${getApiUrl()}/users/accept-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const payload = await response.json() as { success: boolean; error?: { message: string } };

    if (!payload.success) {
      setError(payload.error?.message ?? 'Invitation could not be accepted.');
      return;
    }

    router.replace('/login');
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="token">Invitation token</label>
        <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" id="token" {...form.register('token')} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">Password</label>
        <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" id="password" type="password" {...form.register('password')} />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground" type="submit">
        Accept invitation
      </button>
    </form>
  );
}
