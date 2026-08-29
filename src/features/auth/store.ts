import { onUnauthorized, setTokenProvider } from '@/lib/api/client';
import { cachedToken, clearToken, loadToken } from '@/lib/api/token';
import type { JsonStore } from '@/lib/store/create-json-store';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';
export type AuthState = { status: AuthStatus };

/** In-memory store with the JsonStore shape — the secure token is the only
 * durable auth fact, so this never touches a file. */
function createMemoryStore<T>(initial: T): JsonStore<T> {
  const listeners = new Set<() => void>();
  let state = initial;
  function set(next: T) {
    state = next;
    listeners.forEach((l) => l());
  }
  return {
    get: () => state,
    set,
    update: (fn) => set(fn(state)),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    whenReady: () => Promise.resolve(),
  };
}

export const authStore = createMemoryStore<AuthState>({ status: 'loading' });

export function signedIn(): void {
  authStore.set({ status: 'signedIn' });
}

export async function signOutLocally(): Promise<void> {
  await clearToken();
  authStore.set({ status: 'signedOut' });
}

let initialized = false;

export async function initAuth(): Promise<void> {
  if (initialized) return;
  initialized = true;
  setTokenProvider(cachedToken);
  onUnauthorized(() => {
    void signOutLocally();
  });
  const token = await loadToken();
  authStore.set({ status: token ? 'signedIn' : 'signedOut' });
}

// Test-only reset function
export function __resetAuthForTesting(): void {
  initialized = false;
}
