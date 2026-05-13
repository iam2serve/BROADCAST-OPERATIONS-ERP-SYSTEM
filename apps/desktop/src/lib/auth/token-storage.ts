import { Store } from '@tauri-apps/plugin-store';

import type { TokenPair } from '@broadcast/auth';

const tokenStorePath = 'auth.tokens.json';
const tokenKey = 'token_pair';

let storePromise: Promise<Store> | undefined;

async function getStore(): Promise<Store> {
  storePromise ??= Store.load(tokenStorePath);
  return storePromise;
}

export async function saveTokenPair(tokens: TokenPair): Promise<void> {
  const store = await getStore();
  await store.set(tokenKey, tokens);
  await store.save();
}

export async function readTokenPair(): Promise<TokenPair | null> {
  const store = await getStore();
  return (await store.get<TokenPair>(tokenKey)) ?? null;
}

export async function clearTokenPair(): Promise<void> {
  const store = await getStore();
  await store.delete(tokenKey);
  await store.save();
}
