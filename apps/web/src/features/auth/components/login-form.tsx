'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '../auth-provider';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setError(null);

    try {
      await auth.login(values.email, values.password);
      router.replace('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed.');
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          id="email"
          type="email"
          autoComplete="email"
          {...form.register('email')}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        disabled={form.formState.isSubmitting}
        type="submit"
      >
        {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
