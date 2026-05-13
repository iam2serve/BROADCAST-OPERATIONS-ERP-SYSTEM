'use client';

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import type { AuthUser } from '@broadcast/types';

import { clearTokens } from './lib/token-storage';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, refreshSession } from './lib/auth-api';

type AuthState = {
  user: AuthUser | null;
  permissions: string[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession(): Promise<void> {
      try {
        const currentUser = await getCurrentUser();

        if (currentUser) {
          if (isMounted) {
            setUser(currentUser);
          }
          return;
        }

        const refreshed = await refreshSession();

        if (isMounted) {
          setUser(refreshed?.user ?? null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const permissions = useMemo(
    () => user?.role.permissions.map((rolePermission) => rolePermission.permission.key) ?? [],
    [user],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      permissions,
      isLoading,
      login: async (email: string, password: string) => {
        const result = await loginRequest(email, password);
        setUser(result.user);
      },
      logout: async () => {
        await logoutRequest().catch(() => undefined);
        clearTokens();
        setUser(null);
      },
    }),
    [isLoading, permissions, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
