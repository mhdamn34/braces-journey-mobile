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

import { createJsonStore, onPersistError } from '@/lib/store/create-json-store';

beforeEach(() => {
  mockFiles.clear();
  mockBrokenFiles.clear();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('createJsonStore', () => {
  it('starts from initial when no file exists', () => {
    const store = createJsonStore('a.json', { n: 1 });
    expect(store.get()).toEqual({ n: 1 });
  });

  it('hydrates from an existing file', () => {
    mockFiles.set('/docs/b.json', JSON.stringify({ n: 42 }));
    const store = createJsonStore('b.json', { n: 1 });
    expect(store.get()).toEqual({ n: 42 });
  });

  it('falls back to initial on corrupt JSON', () => {
    mockFiles.set('/docs/c.json', '{not json');
    const store = createJsonStore('c.json', { n: 1 });
    expect(store.get()).toEqual({ n: 1 });
  });

  it('set() notifies subscribers immediately and persists after debounce', () => {
    const store = createJsonStore('d.json', { n: 1 });
    const seen: number[] = [];
    store.subscribe(() => seen.push(store.get().n));
    store.set({ n: 2 });
    expect(seen).toEqual([2]);
    expect(mockFiles.has('/docs/d.json')).toBe(false); // not yet written
    jest.advanceTimersByTime(300);
    expect(JSON.parse(mockFiles.get('/docs/d.json')!)).toEqual({ n: 2 });
  });

  it('update() applies a function and coalesces writes', () => {
    const store = createJsonStore('e.json', { n: 1 });
    store.update((s) => ({ n: s.n + 1 }));
    store.update((s) => ({ n: s.n + 1 }));
    jest.advanceTimersByTime(300);
    expect(JSON.parse(mockFiles.get('/docs/e.json')!)).toEqual({ n: 3 });
  });

  it('unsubscribe stops notifications', () => {
    const store = createJsonStore('f.json', { n: 1 });
    const listener = jest.fn();
    const off = store.subscribe(listener);
    off();
    store.set({ n: 2 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('retries failed writes up to 3 times, then reports', () => {
    const store = createJsonStore('g.json', { n: 1 });
    const errors: string[] = [];
    onPersistError((f) => errors.push(f));
    mockBrokenFiles.add('/docs/g.json');
    store.set({ n: 2 });
    jest.advanceTimersByTime(300 * 5);
    expect(errors).toEqual(['g.json']);
    mockBrokenFiles.delete('/docs/g.json');
    store.set({ n: 3 }); // recovery: a new set() writes again
    jest.advanceTimersByTime(300);
    expect(JSON.parse(mockFiles.get('/docs/g.json')!)).toEqual({ n: 3 });
  });

  it('whenReady resolves', async () => {
    jest.useRealTimers();
    const store = createJsonStore('h.json', { n: 1 });
    await expect(store.whenReady()).resolves.toBeUndefined();
  });
});
