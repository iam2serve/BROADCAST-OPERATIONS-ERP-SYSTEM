import type { ApiResponse } from '@broadcast/types';

import { getApiUrl, refreshSession } from './auth-api';
import { readAccessToken } from './token-storage';

export async function authenticatedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = readAccessToken();
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshSession();

    if (refreshed) {
      return authenticatedRequest<T>(path, init);
    }
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (!payload.success) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}
