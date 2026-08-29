import { createJsonStore, type JsonStore } from '@/lib/store/create-json-store';

export type ApiStore<T> = JsonStore<T> & { refresh(): Promise<boolean> };

type Registered = { refresh(): Promise<boolean>; reset(): void };
const registry = new Set<Registered>();

type RefreshErrorListener = (fileName: string) => void;
const refreshErrorListeners = new Set<RefreshErrorListener>();

export function onRefreshError(listener: RefreshErrorListener): () => void {
  refreshErrorListeners.add(listener);
  return () => refreshErrorListeners.delete(listener);
}

/** JsonStore semantics (sync reads from the cache file) plus a background
 * refresh. Writes stay API-first in the feature mutation functions: call the
 * API, then `store.update(...)` with the mapped result. `fetchRemote` gets
 * the current state so device-local fields (e.g. Profile.onboardedAt) can be
 * merged through a refresh. */
export function createApiStore<T>(
  fileName: string,
  initial: T,
  fetchRemote: (current: T) => Promise<T>,
): ApiStore<T> {
  const cache = createJsonStore<T>(fileName, initial);
  let ready = false;
  let resolveReady: () => void = () => undefined;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  async function refresh(): Promise<boolean> {
    try {
      const next = await fetchRemote(cache.get());
      cache.set(next);
      return true;
    } catch {
      refreshErrorListeners.forEach((l) => l(fileName));
      return false;
    } finally {
      if (!ready) {
        ready = true;
        resolveReady();
      }
    }
  }

  const store: ApiStore<T> = {
    get: cache.get,
    set: cache.set,
    update: cache.update,
    subscribe: cache.subscribe,
    whenReady: () => readyPromise,
    refresh,
  };

  registry.add({ refresh, reset: () => cache.set(initial) });
  return store;
}

export async function refreshAllApiStores(): Promise<void> {
  await Promise.all([...registry].map((entry) => entry.refresh()));
}

/** Logout: wipe every cache back to its initial value. */
export function resetAllApiStores(): void {
  registry.forEach((entry) => entry.reset());
}
