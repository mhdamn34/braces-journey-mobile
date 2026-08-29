import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'api_token';
let cached: string | null = null;

/** Synchronous read of the in-memory copy; loadToken() fills it at startup. */
export function cachedToken(): string | null {
  return cached;
}

export async function loadToken(): Promise<string | null> {
  cached = await SecureStore.getItemAsync(TOKEN_KEY);
  return cached;
}

export async function saveToken(token: string): Promise<void> {
  cached = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  cached = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Test-only reset function
export function __resetTokenForTesting(): void {
  cached = null;
}
