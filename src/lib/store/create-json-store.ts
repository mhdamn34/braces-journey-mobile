import { File, Paths } from 'expo-file-system';

export type JsonStore<T> = {
  get(): T;
  set(next: T): void;
  update(fn: (current: T) => T): void;
  subscribe(listener: () => void): () => void;
  whenReady(): Promise<void>;
};

const WRITE_DELAY_MS = 300;
const MAX_WRITE_ATTEMPTS = 3;

type PersistErrorListener = (fileName: string) => void;
const persistErrorListeners = new Set<PersistErrorListener>();

export function onPersistError(listener: PersistErrorListener): () => void {
  persistErrorListeners.add(listener);
  return () => persistErrorListeners.delete(listener);
}

export function createJsonStore<T>(fileName: string, initial: T): JsonStore<T> {
  const file = new File(Paths.document, fileName);
  const listeners = new Set<() => void>();
  let state = initial;
  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  let failedAttempts = 0;

  // Hydration is synchronous with the modern expo-file-system API.
  // Corrupt or unreadable files fall back to `initial` — never crash on launch.
  try {
    if (file.exists) state = JSON.parse(file.textSync()) as T;
  } catch {
    state = initial;
  }

  function scheduleWrite() {
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      writeTimer = null;
      try {
        file.write(JSON.stringify(state));
        failedAttempts = 0;
      } catch {
        failedAttempts += 1;
        if (failedAttempts < MAX_WRITE_ATTEMPTS) {
          scheduleWrite();
        } else {
          persistErrorListeners.forEach((l) => l(fileName));
        }
      }
    }, WRITE_DELAY_MS);
  }

  function set(next: T) {
    state = next;
    failedAttempts = 0;
    listeners.forEach((l) => l());
    scheduleWrite();
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
