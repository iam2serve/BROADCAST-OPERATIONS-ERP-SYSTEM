import { Suspense } from 'react';

import { AcceptInviteForm } from '@/src/features/users/accept-invite-form';

export default function AcceptInvitePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-background p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold text-primary">Broadcast Operations ERP</p>
          <h1 className="mt-2 text-2xl font-semibold">Accept invitation</h1>
        </div>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading invitation...</p>}>
          <AcceptInviteForm />
        </Suspense>
      </section>
    </main>
  );
}
