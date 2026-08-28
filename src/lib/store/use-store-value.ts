import { useSyncExternalStore } from 'react';

import type { JsonStore } from '@/lib/store/create-json-store';

export function useStoreValue<T>(store: JsonStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
