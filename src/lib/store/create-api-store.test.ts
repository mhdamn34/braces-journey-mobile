const mockFiles = new Map<string, string>();
const mockBrokenFiles = new Set<string>();

jest.mock('expo-file-system', () => ({
  Paths: { document: '/docs' },
  File: class MockFile {
    uri: string;
    constructor(...segments: unknown[]) {
      this.uri = segments
        .map((s) => (typeof s === 'string' ? s : (s as { uri: string }).uri))
        .join('/');
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    textSync() {
      return mockFiles.get(this.uri)!;
    }
    write(content: string) {
      if (mockBrokenFiles.has(this.uri)) throw new Error('disk full');
      mockFiles.set(this.uri, content);
    }
  },
}));

import {
  createApiStore,
  onRefreshError,
  refreshAllApiStores,
  resetAllApiStores,
} from '@/lib/store/create-api-store';

beforeEach(() => {
  mockFiles.clear();
  mockBrokenFiles.clear();
});

test('hydrates synchronously and refresh replaces state from the remote', async () => {
  const store = createApiStore<string[]>('t1.json', [], () => Promise.resolve(['a', 'b']));
  expect(store.get()).toEqual([]);
  const ok = await store.refresh();
  expect(ok).toBe(true);
  expect(store.get()).toEqual(['a', 'b']);
});

test('refresh failure keeps the cache, notifies listeners, resolves whenReady', async () => {
  const errors: string[] = [];
  const off = onRefreshError((f) => errors.push(f));
  const store = createApiStore<string[]>('t2.json', ['cached'], () =>
    Promise.reject(new Error('offline')),
  );
  const ok = await store.refresh();
  expect(ok).toBe(false);
  expect(store.get()).toEqual(['cached']);
  expect(errors).toEqual(['t2.json']);
  await expect(store.whenReady()).resolves.toBeUndefined();
  off();
});

test('fetchRemote receives current state (local-only fields survive a refresh)', async () => {
  type P = { server: string; localOnly?: string };
  const store = createApiStore<P>('t3.json', { server: '' }, (current) =>
    Promise.resolve({ ...current, server: 'fresh' }),
  );
  store.update((p) => ({ ...p, localOnly: 'keep' }));
  await store.refresh();
  expect(store.get()).toEqual({ server: 'fresh', localOnly: 'keep' });
});

test('subscribers fire on refresh', async () => {
  const store = createApiStore<number[]>('t4.json', [], () => Promise.resolve([1]));
  const listener = jest.fn();
  store.subscribe(listener);
  await store.refresh();
  expect(listener).toHaveBeenCalled();
});

test('refreshAllApiStores refreshes every registered store; resetAllApiStores restores initials', async () => {
  const a = createApiStore<string[]>('t5.json', [], () => Promise.resolve(['x']));
  const b = createApiStore<string[]>('t6.json', [], () => Promise.resolve(['y']));
  await refreshAllApiStores();
  expect(a.get()).toEqual(['x']);
  expect(b.get()).toEqual(['y']);
  resetAllApiStores();
  expect(a.get()).toEqual([]);
  expect(b.get()).toEqual([]);
});
