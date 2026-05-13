import { LoginForm } from '@/src/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-background p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold text-primary">Broadcast Operations ERP</p>
          <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
