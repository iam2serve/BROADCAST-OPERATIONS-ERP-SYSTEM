import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { QueryProvider } from '@/src/providers/query-provider';
import { AuthProvider } from '@/src/features/auth/auth-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'Broadcast Operations ERP',
  description: 'Enterprise broadcast operations management platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
