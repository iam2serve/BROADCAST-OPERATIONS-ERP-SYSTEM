const accessTokenKey = 'broadcast.accessToken';
const refreshTokenKey = 'broadcast.refreshToken';

export function readAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(accessTokenKey);
}

export function readRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(refreshTokenKey);
}

export function saveTokens(tokens: { accessToken: string; refreshToken: string }): void {
  window.localStorage.setItem(accessTokenKey, tokens.accessToken);
  window.localStorage.setItem(refreshTokenKey, tokens.refreshToken);
}

export function clearTokens(): void {
  window.localStorage.removeItem(accessTokenKey);
  window.localStorage.removeItem(refreshTokenKey);
}
