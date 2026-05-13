import type { ApiResponse, AuthUser, LoginResponse } from '@broadcast/types';

import { readAccessToken, readRefreshToken, saveTokens } from './token-storage';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!payload.success) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const result = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  saveTokens(result.tokens);
  return result;
}

export async function refreshSession(): Promise<LoginResponse | null> {
  const refreshToken = readRefreshToken();

  if (!refreshToken) {
    return null;
  }

  const result = await request<LoginResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  saveTokens(result.tokens);
  return result;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const accessToken = readAccessToken();

  if (!accessToken) {
    return null;
  }

  return request<AuthUser | null>('/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function logout(): Promise<void> {
  const accessToken = readAccessToken();

  if (!accessToken) {
    return;
  }

  await request('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });
}
