# API Consumption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the v3 app from fully on-device to server-backed against `braces-journey-be`'s `/api/mobile/v1` (Sanctum), with cached offline reads, online writes, auth screens, and a one-time migration of existing local data.

**Architecture:** Every feature keeps its store module and the synchronous `JsonStore<T>` contract; `createJsonStore` cache files become API caches behind a new `createApiStore` factory (hydrate from cache → background refresh → API-first writes). Auth is a token gate ahead of the existing onboarding gate. Photos upload as resized multipart and are cached locally so the flipbook stays offline-capable.

**Tech Stack:** Expo SDK 56 / RN 0.85 / React 19 / expo-router / jest-expo. New deps: `expo-secure-store`, `expo-image-manipulator` (both need AGENTS.md reasons — added in their tasks).

**Spec:** `docs/superpowers/specs/2026-08-29-api-consumption-design.md`

## Global Constraints

- All colours/type/spacing from `src/theme/tokens.ts`; no hex in screens. Icons via `@/components/icon`. Currency via `@/lib/format-currency`. Dates are ISO `YYYY-MM-DD` strings everywhere inside the app — the API boundary (`src/lib/api/` + per-feature `api.ts`) is the ONLY place ISO datetimes are split/joined.
- Components ≤ ~150 lines, one per file. Route files compose; only stores and `photo-files.ts` (and now `src/lib/api/`) touch persistence/network.
- Tests: `npm test` (jest-expo). Pure logic (api client, mappers, stores, migration engine) is unit-tested; screens are verified by `npm run typecheck` + existing suite staying green (repo convention: screens verified in the iOS simulator).
- Never place `*.test.*` files under `src/app/` without remembering metro's blockList already excludes them from bundling (it does — no action needed, just don't rename the pattern).
- IDs are opaque strings in the app; server integer IDs are `String()`ed at the boundary.
- The app NEVER sends `type` on visits, never sends `orthodontist_name`; `Profile.onboardedAt` stays device-local.
- API error contract: non-2xx bodies are `{ message: string, code?: string, errors?: Record<string, string[]> }`; 401 anywhere → token cleared → welcome screen.
- Commit per task with the message given in the task; stage explicit paths only.
- After each task: `npm run typecheck` and `npm test` must pass.

## API contract crib (repeated inside tasks where needed)

Base URL + `/api/mobile/v1`. Auth: `Authorization: Bearer <token>`.
- `POST /auth/register {name,email,password,device_name}` / `POST /auth/login {email,password,device_name}` → `{token, user:{id,name,email,created_at}}`; `POST /auth/logout`; `GET /auth/me`.
- `GET/PUT /profile` → `{data:{name, clinic_name, orthodontist_name, treatment_start_date, planned_months, braces_type}}` (braces_type in app vocabulary already).
- `GET /journey-entries?page=N` → `{data:[{id, month_number, photo_date, bracket_color_name, bracket_color_hex, notes, appointment_id, photo_url, created_at}], meta:{current_page,last_page}}` (50/page). `POST /journey-entries` multipart (photo optional). `PATCH/DELETE /journey-entries/{id}`. `GET /photos/{id}` streams bytes (auth required). 403 quota: `{code:"photo_quota_exceeded"}`.
- `GET /visits?page=N` → paginated `{data:[{id,title,appointment_date,type,status,doctor_name,clinic_name,cost,currency,notes,created_at}], meta}`; `POST/PATCH/DELETE /visits...`. Status enum: scheduled|completed|cancelled|missed. `appointment_date` returns ISO8601 (`2026-09-10T14:30:00+00:00`); send it as `"YYYY-MM-DD HH:MM:00"`.
- `GET /payments` (NOT paginated) → `{data:[{id,amount,currency,method,paid_at,notes,created_at}], summary:{plan_total,total_paid,remaining}}`; `POST /payments {amount,method?,paid_at,notes?}` → `{data:{...}}`; `DELETE /payments/{id}`; `PUT /payments/plan-total {total_cost}`.

---

### Task 1: API config + fetch client

**Files:**
- Create: `src/lib/api/config.ts`
- Create: `src/lib/api/client.ts`
- Create: `src/lib/api/client.test.ts`
- Create: `.env.example`
- Modify: `eas.json` (env blocks)

**Interfaces:**
- Consumes: nothing.
- Produces: `apiBaseUrl(): string`; `class ApiError extends Error { status: number; code?: string; fieldErrors?: Record<string, string[]> }` (status 0 = network failure, code `'network'`); `apiRequest<T>(method: string, path: string, options?: { body?: unknown; formData?: FormData }): Promise<T>`; `setTokenProvider(fn: () => string | null): void`; `onUnauthorized(listener: () => void): () => void`. Every later task calls `apiRequest`.

- [ ] **Step 1: Write the failing tests**

`src/lib/api/client.test.ts`:

```ts
import { ApiError, apiRequest, onUnauthorized, setTokenProvider } from '@/lib/api/client';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  setTokenProvider(() => null);
});

test('GET builds the versioned URL and parses JSON', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { data: { ok: true } }));
  const result = await apiRequest<{ data: { ok: boolean } }>('GET', '/profile');
  expect(result.data.ok).toBe(true);
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toMatch(/\/api\/mobile\/v1\/profile$/);
  expect((init.headers as Record<string, string>).Accept).toBe('application/json');
  expect(init.body).toBeUndefined();
});

test('sends bearer token and JSON body when provided', async () => {
  setTokenProvider(() => 'tok123');
  fetchMock.mockResolvedValue(jsonResponse(201, { data: {} }));
  await apiRequest('POST', '/visits', { body: { title: 'Adjustment' } });
  const [, init] = fetchMock.mock.calls[0];
  const headers = init.headers as Record<string, string>;
  expect(headers.Authorization).toBe('Bearer tok123');
  expect(headers['Content-Type']).toBe('application/json');
  expect(init.body).toBe(JSON.stringify({ title: 'Adjustment' }));
});

test('FormData body is passed through without a Content-Type header', async () => {
  fetchMock.mockResolvedValue(jsonResponse(201, { data: {} }));
  const form = new FormData();
  await apiRequest('POST', '/journey-entries', { formData: form });
  const [, init] = fetchMock.mock.calls[0];
  expect(init.body).toBe(form);
  expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
});

test('non-2xx throws ApiError with message, code and field errors', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(422, {
      message: 'Invalid.',
      errors: { month_number: ['An entry for this treatment month already exists.'] },
    }),
  );
  const error = await apiRequest('POST', '/journey-entries', { body: {} }).catch((e) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(422);
  expect(error.fieldErrors?.month_number[0]).toContain('already exists');
});

test('403 quota error carries its code', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(403, { message: 'Photo limit reached for your plan.', code: 'photo_quota_exceeded' }),
  );
  const error = await apiRequest('POST', '/journey-entries', { body: {} }).catch((e) => e);
  expect(error.code).toBe('photo_quota_exceeded');
});

test('401 notifies unauthorized listeners', async () => {
  const listener = jest.fn();
  const off = onUnauthorized(listener);
  fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Unauthenticated.' }));
  await apiRequest('GET', '/auth/me').catch(() => undefined);
  expect(listener).toHaveBeenCalledTimes(1);
  off();
});

test('network failure throws ApiError status 0 code network', async () => {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
  const error = await apiRequest('GET', '/profile').catch((e) => e);
  expect(error.status).toBe(0);
  expect(error.code).toBe('network');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/api/client.test.ts`
Expected: FAIL — module `@/lib/api/client` not found.

- [ ] **Step 3: Implement config + client**

`src/lib/api/config.ts`:

```ts
/** Build-time env (EXPO_PUBLIC_*) with the Herd dev URL as the fallback.
 * Android emulators cannot resolve .test hosts — override via
 * EXPO_PUBLIC_API_URL (see .env.example). */
export function apiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? 'https://braces-journey-be.test';
}
```

`src/lib/api/client.ts`:

```ts
import { apiBaseUrl } from '@/lib/api/config';

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  constructor(
    readonly status: number, // 0 = network failure
    message: string,
    readonly code?: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type TokenProvider = () => string | null;
let tokenProvider: TokenProvider = () => null;

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

const unauthorizedListeners = new Set<() => void>();

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export type RequestOptions = { body?: unknown; formData?: FormData };

export async function apiRequest<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenProvider();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: string | FormData | undefined;
  if (options.formData) {
    body = options.formData; // fetch sets the multipart boundary itself
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/mobile/v1${path}`, { method, headers, body });
  } catch {
    throw new ApiError(0, 'No connection — check your network and try again.', 'network');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const data = (payload ?? {}) as { message?: string; code?: string; errors?: FieldErrors };
    if (response.status === 401) unauthorizedListeners.forEach((l) => l());
    throw new ApiError(
      response.status,
      data.message ?? `Request failed (${response.status})`,
      data.code,
      data.errors,
    );
  }

  return payload as T;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/api/client.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Env plumbing**

`.env.example` (new):

```
# Build-time API base URL (see src/lib/api/config.ts).
# iOS simulator with Herd: https://braces-journey-be.test
# Android emulator: http://10.0.2.2:80 will NOT serve the Herd vhost — use your Mac's LAN IP
#   or `herd share`; the .test host only resolves on the Mac itself.
EXPO_PUBLIC_API_URL=https://braces-journey-be.test
```

`eas.json` — add `env` to each build profile (production intentionally points at the Herd URL until a real host exists; change it at deploy time):

```json
"development": {
  "developmentClient": true,
  "distribution": "internal",
  "env": { "EXPO_PUBLIC_API_URL": "https://braces-journey-be.test" }
},
"preview": {
  "distribution": "internal",
  "env": { "EXPO_PUBLIC_API_URL": "https://braces-journey-be.test" }
},
"production": {
  "autoIncrement": true,
  "env": { "EXPO_PUBLIC_API_URL": "https://braces-journey-be.test" }
}
```

- [ ] **Step 6: Typecheck + full suite, commit**

Run: `npm run typecheck && npm test`
Expected: green.

```bash
git add src/lib/api/config.ts src/lib/api/client.ts src/lib/api/client.test.ts .env.example eas.json
git commit -m "feat: API client — versioned fetch wrapper with typed errors and token hook"
```

---

### Task 2: Secure token storage + auth store

**Files:**
- Create: `src/lib/api/token.ts`
- Create: `src/features/auth/store.ts`
- Create: `src/features/auth/store.test.ts`
- Modify: `src/app/_layout.tsx` (call `initAuth()` once)
- Modify: `package.json` (dependency added via `npx expo install expo-secure-store`)

**Interfaces:**
- Consumes: `setTokenProvider`, `onUnauthorized` from Task 1.
- Produces: `cachedToken(): string | null`, `saveToken(token): Promise<void>`, `clearToken(): Promise<void>`, `loadToken(): Promise<string | null>` (module cache so reads are sync); `authStore: JsonStore<AuthState>` with `AuthState = { status: 'loading' | 'signedOut' | 'signedIn' }` (in-memory, NOT file-persisted — the token is the durable fact); `initAuth(): Promise<void>`; `signedIn(): void`; `signOutLocally(): Promise<void>`.

- [ ] **Step 1: Install the dependency**

Run: `npx expo install expo-secure-store`
Then add to `AGENTS.md` under the dependency rule (single line in the Rules section, after the "New dependencies" sentence):

```
  - `expo-secure-store` — Sanctum API token storage; Keychain/Keystore, never a JSON file.
```

- [ ] **Step 2: Write the failing tests**

`src/features/auth/store.test.ts`:

```ts
const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
  setItemAsync: jest.fn((k: string, v: string) => {
    store[k] = v;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((k: string) => {
    delete store[k];
    return Promise.resolve();
  }),
}));

import { cachedToken, loadToken, saveToken } from '@/lib/api/token';
import { authStore, initAuth, signOutLocally, signedIn } from '@/features/auth/store';

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

test('initAuth without a stored token lands signedOut', async () => {
  await initAuth();
  expect(authStore.get().status).toBe('signedOut');
  expect(cachedToken()).toBeNull();
});

test('initAuth with a stored token lands signedIn and caches it', async () => {
  store.api_token = 'tok456';
  await initAuth();
  expect(authStore.get().status).toBe('signedIn');
  expect(cachedToken()).toBe('tok456');
});

test('saveToken + signedIn transitions the store and caches synchronously', async () => {
  await initAuth();
  await saveToken('fresh');
  signedIn();
  expect(cachedToken()).toBe('fresh');
  expect(authStore.get().status).toBe('signedIn');
});

test('signOutLocally clears token and store', async () => {
  store.api_token = 'tok';
  await initAuth();
  await signOutLocally();
  expect(cachedToken()).toBeNull();
  expect(authStore.get().status).toBe('signedOut');
  expect(await loadToken()).toBeNull();
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/features/auth/store.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement token + auth store**

`src/lib/api/token.ts`:

```ts
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
```

`src/features/auth/store.ts`:

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/features/auth/store.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Wire initAuth into the root layout**

In `src/app/_layout.tsx`, add the import and a one-time call (top-level module scope is fine and mirrors how stores hydrate; place it with the other imports and before the component):

```ts
import { initAuth } from '@/features/auth/store';

void initAuth();
```

- [ ] **Step 7: Typecheck + full suite, commit**

Run: `npm run typecheck && npm test`
Expected: green.

```bash
git add src/lib/api/token.ts src/features/auth/store.ts src/features/auth/store.test.ts src/app/_layout.tsx AGENTS.md package.json package-lock.json
git commit -m "feat: secure token storage and auth state store"
```

---

### Task 3: API-backed store factory

**Files:**
- Create: `src/lib/store/create-api-store.ts`
- Create: `src/lib/store/create-api-store.test.ts`

**Interfaces:**
- Consumes: `createJsonStore`, `JsonStore<T>` from `@/lib/store/create-json-store`.
- Produces: `type ApiStore<T> = JsonStore<T> & { refresh(): Promise<boolean> }`; `createApiStore<T>(fileName: string, initial: T, fetchRemote: (current: T) => Promise<T>): ApiStore<T>`; `refreshAllApiStores(): Promise<void>`; `resetAllApiStores(): void` (logout wipes caches to initial); `onRefreshError(listener: (fileName: string) => void): () => void`. Tasks 5–8 build every feature store on this.

- [ ] **Step 1: Write the failing tests**

`src/lib/store/create-api-store.test.ts` (mock expo-file-system the same way `create-json-store.test.ts` does — read that file first and mirror its mock exactly; the factory below reuses `createJsonStore`, so the same mock covers it):

```ts
// Mirror the expo-file-system mock from src/lib/store/create-json-store.test.ts verbatim here.

import {
  createApiStore,
  onRefreshError,
  refreshAllApiStores,
  resetAllApiStores,
} from '@/lib/store/create-api-store';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/store/create-api-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the factory**

`src/lib/store/create-api-store.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/store/create-api-store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck + full suite, commit**

Run: `npm run typecheck && npm test`
Expected: green.

```bash
git add src/lib/store/create-api-store.ts src/lib/store/create-api-store.test.ts
git commit -m "feat: API-backed store factory — cached reads, background refresh"
```

---

### Task 4: Auth endpoints, welcome/sign-in/create-account screens, gate, logout

**Files:**
- Create: `src/features/auth/api.ts`
- Create: `src/features/auth/api.test.ts`
- Create: `src/lib/use-async-action.ts`
- Create: `src/app/welcome.tsx`
- Create: `src/app/sign-in.tsx`
- Create: `src/app/create-account.tsx`
- Modify: `src/app/_layout.tsx` (register the three routes)
- Modify: `src/app/(tabs)/_layout.tsx` (token gate ahead of onboarding gate)
- Modify: `src/app/(tabs)/more.tsx` (Sign out row)

**Interfaces:**
- Consumes: Task 1 client, Task 2 token/auth store, Task 3 `resetAllApiStores`.
- Produces: `register(input: {name: string; email: string; password: string}): Promise<void>`; `login(input: {email: string; password: string}): Promise<void>`; `logout(): Promise<void>`; `useAsyncAction` hook (`{ run, pending, error, clearError }`); routes `/welcome`, `/sign-in`, `/create-account`. Task 12 later edits `sign-in.tsx`'s post-login routing (it routes to `/` for now).

- [ ] **Step 1: Write the failing tests**

`src/features/auth/api.test.ts`:

```ts
const secure: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((k: string) => Promise.resolve(secure[k] ?? null)),
  setItemAsync: jest.fn((k: string, v: string) => {
    secure[k] = v;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((k: string) => {
    delete secure[k];
    return Promise.resolve();
  }),
}));

import { login, logout, register } from '@/features/auth/api';
import { authStore } from '@/features/auth/store';
import { cachedToken } from '@/lib/api/token';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 300, status, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  Object.keys(secure).forEach((k) => delete secure[k]);
});

test('register posts credentials with a device name, stores the token, signs in', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(201, { token: 'tok-reg', user: { id: 1, name: 'Amin', email: 'a@b.c' } }),
  );
  await register({ name: 'Amin', email: 'a@b.c', password: 'secret123' });
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toMatch(/\/auth\/register$/);
  const body = JSON.parse(init.body as string);
  expect(body).toMatchObject({ name: 'Amin', email: 'a@b.c', password: 'secret123' });
  expect(typeof body.device_name).toBe('string');
  expect(body.device_name.length).toBeGreaterThan(0);
  expect(cachedToken()).toBe('tok-reg');
  expect(authStore.get().status).toBe('signedIn');
});

test('login stores the token and marks the profile onboarded', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(200, { token: 'tok-log', user: { id: 1, name: 'Amin', email: 'a@b.c' } }),
  );
  const { profileStore } = await import('@/features/profile/store');
  await login({ email: 'a@b.c', password: 'secret123' });
  expect(cachedToken()).toBe('tok-log');
  expect(authStore.get().status).toBe('signedIn');
  expect(profileStore.get().onboardedAt).toBeTruthy();
});

test('logout revokes the token remotely, clears local auth even if the call fails', async () => {
  secure.api_token = 'tok';
  fetchMock.mockRejectedValue(new TypeError('down'));
  await logout();
  expect(cachedToken()).toBeNull();
  expect(authStore.get().status).toBe('signedOut');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/auth/api.test.ts`
Expected: FAIL — `@/features/auth/api` not found.

- [ ] **Step 3: Implement the auth API and the async-action hook**

`src/features/auth/api.ts`:

```ts
import Constants from 'expo-constants';

import { signedIn, signOutLocally } from '@/features/auth/store';
import { profileStore } from '@/features/profile/store';
import { apiRequest } from '@/lib/api/client';
import { saveToken } from '@/lib/api/token';
import { resetAllApiStores } from '@/lib/store/create-api-store';

type AuthResponse = { token: string; user: { id: number; name: string; email: string } };

function deviceName(): string {
  return Constants.deviceName ?? 'Mobile Device';
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const res = await apiRequest<AuthResponse>('POST', '/auth/register', {
    body: { ...input, device_name: deviceName() },
  });
  await saveToken(res.token);
  signedIn();
}

export async function login(input: { email: string; password: string }): Promise<void> {
  const res = await apiRequest<AuthResponse>('POST', '/auth/login', {
    body: { ...input, device_name: deviceName() },
  });
  await saveToken(res.token);
  // An existing account has been through onboarding — never show the pager again.
  profileStore.update((p) => ({ ...p, onboardedAt: p.onboardedAt ?? new Date().toISOString() }));
  signedIn();
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('POST', '/auth/logout');
  } catch {
    // the token may already be dead — local sign-out proceeds regardless
  }
  await signOutLocally();
  resetAllApiStores();
}
```

`src/lib/use-async-action.ts`:

```ts
import { useState } from 'react';

import { ApiError } from '@/lib/api/client';

/** Wraps a write action with pending/error state. Keeps the user's input on
 * failure — callers only navigate away inside the action, after the await. */
export function useAsyncAction<A extends unknown[]>(action: (...args: A) => Promise<void>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(...args: A) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await action(...args);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return { run, pending, error, clearError: () => setError(null) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/auth/api.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Build the three screens**

`src/app/welcome.tsx`:

```tsx
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function WelcomeScreen() {
  const colors = useTheme();

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: Space.md }}>
        <Text style={[Type.display, { color: colors.textPrimary, textAlign: 'center' }]}>
          BracesJourney
        </Text>
        <Text style={[Type.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          One photo a month. Watch your smile move.
        </Text>
      </View>
      <View style={{ gap: Space.sm }}>
        <Button label="Create account" onPress={() => router.push('/create-account')} />
        <Button label="Sign in" variant="secondary" onPress={() => router.push('/sign-in')} />
      </View>
    </Screen>
  );
}
```

`src/app/sign-in.tsx`:

```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { login } from '@/features/auth/api';
import { refreshAllApiStores } from '@/lib/store/create-api-store';
import { useAsyncAction } from '@/lib/use-async-action';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function SignInScreen() {
  const colors = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { run, pending, error } = useAsyncAction(async () => {
    await login({ email: email.trim(), password });
    await refreshAllApiStores();
    router.replace('/');
  });

  const inputStyle = [
    Type.body,
    {
      color: colors.textPrimary,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.thumb,
      padding: Space.md,
      backgroundColor: colors.surface,
    },
  ];

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Sign in</Text>
      <Text style={[Type.label, { color: colors.textSecondary }]}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none"
        keyboardType="email-address" autoComplete="email" placeholder="you@example.com"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry
        autoComplete="password" placeholder="Your password"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      {error ? <Text style={[Type.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button
        label={pending ? 'Signing in…' : 'Sign in'}
        onPress={() => void run()}
        disabled={pending || !email.trim() || !password}
      />
    </Screen>
  );
}
```

`src/app/create-account.tsx`:

```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { register } from '@/features/auth/api';
import { useAsyncAction } from '@/lib/use-async-action';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function CreateAccountScreen() {
  const colors = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { run, pending, error } = useAsyncAction(async () => {
    await register({ name: name.trim(), email: email.trim(), password });
    router.replace('/onboarding');
  });

  const valid = name.trim().length > 0 && email.includes('@') && password.length >= 8;

  const inputStyle = [
    Type.body,
    {
      color: colors.textPrimary,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.thumb,
      padding: Space.md,
      backgroundColor: colors.surface,
    },
  ];

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Create account</Text>
      <Text style={[Type.label, { color: colors.textSecondary }]}>Your name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Your name"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none"
        keyboardType="email-address" autoComplete="email" placeholder="you@example.com"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry
        autoComplete="password-new" placeholder="At least 8 characters"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      {error ? <Text style={[Type.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button
        label={pending ? 'Creating…' : 'Create account'}
        onPress={() => void run()}
        disabled={pending || !valid}
      />
    </Screen>
  );
}
```

- [ ] **Step 6: Gate + routes + sign out**

`src/app/(tabs)/_layout.tsx` — add imports and replace the single onboarding gate:

```tsx
import { authStore } from '@/features/auth/store';
```

```tsx
  const auth = useStoreValue(authStore);
  const profile = useStoreValue(profileStore);

  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') return <Redirect href="/welcome" />;
  if (!profile.onboardedAt) return <Redirect href="/onboarding" />;
```

`src/app/_layout.tsx` — register the routes beside the existing `onboarding` entry (welcome gets gestures disabled like onboarding; sign-in / create-account are plain):

```tsx
<Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
<Stack.Screen name="sign-in" />
<Stack.Screen name="create-account" />
```

`src/app/(tabs)/more.tsx` — add a Sign out row after the Settings `ListRow` (imports: `Alert` from react-native, `logout` from `@/features/auth/api`):

```tsx
<ListRow
  title="Sign out"
  subtitle="Your data stays on the server"
  onPress={() =>
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ])
  }
/>
```

(No manual navigation after logout — the tab gate redirects to `/welcome` when the auth store flips.)

- [ ] **Step 7: Typecheck + full suite, commit**

Run: `npm run typecheck && npm test`
Expected: green. Note: `src/app/(tabs)/index.test.tsx` renders the Journey tab directly (not the layout), so the gate change doesn't affect it; if it fails, read the failure before touching anything.

```bash
git add src/features/auth/api.ts src/features/auth/api.test.ts src/lib/use-async-action.ts src/app/welcome.tsx src/app/sign-in.tsx src/app/create-account.tsx src/app/_layout.tsx "src/app/(tabs)/_layout.tsx" "src/app/(tabs)/more.tsx"
git commit -m "feat: auth — welcome/sign-in/create-account, token gate, sign out"
```

---

### Task 5: Profile feature on the API

**Files:**
- Create: `src/features/profile/api.ts`
- Create: `src/features/profile/api.test.ts`
- Modify: `src/features/profile/store.ts` (createApiStore)
- Modify: `src/app/onboarding.tsx` (final step PUTs the profile)
- Modify: `src/app/settings.tsx` (async save with pending/error)

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: `profileFromApi(data: ApiProfile, current: Profile): Profile`; `saveProfile(input: {name: string; clinicName: string; treatmentStartDate: string; plannedMonths: number; bracesType?: BracesType}): Promise<void>` (PUTs then updates the store); `profileStore` is now an `ApiStore<Profile>` (same import path/name). `Profile.onboardedAt` survives refreshes (device-local).

- [ ] **Step 1: Write the failing tests**

`src/features/profile/api.test.ts`:

```ts
const secure: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

import { profileFromApi, saveProfile } from '@/features/profile/api';
import { profileStore } from '@/features/profile/store';
import { DEFAULT_PROFILE } from '@/features/profile/store';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 300, status, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => fetchMock.mockReset());

test('profileFromApi maps snake_case, nulls, and preserves device-local fields', () => {
  const current = { ...DEFAULT_PROFILE, onboardedAt: '2026-01-01T00:00:00.000Z' };
  const mapped = profileFromApi(
    {
      name: 'Amin',
      clinic_name: null,
      orthodontist_name: 'Dr. Tan',
      treatment_start_date: '2026-02-01',
      planned_months: 18,
      braces_type: 'self-ligating',
    },
    current,
  );
  expect(mapped).toMatchObject({
    name: 'Amin',
    clinicName: '',
    treatmentStartDate: '2026-02-01',
    plannedMonths: 18,
    bracesType: 'self-ligating',
    onboardedAt: '2026-01-01T00:00:00.000Z',
  });
});

test('profileFromApi falls back to current values when the server has none', () => {
  const current = { ...DEFAULT_PROFILE, treatmentStartDate: '2026-03-01', plannedMonths: 30 };
  const mapped = profileFromApi(
    {
      name: '',
      clinic_name: null,
      orthodontist_name: null,
      treatment_start_date: null,
      planned_months: null,
      braces_type: null,
    },
    current,
  );
  expect(mapped.treatmentStartDate).toBe('2026-03-01');
  expect(mapped.plannedMonths).toBe(30);
  expect(mapped.bracesType).toBeUndefined();
});

test('saveProfile PUTs app fields as snake_case and updates the store from the response', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(200, {
      data: {
        name: 'Aminuddin',
        clinic_name: 'Smile Studio',
        orthodontist_name: null,
        treatment_start_date: '2026-02-15',
        planned_months: 18,
        braces_type: 'metal',
      },
    }),
  );
  await saveProfile({
    name: 'Aminuddin',
    clinicName: 'Smile Studio',
    treatmentStartDate: '2026-02-15',
    plannedMonths: 18,
    bracesType: 'metal',
  });
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toMatch(/\/profile$/);
  expect(init.method).toBe('PUT');
  expect(JSON.parse(init.body as string)).toEqual({
    name: 'Aminuddin',
    clinic_name: 'Smile Studio',
    treatment_start_date: '2026-02-15',
    planned_months: 18,
    braces_type: 'metal',
  });
  expect(profileStore.get().name).toBe('Aminuddin');
  expect(profileStore.get().bracesType).toBe('metal');
});

test('saveProfile omits braces_type when unset (server keeps its value)', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(200, {
      data: {
        name: 'A',
        clinic_name: null,
        orthodontist_name: null,
        treatment_start_date: '2026-02-15',
        planned_months: 24,
        braces_type: 'metal',
      },
    }),
  );
  await saveProfile({
    name: 'A',
    clinicName: '',
    treatmentStartDate: '2026-02-15',
    plannedMonths: 24,
    bracesType: undefined,
  });
  const [, init] = fetchMock.mock.calls[0];
  expect(JSON.parse(init.body as string)).not.toHaveProperty('braces_type');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/profile/api.test.ts`
Expected: FAIL — `@/features/profile/api` not found.

- [ ] **Step 3: Implement mapper + saveProfile + store swap**

`src/features/profile/api.ts`:

```ts
import { profileStore } from '@/features/profile/store';
import type { BracesType, Profile } from '@/features/profile/types';
import { apiRequest } from '@/lib/api/client';

export type ApiProfile = {
  name: string;
  clinic_name: string | null;
  orthodontist_name: string | null;
  treatment_start_date: string | null;
  planned_months: number | null;
  braces_type: BracesType | null;
};

/** Server fields win; device-local fields (onboardedAt) and anything the
 * server has no value for fall back to `current`. */
export function profileFromApi(data: ApiProfile, current: Profile): Profile {
  return {
    ...current,
    name: data.name ?? '',
    clinicName: data.clinic_name ?? '',
    treatmentStartDate: data.treatment_start_date ?? current.treatmentStartDate,
    plannedMonths: data.planned_months ?? current.plannedMonths,
    bracesType: data.braces_type ?? undefined,
  };
}

export async function fetchProfile(current: Profile): Promise<Profile> {
  const res = await apiRequest<{ data: ApiProfile }>('GET', '/profile');
  return profileFromApi(res.data, current);
}

export async function saveProfile(input: {
  name: string;
  clinicName: string;
  treatmentStartDate: string;
  plannedMonths: number;
  bracesType?: BracesType;
}): Promise<void> {
  const body: Record<string, unknown> = {
    name: input.name,
    clinic_name: input.clinicName || null,
    treatment_start_date: input.treatmentStartDate,
    planned_months: input.plannedMonths,
  };
  if (input.bracesType) body.braces_type = input.bracesType;
  const res = await apiRequest<{ data: ApiProfile }>('PUT', '/profile', { body });
  profileStore.update((p) => profileFromApi(res.data, p));
}
```

`src/features/profile/store.ts` — replace the `createJsonStore` call (imports change accordingly; `DEFAULT_PROFILE` stays exported):

```ts
import { fetchProfile } from '@/features/profile/api';
import type { Profile } from '@/features/profile/types';
import { todayIso } from '@/lib/dates';
import { createApiStore } from '@/lib/store/create-api-store';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  clinicName: '',
  treatmentStartDate: todayIso(),
  plannedMonths: 24,
};

export const profileStore = createApiStore<Profile>('profile.json', DEFAULT_PROFILE, fetchProfile);
```

IMPORTANT — circular import check: `profile/api.ts` imports `profileStore` from `profile/store.ts`, and `store.ts` imports `fetchProfile` from `api.ts`. ES modules tolerate this cycle because `api.ts` only dereferences `profileStore` inside function bodies (never at module top level) — keep it that way. If jest reports an undefined import, move the `saveProfile` store update to a lazy `require`-free form by importing the store inside the function via a top-level `import` and accessing it only at call time (which is what the code above already does).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/profile/api.test.ts src/features/auth/api.test.ts`
Expected: PASS (auth test 'login marks profile onboarded' still green — profileStore now API-backed but update() is synchronous either way).

- [ ] **Step 5: Onboarding PUTs the profile**

In `src/app/onboarding.tsx`: add imports `saveProfile` from `@/features/profile/api`, `useAsyncAction` from `@/lib/use-async-action`. Replace `saveProfile`/`finish`/`finishToImport` with an async action (the local `saveProfile()` function is renamed away — the API one takes its name):

```tsx
  const { run: finishRun, pending, error } = useAsyncAction(async (thenImport: boolean) => {
    await saveProfile({
      name: name.trim(),
      clinicName: clinicName.trim(),
      treatmentStartDate: startDate,
      plannedMonths,
      bracesType,
    });
    profileStore.update((p) => ({ ...p, onboardedAt: new Date().toISOString() }));
    router.replace('/');
    if (thenImport) router.push('/import-photos');
  });

  function finish() {
    void finishRun(false);
  }

  function finishToImport() {
    void finishRun(true);
  }
```

Render the error just above the step components (after the Back link), and pass nothing else down — the steps call `finish`/`finishToImport` via existing props:

```tsx
      {error ? <Text style={[Type.caption, { color: colors.danger }]}>{error}</Text> : null}
```

(While `pending`, the DetailsStep/HistoryStep buttons stay tappable but `useAsyncAction.run` ignores re-entry — acceptable; do not modify the step components.)

- [ ] **Step 6: Settings saves through the API**

In `src/app/settings.tsx`: import `saveProfile` from `@/features/profile/api` and `useAsyncAction`; replace the `save()` function and Button:

```tsx
  const { run: saveRun, pending, error } = useAsyncAction(async () => {
    await saveProfile({
      name: name.trim(),
      clinicName: clinicName.trim(),
      treatmentStartDate: startDate,
      plannedMonths,
      bracesType,
    });
    router.back();
  });
```

```tsx
      {error ? <Text style={[Type.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button
        label={pending ? 'Saving…' : 'Save changes'}
        onPress={() => void saveRun()}
        disabled={!dirty || !dateValid || pending}
      />
```

- [ ] **Step 7: Typecheck + full suite, commit**

Run: `npm run typecheck && npm test`
Expected: green.

```bash
git add src/features/profile/api.ts src/features/profile/api.test.ts src/features/profile/store.ts src/app/onboarding.tsx src/app/settings.tsx
git commit -m "feat: profile served by the API — onboarding and settings save remotely"
```

---

### Task 6: Visits feature on the API

**Files:**
- Create: `src/lib/api/pagination.ts`
- Create: `src/lib/api/pagination.test.ts`
- Create: `src/features/visits/api.ts`
- Create: `src/features/visits/api.test.ts`
- Modify: `src/features/visits/store.ts` (createApiStore + async mutations)
- Modify: `src/app/visits/new.tsx` (async save)
- Modify: `src/app/visits/[id].tsx` (async update/delete — read the file first, apply the pattern below to each mutation call site)

**Interfaces:**
- Consumes: Tasks 1, 3.
- Produces: `fetchAllPages<T>(path: string): Promise<T[]>`; `visitFromApi(v: ApiVisit): Visit`; `visitToApi(v: {title;date;time;location;notes?;status})`; async `addVisit(input: Omit<Visit, 'id'>): Promise<Visit>` (returns the created visit — the migration engine needs its server id), `updateVisit(id: string, patch: Partial<Omit<Visit, 'id'>>): Promise<void>`, `deleteVisit(id: string): Promise<void>` (same names/import path as today — call sites change from sync to awaited). `visitsStore` is now `ApiStore<Visit[]>`.

- [ ] **Step 1: Write the failing tests**

`src/lib/api/pagination.test.ts`:

```ts
import { fetchAllPages } from '@/lib/api/pagination';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function page(current: number, last: number, data: unknown[]) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data, meta: { current_page: current, last_page: last } }),
  } as Response;
}

test('walks every page and concatenates data', async () => {
  fetchMock.mockReset();
  fetchMock
    .mockResolvedValueOnce(page(1, 3, [1, 2]))
    .mockResolvedValueOnce(page(2, 3, [3]))
    .mockResolvedValueOnce(page(3, 3, [4]));
  const all = await fetchAllPages<number>('/visits');
  expect(all).toEqual([1, 2, 3, 4]);
  expect(String(fetchMock.mock.calls[0][0])).toContain('/visits?page=1');
  expect(String(fetchMock.mock.calls[2][0])).toContain('/visits?page=3');
});

test('single page returns immediately', async () => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce(page(1, 1, ['only']));
  await expect(fetchAllPages('/journey-entries')).resolves.toEqual(['only']);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
```

`src/features/visits/api.test.ts`:

```ts
import { visitFromApi, visitToApi } from '@/features/visits/api';

test('visitFromApi splits the ISO datetime, maps status and clinic', () => {
  expect(
    visitFromApi({
      id: 12,
      title: 'Adjustment',
      appointment_date: '2026-09-10T14:30:00+00:00',
      type: null,
      status: 'scheduled',
      doctor_name: null,
      clinic_name: 'Ortho Care',
      cost: null,
      currency: 'MYR',
      notes: null,
      created_at: '2026-08-29T00:00:00+00:00',
    }),
  ).toEqual({
    id: '12',
    title: 'Adjustment',
    date: '2026-09-10',
    time: '14:30',
    location: 'Ortho Care',
    notes: undefined,
    status: 'upcoming',
  });
});

test('status maps both ways: scheduled↔upcoming, cancelled reads as missed', () => {
  const base = {
    id: 1, title: 't', appointment_date: '2026-01-01T09:00:00+00:00', type: null,
    doctor_name: null, clinic_name: null, cost: null, currency: 'MYR', notes: null,
    created_at: null,
  };
  expect(visitFromApi({ ...base, status: 'completed' }).status).toBe('completed');
  expect(visitFromApi({ ...base, status: 'missed' }).status).toBe('missed');
  expect(visitFromApi({ ...base, status: 'cancelled' }).status).toBe('missed');
  expect(visitFromApi({ ...base, status: null }).status).toBe('upcoming');
});

test('visitToApi joins date+time, maps location and status, never sends type', () => {
  const body = visitToApi({
    title: 'Wire change',
    date: '2026-09-10',
    time: '14:30',
    location: 'Clinic',
    notes: undefined,
    status: 'upcoming',
  });
  expect(body).toEqual({
    title: 'Wire change',
    appointment_date: '2026-09-10 14:30:00',
    status: 'scheduled',
    clinic_name: 'Clinic',
    notes: null,
  });
  expect(body).not.toHaveProperty('type');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/api/pagination.test.ts src/features/visits/api.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement pagination + visit mappers**

`src/lib/api/pagination.ts`:

```ts
import { apiRequest } from '@/lib/api/client';

type Paginated<T> = { data: T[]; meta: { current_page: number; last_page: number } };

/** The app's derived logic (dueState etc.) needs full collections, so
 * paginated endpoints are always drained into the cache. */
export async function fetchAllPages<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  for (;;) {
    const res = await apiRequest<Paginated<T>>('GET', `${path}?page=${page}`);
    all.push(...res.data);
    if (res.meta.current_page >= res.meta.last_page) return all;
    page += 1;
  }
}
```

`src/features/visits/api.ts`:

```ts
import type { Visit, VisitStatus } from '@/features/visits/types';

export type ApiVisit = {
  id: number;
  title: string;
  appointment_date: string | null;
  type: string | null;
  status: string | null;
  doctor_name: string | null;
  clinic_name: string | null;
  cost: number | null;
  currency: string;
  notes: string | null;
  created_at: string | null;
};

function statusFromApi(status: string | null): VisitStatus {
  if (status === 'completed') return 'completed';
  // A cancelled appointment didn't happen — closest app concept is missed.
  if (status === 'missed' || status === 'cancelled') return 'missed';
  return 'upcoming';
}

function statusToApi(status: VisitStatus): string {
  return status === 'upcoming' ? 'scheduled' : status;
}

export function visitFromApi(v: ApiVisit): Visit {
  const [date = '', timePart = ''] = (v.appointment_date ?? '').split('T');
  return {
    id: String(v.id),
    title: v.title,
    date,
    time: timePart ? timePart.slice(0, 5) : '09:00',
    location: v.clinic_name ?? '',
    notes: v.notes ?? undefined,
    status: statusFromApi(v.status),
  };
}

export function visitToApi(v: {
  title: string;
  date: string;
  time: string;
  location: string;
  notes?: string;
  status: VisitStatus;
}): Record<string, unknown> {
  return {
    title: v.title,
    appointment_date: `${v.date} ${v.time}:00`,
    status: statusToApi(v.status),
    clinic_name: v.location,
    notes: v.notes ?? null,
  };
}
```

- [ ] **Step 4: Swap the store and make mutations async**

`src/features/visits/store.ts` (full replacement):

```ts
import { visitFromApi, visitToApi, type ApiVisit } from '@/features/visits/api';
import type { Visit } from '@/features/visits/types';
import { apiRequest } from '@/lib/api/client';
import { fetchAllPages } from '@/lib/api/pagination';
import { createApiStore } from '@/lib/store/create-api-store';

function sorted(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export const visitsStore = createApiStore<Visit[]>('visits.json', [], async () =>
  sorted((await fetchAllPages<ApiVisit>('/visits')).map(visitFromApi)),
);

export async function addVisit(input: Omit<Visit, 'id'>): Promise<Visit> {
  const res = await apiRequest<{ data: ApiVisit }>('POST', '/visits', { body: visitToApi(input) });
  const visit = visitFromApi(res.data);
  visitsStore.update((visits) => sorted([...visits, visit]));
  return visit;
}

export async function updateVisit(id: string, patch: Partial<Omit<Visit, 'id'>>): Promise<void> {
  const current = visitsStore.get().find((v) => v.id === id);
  if (!current) return;
  const next = { ...current, ...patch };
  const res = await apiRequest<{ data: ApiVisit }>(`PATCH`, `/visits/${id}`, {
    body: visitToApi(next),
  });
  const visit = visitFromApi(res.data);
  visitsStore.update((visits) => sorted(visits.map((v) => (v.id === id ? visit : v))));
}

export async function deleteVisit(id: string): Promise<void> {
  await apiRequest('DELETE', `/visits/${id}`);
  visitsStore.update((visits) => visits.filter((v) => v.id !== id));
}
```

- [ ] **Step 5: Screens await the mutations**

`src/app/visits/new.tsx` — import `useAsyncAction`; replace `save()` and the Button:

```tsx
  const { run: saveRun, pending, error } = useAsyncAction(async () => {
    await addVisit({
      title: title.trim(),
      date,
      time,
      location: location.trim() || 'Clinic',
      notes: notes.trim() || undefined,
      status: 'upcoming',
    });
    router.back();
  });
```

```tsx
      {error ? <Text style={[Type.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button label={pending ? 'Saving…' : 'Save visit'} onPress={() => void saveRun()} disabled={!valid || pending} />
```

`src/app/visits/[id].tsx` — read the file, then apply the same pattern to every `updateVisit`/`deleteVisit` call site: wrap each in a `useAsyncAction` (one per logical action — e.g. status change, delete), render `error` as a caption `Text` near the acting control, and gate the control on `pending`. Delete confirms via the existing Alert; the destructive handler becomes `onPress: () => void deleteRun()` where `deleteRun` awaits `deleteVisit(id)` then `router.back()`. Do not change layout or copy beyond adding the error caption and pending labels.

- [ ] **Step 6: Run tests, typecheck, commit**

Run: `npm test -- src/lib/api/pagination.test.ts src/features/visits/api.test.ts` then `npm run typecheck && npm test`
Expected: green.

```bash
git add src/lib/api/pagination.ts src/lib/api/pagination.test.ts src/features/visits/api.ts src/features/visits/api.test.ts src/features/visits/store.ts src/app/visits/new.tsx "src/app/visits/[id].tsx"
git commit -m "feat: visits served by the API — datetime split/join, status mapping, async saves"
```

---

### Task 7: Payments feature on the API

**Files:**
- Create: `src/features/payments/api.ts`
- Create: `src/features/payments/api.test.ts`
- Modify: `src/features/payments/store.ts` (createApiStore + async mutations)
- Modify: `src/app/payments.tsx` (async plan-total / add / delete)

**Interfaces:**
- Consumes: Tasks 1, 3.
- Produces: `paymentFromApi(p: ApiPayment): PaymentRecord`; `fetchPayments(): Promise<PaymentsState>`; async `setPlanTotal(planTotal: number): Promise<void>`, `addPayment(input: {date: string; amount: number; method?: PaymentMethod}): Promise<void>`, `deletePayment(id: string): Promise<void>` (same names/import path — call sites become awaited). `paymentsStore` is now `ApiStore<PaymentsState>`.
- Contract: `GET /payments` (NOT paginated) → `{data: ApiPayment[], summary: {plan_total: number|null, total_paid: number, remaining: number|null}}`; `POST /payments {amount, paid_at, method?}` → `{data: ApiPayment}`; `PUT /payments/plan-total {total_cost}` (field is `total_cost`, `present|nullable`); `DELETE /payments/{id}`. `ApiPayment = {id, amount: number, currency, method: string|null, paid_at: 'YYYY-MM-DD'|null, notes: string|null, created_at}`.

- [ ] **Step 1: Write the failing tests**

`src/features/payments/api.test.ts`:

```ts
import { fetchPayments, paymentFromApi } from '@/features/payments/api';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 300, status, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => fetchMock.mockReset());

test('paymentFromApi maps fields; unknown methods (transfer/other) drop to undefined', () => {
  expect(
    paymentFromApi({ id: 3, amount: 150, currency: 'MYR', method: 'qrpay', paid_at: '2026-08-20', notes: null, created_at: null }),
  ).toEqual({ id: '3', date: '2026-08-20', amount: 150, method: 'qrpay', note: undefined });
  expect(
    paymentFromApi({ id: 4, amount: 10, currency: 'MYR', method: 'transfer', paid_at: '2026-08-21', notes: 'dep', created_at: null }),
  ).toMatchObject({ method: undefined, note: 'dep' });
});

test('fetchPayments maps records (oldest first) and plan total from the summary', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(200, {
      data: [
        { id: 2, amount: 200, currency: 'MYR', method: 'cash', paid_at: '2026-08-02', notes: null, created_at: null },
        { id: 1, amount: 100, currency: 'MYR', method: null, paid_at: '2026-08-01', notes: null, created_at: null },
      ],
      summary: { plan_total: 8000, total_paid: 300, remaining: 7700 },
    }),
  );
  const state = await fetchPayments();
  expect(state.planTotal).toBe(8000);
  expect(state.records.map((r) => r.id)).toEqual(['1', '2']);
});

test('fetchPayments treats a null plan total as 0 (app semantics: unset)', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(200, { data: [], summary: { plan_total: null, total_paid: 0, remaining: null } }),
  );
  await expect(fetchPayments()).resolves.toEqual({ planTotal: 0, records: [] });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/payments/api.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement mapper + store swap**

`src/features/payments/api.ts`:

```ts
import type { PaymentMethod, PaymentRecord, PaymentsState } from '@/features/payments/types';
import { apiRequest } from '@/lib/api/client';

export type ApiPayment = {
  id: number;
  amount: number;
  currency: string;
  method: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string | null;
};

type PaymentsIndex = {
  data: ApiPayment[];
  summary: { plan_total: number | null; total_paid: number; remaining: number | null };
};

const APP_METHODS: PaymentMethod[] = ['cash', 'qrpay', 'card'];

export function paymentFromApi(p: ApiPayment): PaymentRecord {
  return {
    id: String(p.id),
    date: p.paid_at ?? '',
    amount: p.amount,
    // transfer/other exist server-side but not in the app's picker — shown methodless.
    method: APP_METHODS.includes(p.method as PaymentMethod) ? (p.method as PaymentMethod) : undefined,
    note: p.notes ?? undefined,
  };
}

export async function fetchPayments(): Promise<PaymentsState> {
  const res = await apiRequest<PaymentsIndex>('GET', '/payments');
  return {
    planTotal: res.summary.plan_total ?? 0,
    records: res.data.map(paymentFromApi).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
```

`src/features/payments/store.ts` (full replacement):

```ts
import { fetchPayments, paymentFromApi, type ApiPayment } from '@/features/payments/api';
import type { PaymentMethod, PaymentsState } from '@/features/payments/types';
import { apiRequest } from '@/lib/api/client';
import { createApiStore } from '@/lib/store/create-api-store';

export const paymentsStore = createApiStore<PaymentsState>(
  'payments.json',
  { planTotal: 0, records: [] },
  fetchPayments,
);

export async function setPlanTotal(planTotal: number): Promise<void> {
  await apiRequest('PUT', '/payments/plan-total', { body: { total_cost: planTotal } });
  paymentsStore.update((state) => ({ ...state, planTotal }));
}

export async function addPayment(input: {
  date: string;
  amount: number;
  method?: PaymentMethod;
}): Promise<void> {
  const body: Record<string, unknown> = { amount: input.amount, paid_at: input.date };
  if (input.method) body.method = input.method;
  const res = await apiRequest<{ data: ApiPayment }>('POST', '/payments', { body });
  paymentsStore.update((state) => ({
    ...state,
    records: [...state.records, paymentFromApi(res.data)].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  }));
}

export async function deletePayment(id: string): Promise<void> {
  await apiRequest('DELETE', `/payments/${id}`);
  paymentsStore.update((state) => ({
    ...state,
    records: state.records.filter((r) => r.id !== id),
  }));
}
```

- [ ] **Step 4: Screen awaits the mutations**

`src/app/payments.tsx` — import `useAsyncAction`; three actions:

```tsx
  const planTotalAction = useAsyncAction(async (value: number) => {
    await setPlanTotal(value);
    setEditingTotal(false);
  });
  const addAction = useAsyncAction(async () => {
    const value = Number(amount);
    await addPayment({ date: todayIso(), amount: value, method });
    setAmount('');
    setAdding(false);
  });
  const deleteAction = useAsyncAction(async (id: string) => {
    await deletePayment(id);
  });
```

Call sites (keep layout/copy identical otherwise):
- Empty state "Set plan total" button → `onPress={() => void planTotalAction.run(Number(totalDraft))}`, label `planTotalAction.pending ? 'Saving…' : 'Set plan total'`, disabled also on pending; render `planTotalAction.error` as a danger caption in the same Card.
- "Update plan total" button → same action; remove the inline `setEditingTotal(false)` (the action does it after success).
- `savePayment()` is replaced by `addAction` (`label={addAction.pending ? 'Saving…' : 'Save payment'}`, error caption in the Card).
- The remove Alert's destructive handler → `onPress: () => void deleteAction.run(record.id)`; render `deleteAction.error` as a caption above the records list.

- [ ] **Step 5: Run tests, typecheck, commit**

Run: `npm test -- src/features/payments/api.test.ts` then `npm run typecheck && npm test`
Expected: green.

```bash
git add src/features/payments/api.ts src/features/payments/api.test.ts src/features/payments/store.ts src/app/payments.tsx
git commit -m "feat: payments served by the API — summary-backed plan total, async records"
```

---

### Task 8: Journey read path — entries + photo cache from the API

**Files:**
- Create: `src/features/journey/api.ts`
- Create: `src/features/journey/api.test.ts`
- Create: `src/features/journey/photo-cache.ts`
- Modify: `src/features/journey/store.ts` (createApiStore; mutations move to Task 9 — this task keeps `addEntry`/`updateEntry`/`deleteEntry` compiling by re-exporting the local versions unchanged against the new store)

**Interfaces:**
- Consumes: Tasks 1–3, `fetchAllPages` (Task 6), `cachedToken` (Task 2).
- Produces: `type ApiJourneyEntry` (shape below); `entryFromApi(e: ApiJourneyEntry, photoUri: string | undefined): JourneyEntry`; `fetchEntries(): Promise<JourneyEntry[]>`; `cachedPhotoUri(entryId: string): string | undefined`; `ensurePhotoCached(entryId: string, url: string): Promise<string | undefined>`; `journeyStore` is `ApiStore<JourneyEntry[]>`. Task 9 and the migration engine build on these.
- Contract: `ApiJourneyEntry = { id: number; month_number: number; photo_date: 'YYYY-MM-DD'|null; bracket_color_name: string|null; bracket_color_hex: string|null; notes: string|null; appointment_id: number|null; photo_url: string|null; created_at: string|null }`. `photo_url` requires the bearer token. Downloaded photos get nominal 1200×1600 (capture is always 3:4; every consumer renders a fixed aspect ratio).

- [ ] **Step 1: Write the failing tests**

`src/features/journey/api.test.ts` (mapping only — the photo cache is exercised through mocked expo-file-system in the same style as `create-json-store.test.ts`; keep this file to the pure mapper):

```ts
import { entryFromApi } from '@/features/journey/api';

const base = {
  id: 9,
  month_number: 7,
  photo_date: '2026-08-25',
  bracket_color_name: 'Teal',
  bracket_color_hex: '#3FAE9D',
  notes: 'Gap closing',
  appointment_id: 4,
  photo_url: 'https://api.test/api/mobile/v1/photos/9',
  created_at: '2026-08-25T00:00:00+00:00',
};

test('entryFromApi maps every field and stringifies ids', () => {
  expect(entryFromApi(base, 'file:///photos/9.jpg')).toEqual({
    id: '9',
    monthNumber: 7,
    date: '2026-08-25',
    photo: {
      uri: 'file:///photos/9.jpg',
      width: 1200,
      height: 1600,
      capturedAt: '2026-08-25T12:00:00.000Z',
    },
    bracketColor: { name: 'Teal', hex: '#3FAE9D' },
    note: 'Gap closing',
    appointmentId: '4',
  });
});

test('entryFromApi handles note-only entries and missing colour/link', () => {
  expect(
    entryFromApi(
      { ...base, bracket_color_name: null, bracket_color_hex: null, notes: null, appointment_id: null, photo_url: null },
      undefined,
    ),
  ).toEqual({
    id: '9',
    monthNumber: 7,
    date: '2026-08-25',
    photo: undefined,
    bracketColor: undefined,
    note: undefined,
    appointmentId: undefined,
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/journey/api.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement photo cache + mapper + fetch**

`src/features/journey/photo-cache.ts`:

```ts
import { Directory, File, Paths } from 'expo-file-system';

import { cachedToken } from '@/lib/api/token';

/** Server-backed photos cached under the same <documentDirectory>/photos/
 * directory photo-files.ts owns, keyed `<entryId>.<ext>` — the flipbook,
 * ghost overlay, and compare keep working offline from these files. */

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create();
  return dir;
}

export function cachedPhotoUri(entryId: string): string | undefined {
  for (const ext of EXTENSIONS) {
    const file = new File(photosDir(), `${entryId}.${ext}`);
    if (file.exists) return file.uri;
  }
  return undefined;
}

async function downloadPhoto(entryId: string, url: string): Promise<string | undefined> {
  try {
    const token = cachedToken();
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return undefined;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const dest = new File(photosDir(), `${entryId}.jpg`);
    dest.write(bytes);
    return dest.uri;
  } catch {
    return undefined; // offline or stream error — entry renders photo-less until next refresh
  }
}

export async function ensurePhotoCached(entryId: string, url: string): Promise<string | undefined> {
  return cachedPhotoUri(entryId) ?? downloadPhoto(entryId, url);
}
```

`src/features/journey/api.ts`:

```ts
import { ensurePhotoCached } from '@/features/journey/photo-cache';
import type { JourneyEntry } from '@/features/journey/types';
import { fetchAllPages } from '@/lib/api/pagination';

export type ApiJourneyEntry = {
  id: number;
  month_number: number;
  photo_date: string | null;
  bracket_color_name: string | null;
  bracket_color_hex: string | null;
  notes: string | null;
  appointment_id: number | null;
  photo_url: string | null;
  created_at: string | null;
};

export function entryFromApi(e: ApiJourneyEntry, photoUri: string | undefined): JourneyEntry {
  const date = e.photo_date ?? '';
  return {
    id: String(e.id),
    monthNumber: e.month_number,
    date,
    photo: photoUri
      ? { uri: photoUri, width: 1200, height: 1600, capturedAt: `${date}T12:00:00.000Z` }
      : undefined,
    bracketColor:
      e.bracket_color_name && e.bracket_color_hex
        ? { name: e.bracket_color_name, hex: e.bracket_color_hex }
        : undefined,
    note: e.notes ?? undefined,
    appointmentId: e.appointment_id !== null ? String(e.appointment_id) : undefined,
  };
}

export async function fetchEntries(): Promise<JourneyEntry[]> {
  const rows = await fetchAllPages<ApiJourneyEntry>('/journey-entries');
  const entries = await Promise.all(
    rows.map(async (row) => {
      const uri = row.photo_url ? await ensurePhotoCached(String(row.id), row.photo_url) : undefined;
      return entryFromApi(row, uri);
    }),
  );
  return entries.sort((a, b) => a.monthNumber - b.monthNumber);
}
```

`src/features/journey/store.ts` — swap only the store construction in this task (mutations stay file-local and synchronous until Task 9; they keep compiling because the ApiStore has the same update/get):

```ts
import { fetchEntries } from '@/features/journey/api';
import { deletePhotoFile } from '@/features/capture/photo-files';
import type { JourneyEntry } from '@/features/journey/types';
import { createApiStore } from '@/lib/store/create-api-store';

export const journeyStore = createApiStore<JourneyEntry[]>('journey.json', [], fetchEntries);
```

(The existing `sorted`, `addEntry`, `updateEntry`, `deleteEntry`, `entriesWithPhotos` stay exactly as they are below the store for now.)

- [ ] **Step 4: Run tests, typecheck, commit**

Run: `npm test -- src/features/journey/api.test.ts` then `npm run typecheck && npm test`
Expected: green.

```bash
git add src/features/journey/api.ts src/features/journey/api.test.ts src/features/journey/photo-cache.ts src/features/journey/store.ts
git commit -m "feat: journey entries read from the API with an offline photo cache"
```

---

### Task 9: Journey write path — multipart create, explicit saves, delete

**Files:**
- Create: `src/features/capture/resize.ts`
- Modify: `src/features/journey/store.ts` (async `createEntry`/`updateEntry`/`deleteEntry`; `addEntry` removed)
- Create: `src/features/journey/store.test.ts`
- Modify: `src/app/review.tsx` (async save with quota UX)
- Modify: `src/app/entry/[id].tsx` (explicit note save; async colour/delete; no save-on-unmount)
- Modify: `src/app/import-photos.tsx` (minimal `addEntry` → `createEntry` conversion so the task compiles; Task 10 adds progress)
- Modify: `package.json` (`npx expo install expo-image-manipulator`) + `AGENTS.md` dep line

**Interfaces:**
- Consumes: Tasks 1–3, 8 (`entryFromApi`, `ApiJourneyEntry`), `persistPhotoFile`/`deletePhotoFile`.
- Produces: `resizeForUpload(uri: string): Promise<string>`; async `createEntry(input: {monthNumber: number; date: string; photoUri?: string; bracketColor?: BracketColor; note?: string; appointmentId?: string}): Promise<JourneyEntry>` (multipart when photoUri present); async `updateEntry(id: string, patch: {bracketColor?: BracketColor; note?: string; appointmentId?: string}): Promise<void>`; async `deleteEntry(id: string): Promise<void>`. `addEntry` no longer exists — Tasks 10/11 call `createEntry`. PATCH body fields: `bracket_color_name`, `bracket_color_hex`, `notes`, `appointment_id` (all `sometimes|nullable`).

- [ ] **Step 1: Install the dependency**

Run: `npx expo install expo-image-manipulator`
Add to `AGENTS.md` beside the expo-secure-store line:

```
  - `expo-image-manipulator` — resize/compress photos before multipart upload (server caps at 10 MB).
```

- [ ] **Step 2: Write the failing tests**

`src/features/journey/store.test.ts` (mock expo-file-system as in `create-json-store.test.ts`, mock `expo-image-manipulator` to return the input uri, mock `expo-secure-store` as in Task 2's test, and mock fetch):

```ts
// expo-file-system mock: mirror create-json-store.test.ts verbatim.
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri: string) => Promise.resolve({ uri })),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

import { createEntry, deleteEntry, journeyStore, updateEntry } from '@/features/journey/store';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 300, status, json: () => Promise.resolve(body) } as Response;
}

const apiEntry = {
  id: 21,
  month_number: 3,
  photo_date: '2026-08-01',
  bracket_color_name: null,
  bracket_color_hex: null,
  notes: 'note-only',
  appointment_id: null,
  photo_url: null,
  created_at: null,
};

beforeEach(() => {
  fetchMock.mockReset();
  journeyStore.set([]);
});

test('createEntry without a photo posts multipart fields and stores the mapped entry', async () => {
  fetchMock.mockResolvedValue(jsonResponse(201, { data: apiEntry }));
  const entry = await createEntry({ monthNumber: 3, date: '2026-08-01', note: 'note-only' });
  const [, init] = fetchMock.mock.calls[0];
  expect(init.method).toBe('POST');
  expect(init.body).toBeInstanceOf(FormData);
  expect(entry.id).toBe('21');
  expect(journeyStore.get()).toHaveLength(1);
  expect(journeyStore.get()[0].note).toBe('note-only');
});

test('createEntry keeps entries sorted by month', async () => {
  journeyStore.set([
    { id: '50', monthNumber: 5, date: '2026-05-01' },
  ]);
  fetchMock.mockResolvedValue(jsonResponse(201, { data: apiEntry }));
  await createEntry({ monthNumber: 3, date: '2026-08-01' });
  expect(journeyStore.get().map((e) => e.monthNumber)).toEqual([3, 5]);
});

test('updateEntry PATCHes mapped fields and replaces the entry, keeping the local photo uri', async () => {
  journeyStore.set([
    {
      id: '21', monthNumber: 3, date: '2026-08-01',
      photo: { uri: 'file:///photos/21.jpg', width: 1200, height: 1600, capturedAt: 'x' },
    },
  ]);
  fetchMock.mockResolvedValue(
    jsonResponse(200, { data: { ...apiEntry, notes: 'edited', photo_url: 'https://x/photos/21' } }),
  );
  await updateEntry('21', { note: 'edited' });
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toMatch(/\/journey-entries\/21$/);
  expect(init.method).toBe('PATCH');
  expect(JSON.parse(init.body as string)).toEqual({ notes: 'edited' });
  expect(journeyStore.get()[0].note).toBe('edited');
  expect(journeyStore.get()[0].photo?.uri).toBe('file:///photos/21.jpg');
});

test('deleteEntry DELETEs then removes the entry from the store', async () => {
  journeyStore.set([{ id: '21', monthNumber: 3, date: '2026-08-01' }]);
  fetchMock.mockResolvedValue(jsonResponse(200, { message: 'Journey entry deleted.' }));
  await deleteEntry('21');
  expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  expect(journeyStore.get()).toHaveLength(0);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/features/journey/store.test.ts`
Expected: FAIL — `createEntry` not exported.

- [ ] **Step 4: Implement resize + async mutations**

`src/features/capture/resize.ts`:

```ts
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';

/** ~1600px long edge JPEG keeps uploads well under the server's 10 MB cap
 * without visible loss at the app's display sizes. */
export async function resizeForUpload(uri: string): Promise<string> {
  const result = await manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.85,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}
```

`src/features/journey/store.ts` (full replacement):

```ts
import { deletePhotoFile, persistPhotoFile } from '@/features/capture/photo-files';
import { resizeForUpload } from '@/features/capture/resize';
import { entryFromApi, fetchEntries, type ApiJourneyEntry } from '@/features/journey/api';
import type { BracketColor, JourneyEntry } from '@/features/journey/types';
import { apiRequest } from '@/lib/api/client';
import { createApiStore } from '@/lib/store/create-api-store';

export const journeyStore = createApiStore<JourneyEntry[]>('journey.json', [], fetchEntries);

function sorted(entries: JourneyEntry[]): JourneyEntry[] {
  return [...entries].sort((a, b) => a.monthNumber - b.monthNumber);
}

export async function createEntry(input: {
  monthNumber: number;
  date: string;
  photoUri?: string;
  bracketColor?: BracketColor;
  note?: string;
  appointmentId?: string;
}): Promise<JourneyEntry> {
  const form = new FormData();
  form.append('photo_date', input.date);
  form.append('month_number', String(input.monthNumber));
  if (input.bracketColor) {
    form.append('bracket_color_name', input.bracketColor.name);
    form.append('bracket_color_hex', input.bracketColor.hex);
  }
  if (input.note) form.append('notes', input.note);
  if (input.appointmentId) form.append('appointment_id', input.appointmentId);

  let uploadUri: string | undefined;
  if (input.photoUri) {
    uploadUri = await resizeForUpload(input.photoUri);
    form.append('photo', {
      uri: uploadUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  const res = await apiRequest<{ data: ApiJourneyEntry }>('POST', '/journey-entries', {
    formData: form,
  });
  const id = String(res.data.id);
  const cachedUri = uploadUri ? persistPhotoFile(uploadUri, id) : undefined;
  const entry = entryFromApi(res.data, cachedUri);
  journeyStore.update((entries) => sorted([...entries, entry]));
  return entry;
}

export async function updateEntry(
  id: string,
  patch: { bracketColor?: BracketColor; note?: string; appointmentId?: string },
): Promise<void> {
  const body: Record<string, unknown> = {};
  if ('bracketColor' in patch) {
    body.bracket_color_name = patch.bracketColor?.name ?? null;
    body.bracket_color_hex = patch.bracketColor?.hex ?? null;
  }
  if ('note' in patch) body.notes = patch.note ?? null;
  if ('appointmentId' in patch) body.appointment_id = patch.appointmentId ?? null;

  const res = await apiRequest<{ data: ApiJourneyEntry }>('PATCH', `/journey-entries/${id}`, {
    body,
  });
  journeyStore.update((entries) =>
    sorted(
      entries.map((e) => (e.id === id ? entryFromApi(res.data, e.photo?.uri) : e)),
    ),
  );
}

/** Server first (source of truth), then the cache row, then best-effort file. */
export async function deleteEntry(id: string): Promise<void> {
  const entry = journeyStore.get().find((e) => e.id === id);
  await apiRequest('DELETE', `/journey-entries/${id}`);
  journeyStore.update((entries) => entries.filter((e) => e.id !== id));
  if (entry?.photo) deletePhotoFile(entry.photo.uri);
}

export function entriesWithPhotos(entries: JourneyEntry[]): JourneyEntry[] {
  return entries.filter((e) => e.photo);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/features/journey/store.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Review screen saves through the API**

`src/app/review.tsx` — import `createEntry` (replacing `addEntry`), `useAsyncAction`; drop `savedRef`; replace `save()`:

```tsx
  const { run: saveRun, pending, error } = useAsyncAction(async () => {
    await createEntry({
      monthNumber: month,
      date: today,
      photoUri: uri,
      bracketColor: color,
      note: note.trim() || undefined,
      appointmentId: linkableVisitId(entries, visits),
    });
    deletePhotoFile(uri); // best-effort cache cleanup
    router.dismissTo('/');
  });
```

Button + error (this screen renders dark — use `darkColors.danger`):

```tsx
      {error ? (
        <Text style={[Type.caption, { color: darkColors.danger }]}>{error}</Text>
      ) : null}
      <Button
        label={pending ? 'Saving…' : `Save Month ${month}`}
        onPress={() => void saveRun()}
        disabled={pending}
      />
```

(The 403 quota response surfaces here as its server message, "Photo limit reached for your plan." — no extra handling needed.)

- [ ] **Step 7: Entry detail — explicit save, async colour and delete**

`src/app/entry/[id].tsx`:
- DELETE the save-on-unmount effect (the `noteRef` + both `useEffect`s) and the `onEndEditing` prop.
- Add actions:

```tsx
  const noteAction = useAsyncAction(async () => {
    await updateEntry(entry!.id, { note: note.trim() || undefined });
  });
  const colorAction = useAsyncAction(async (bracketColor?: BracketColor) => {
    await updateEntry(entry!.id, { bracketColor });
  });
  const deleteAction = useAsyncAction(async () => {
    await deleteEntry(entry!.id);
    router.back();
  });
```

- `ColorSwatchPicker onChange={(bracketColor) => void colorAction.run(bracketColor)}`.
- Below the note input, a save control that only shows when the draft differs:

```tsx
      {note.trim() !== (entry.note ?? '') ? (
        <Button
          label={noteAction.pending ? 'Saving…' : 'Save note'}
          onPress={() => void noteAction.run()}
          disabled={noteAction.pending}
        />
      ) : null}
```

- Render `noteAction.error ?? colorAction.error ?? deleteAction.error` as a danger caption above the Delete button; the Alert's destructive handler becomes `onPress: () => void deleteAction.run()`. Import `useAsyncAction` and `BracketColor`.

- [ ] **Step 8: Minimal import-photos conversion (addEntry no longer exists)**

`src/app/import-photos.tsx` still imports `addEntry` — swap it for `createEntry` with the smallest change that compiles and works (Task 10 adds progress/retry on top). Replace `confirm()`:

```tsx
  const [uploading, setUploading] = useState(false);

  async function confirm() {
    setUploading(true);
    try {
      for (const row of rows) {
        const date = row.creationDateIso ?? addMonthsIso(profile.treatmentStartDate, row.month - 1);
        await createEntry({
          monthNumber: row.month,
          date,
          photoUri: row.uri,
          bracketColor: row.color,
          note: row.note.trim() || undefined,
        });
      }
      router.back();
    } finally {
      setUploading(false);
    }
  }
```

And gate the confirm Button on `uploading` (`disabled={uploading}`, label `uploading ? 'Adding…' : …existing label…`); change its `onPress` to `() => void confirm()`. (The `id`/`persistPhotoFile`/`capturedAt` lines from the old body are gone — `createEntry` owns all of that now; drop the unused `persistPhotoFile` import.)

- [ ] **Step 9: Typecheck + full suite, commit**

Run: `npm run typecheck && npm test`
Expected: green (`(tabs)/index.test.tsx` mocks stores at the seam; if it stubs `addEntry`, update the stub to `createEntry`).

```bash
git add src/features/capture/resize.ts src/features/journey/store.ts src/features/journey/store.test.ts src/app/review.tsx "src/app/entry/[id].tsx" src/app/import-photos.tsx package.json package-lock.json AGENTS.md
git commit -m "feat: journey writes through the API — resized multipart upload, explicit saves"
```

---

### Task 10: Import becomes a sequential upload with progress

**Files:**
- Modify: `src/app/import-photos.tsx`

**Interfaces:**
- Consumes: `createEntry` (Task 9), `ApiError` (Task 1).
- Produces: no new exports — screen behavior only. Rows upload one at a time; each row shows pending/done/failed; quota stops the run with a clear message; failed rows can be retried without re-uploading done rows.

- [ ] **Step 1: Rework the confirm flow**

In `src/app/import-photos.tsx`: replace the `addEntry` import with `createEntry`; import `ApiError` from `@/lib/api/client`. Extend `Row` and add upload state:

```tsx
type UploadState = 'pending' | 'uploading' | 'done' | 'failed';
```

```tsx
  const [uploading, setUploading] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, UploadState>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  function setStatus(uri: string, state: UploadState) {
    setStatuses((current) => ({ ...current, [uri]: state }));
  }

  async function confirm() {
    setUploading(true);
    setUploadError(null);
    let failures = 0;
    for (const row of rows) {
      if (statuses[row.uri] === 'done') continue;
      setStatus(row.uri, 'uploading');
      const date = row.creationDateIso ?? addMonthsIso(profile.treatmentStartDate, row.month - 1);
      try {
        await createEntry({
          monthNumber: row.month,
          date,
          photoUri: row.uri,
          bracketColor: row.color,
          note: row.note.trim() || undefined,
        });
        setStatus(row.uri, 'done');
      } catch (e) {
        setStatus(row.uri, 'failed');
        failures += 1;
        if (e instanceof ApiError && e.code === 'photo_quota_exceeded') {
          setUploadError('Free plan photo limit reached — the remaining photos were not added.');
          break;
        }
        setUploadError(e instanceof ApiError ? e.message : 'Some photos could not be added.');
      }
    }
    setUploading(false);
    if (failures === 0) router.back();
  }
```

- [ ] **Step 2: Row status + buttons**

Per row Card, after the month/date block, add a status caption (skip when pending):

```tsx
              {statuses[row.uri] && statuses[row.uri] !== 'pending' ? (
                <Text style={[Type.caption, {
                  color: statuses[row.uri] === 'failed' ? colors.danger : colors.textTertiary,
                }]}>
                  {statuses[row.uri] === 'uploading' ? 'Uploading…'
                    : statuses[row.uri] === 'done' ? 'Added'
                    : 'Failed — will retry'}
                </Text>
              ) : null}
```

Replace the confirm/start-over buttons:

```tsx
          {uploadError ? (
            <Text style={[Type.caption, { color: colors.danger }]}>{uploadError}</Text>
          ) : null}
          <Button
            label={
              uploading
                ? 'Adding…'
                : Object.values(statuses).includes('failed')
                  ? 'Retry failed'
                  : `Add ${rows.length} ${rows.length === 1 ? 'month' : 'months'}`
            }
            onPress={() => void confirm()}
            disabled={uploading}
          />
          <Button label="Start over" variant="secondary" disabled={uploading}
            onPress={() => { setRows([]); setStatuses({}); setUploadError(null); }} />
```

- [ ] **Step 3: Typecheck + full suite, commit**

Run: `npm run typecheck && npm test`
Expected: green.

```bash
git add src/app/import-photos.tsx
git commit -m "feat: photo import uploads sequentially with per-row progress and retry"
```

---

### Task 11: Migration engine

**Files:**
- Create: `src/features/migration/engine.ts`
- Create: `src/features/migration/engine.test.ts`

**Interfaces:**
- Consumes: `saveProfile` (Task 5), `addVisit` (Task 6, returns the created `Visit`), `createEntry` (Task 9), `addPayment`/`setPlanTotal` (Task 7), `apiRequest`, `createJsonStore`, all four feature stores' `get()`.
- Produces: `type LocalSnapshot = { profile: Profile; entries: JourneyEntry[]; visits: Visit[]; payments: PaymentsState }`; `captureLocalSnapshot(): LocalSnapshot`; `localDataPresent(s: LocalSnapshot): boolean`; `migrationCompleted(): boolean`; `markMigrationCompleted(): void`; `serverInventory(): Promise<{entries: number; visits: number; payments: number}>`; `fetchServerMonths(): Promise<Set<number>>`; `runMigration(snapshot: LocalSnapshot, onProgress: (p: MigrationProgress) => void): Promise<{failed: number}>` with `MigrationProgress = {done: number; failed: number; total: number; label: string}`. Task 12 builds both screens on these.
- Semantics: sequential upload in the order profile → visits (building a local→server visit-id map, persisted) → entries by month (appointmentId remapped through the map; a 422 with a `month_number` field error counts as already-uploaded) → payments → plan total (only when > 0). Item statuses persist in `migration.json` so a killed app resumes instead of re-uploading; a completed run refreshes all stores, deletes orphaned legacy photo files, and stamps `completedAt`.

- [ ] **Step 1: Write the failing tests**

`src/features/migration/engine.test.ts` (mock expo-file-system as in `create-json-store.test.ts`, expo-secure-store and expo-image-manipulator as in Task 9's test; route fetch by URL+method):

```ts
// Mocks: expo-file-system (mirror create-json-store.test.ts), expo-secure-store,
// expo-image-manipulator — exactly as in src/features/journey/store.test.ts.

import { migrationStore, runMigration, type LocalSnapshot } from '@/features/migration/engine';
import { journeyStore } from '@/features/journey/store';
import { paymentsStore } from '@/features/payments/store';
import { visitsStore } from '@/features/visits/store';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 300, status, json: () => Promise.resolve(body) } as Response;
}

const emptyPage = { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };

function routeFetch(overrides: (url: string, init: RequestInit) => Response | undefined) {
  fetchMock.mockImplementation((url: string, init: RequestInit) => {
    const custom = overrides(String(url), init);
    if (custom) return Promise.resolve(custom);
    // Default GETs (post-migration refresh) return empty collections.
    if (!init.method || init.method === 'GET') {
      if (String(url).includes('/payments')) {
        return Promise.resolve(jsonResponse(200, { data: [], summary: { plan_total: null, total_paid: 0, remaining: null } }));
      }
      if (String(url).includes('/profile')) {
        return Promise.resolve(jsonResponse(200, { data: { name: '', clinic_name: null, orthodontist_name: null, treatment_start_date: null, planned_months: null, braces_type: null } }));
      }
      return Promise.resolve(jsonResponse(200, emptyPage));
    }
    return Promise.resolve(jsonResponse(500, { message: 'unexpected' }));
  });
}

function snapshot(): LocalSnapshot {
  return {
    profile: { name: 'Amin', clinicName: 'C', treatmentStartDate: '2026-02-01', plannedMonths: 24, onboardedAt: 'x' },
    entries: [
      { id: 'e1', monthNumber: 1, date: '2026-02-10', appointmentId: 'v1', note: 'first' },
    ],
    visits: [
      { id: 'v1', title: 'Bonding', date: '2026-02-10', time: '10:00', location: 'C', status: 'completed' },
    ],
    payments: { planTotal: 8000, records: [{ id: 'p1', date: '2026-02-10', amount: 500, method: 'cash' }] },
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  migrationStore.set({ items: {}, visitIdMap: {} });
  journeyStore.set([]);
  visitsStore.set([]);
  paymentsStore.set({ planTotal: 0, records: [] });
});

test('uploads profile, visits, entries (remapped visit id), payments, plan total — in order', async () => {
  const posts: { url: string; body: unknown }[] = [];
  routeFetch((url, init) => {
    if (init.method === 'PUT' && url.includes('/profile')) {
      posts.push({ url, body: JSON.parse(init.body as string) });
      return jsonResponse(200, { data: { name: 'Amin', clinic_name: 'C', orthodontist_name: null, treatment_start_date: '2026-02-01', planned_months: 24, braces_type: null } });
    }
    if (init.method === 'POST' && url.endsWith('/visits')) {
      posts.push({ url, body: JSON.parse(init.body as string) });
      return jsonResponse(201, { data: { id: 77, title: 'Bonding', appointment_date: '2026-02-10T10:00:00+00:00', type: null, status: 'completed', doctor_name: null, clinic_name: 'C', cost: null, currency: 'MYR', notes: null, created_at: null } });
    }
    if (init.method === 'POST' && url.endsWith('/journey-entries')) {
      expect(init.body).toBeInstanceOf(FormData);
      posts.push({ url, body: undefined });
      // The id-remap itself is asserted below via migrationStore.visitIdMap;
      // the server echo of appointment_id: 77 closes the loop.
      return jsonResponse(201, { data: { id: 91, month_number: 1, photo_date: '2026-02-10', bracket_color_name: null, bracket_color_hex: null, notes: 'first', appointment_id: 77, photo_url: null, created_at: null } });
    }
    if (init.method === 'POST' && url.endsWith('/payments')) {
      posts.push({ url, body: JSON.parse(init.body as string) });
      return jsonResponse(201, { data: { id: 5, amount: 500, currency: 'MYR', method: 'cash', paid_at: '2026-02-10', notes: null, created_at: null } });
    }
    if (init.method === 'PUT' && url.includes('/payments/plan-total')) {
      posts.push({ url, body: JSON.parse(init.body as string) });
      return jsonResponse(200, { message: 'ok' });
    }
    return undefined;
  });

  const result = await runMigration(snapshot(), () => undefined);
  expect(result.failed).toBe(0);
  expect(posts.map((p) => p.url.replace(/^.*\/api\/mobile\/v1/, ''))).toEqual([
    '/profile',
    '/visits',
    '/journey-entries',
    '/payments',
    '/payments/plan-total',
  ]);
  expect(migrationStore.get().visitIdMap.v1).toBe('77');
  expect(migrationStore.get().completedAt).toBeTruthy();
});

test('a 422 month conflict counts as already uploaded', async () => {
  routeFetch((url, init) => {
    if (init.method === 'PUT' && url.includes('/profile')) {
      return jsonResponse(200, { data: { name: 'A', clinic_name: null, orthodontist_name: null, treatment_start_date: null, planned_months: null, braces_type: null } });
    }
    if (init.method === 'POST' && url.endsWith('/journey-entries')) {
      return jsonResponse(422, { message: 'Invalid.', errors: { month_number: ['An entry for this treatment month already exists.'] } });
    }
    if (init.method === 'POST' && url.endsWith('/payments')) {
      return jsonResponse(201, { data: { id: 6, amount: 500, currency: 'MYR', method: 'cash', paid_at: '2026-02-10', notes: null, created_at: null } });
    }
    if (init.method === 'PUT' && url.includes('plan-total')) return jsonResponse(200, {});
    if (init.method === 'POST' && url.endsWith('/visits')) {
      return jsonResponse(201, { data: { id: 70, title: 'B', appointment_date: '2026-02-10T10:00:00+00:00', type: null, status: 'completed', doctor_name: null, clinic_name: null, cost: null, currency: 'MYR', notes: null, created_at: null } });
    }
    return undefined;
  });
  const result = await runMigration(snapshot(), () => undefined);
  expect(result.failed).toBe(0);
  expect(migrationStore.get().items['entry:e1']).toBe('done');
});

test('failures are recorded and a re-run skips done items', async () => {
  let visitCalls = 0;
  routeFetch((url, init) => {
    if (init.method === 'PUT' && url.includes('/profile')) {
      return jsonResponse(200, { data: { name: 'A', clinic_name: null, orthodontist_name: null, treatment_start_date: null, planned_months: null, braces_type: null } });
    }
    if (init.method === 'POST' && url.endsWith('/visits')) {
      visitCalls += 1;
      if (visitCalls === 1) return jsonResponse(500, { message: 'boom' });
      return jsonResponse(201, { data: { id: 70, title: 'B', appointment_date: '2026-02-10T10:00:00+00:00', type: null, status: 'completed', doctor_name: null, clinic_name: null, cost: null, currency: 'MYR', notes: null, created_at: null } });
    }
    if (init.method === 'POST' && url.endsWith('/journey-entries')) {
      return jsonResponse(201, { data: { id: 91, month_number: 1, photo_date: '2026-02-10', bracket_color_name: null, bracket_color_hex: null, notes: null, appointment_id: null, photo_url: null, created_at: null } });
    }
    if (init.method === 'POST' && url.endsWith('/payments')) {
      return jsonResponse(201, { data: { id: 6, amount: 500, currency: 'MYR', method: 'cash', paid_at: '2026-02-10', notes: null, created_at: null } });
    }
    if (init.method === 'PUT' && url.includes('plan-total')) return jsonResponse(200, {});
    return undefined;
  });

  const first = await runMigration(snapshot(), () => undefined);
  expect(first.failed).toBe(1);
  expect(migrationStore.get().completedAt).toBeUndefined();
  expect(migrationStore.get().items['profile']).toBe('done');

  const profilePuts = () =>
    fetchMock.mock.calls.filter(([u, i]) => (i as RequestInit).method === 'PUT' && String(u).includes('/profile')).length;
  const before = profilePuts();
  const second = await runMigration(snapshot(), () => undefined);
  expect(second.failed).toBe(0);
  expect(profilePuts()).toBe(before); // profile not re-uploaded
  expect(migrationStore.get().completedAt).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/migration/engine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the engine**

`src/features/migration/engine.ts`:

```ts
import { Directory, File, Paths } from 'expo-file-system';

import type { JourneyEntry } from '@/features/journey/types';
import type { PaymentsState } from '@/features/payments/types';
import type { Profile } from '@/features/profile/types';
import type { Visit } from '@/features/visits/types';
import { createEntry, journeyStore } from '@/features/journey/store';
import { addPayment, paymentsStore, setPlanTotal } from '@/features/payments/store';
import { profileStore } from '@/features/profile/store';
import { saveProfile } from '@/features/profile/api';
import { addVisit, visitsStore } from '@/features/visits/store';
import { ApiError, apiRequest } from '@/lib/api/client';
import { createJsonStore } from '@/lib/store/create-json-store';
import { refreshAllApiStores } from '@/lib/store/create-api-store';

export type LocalSnapshot = {
  profile: Profile;
  entries: JourneyEntry[];
  visits: Visit[];
  payments: PaymentsState;
};

export type MigrationState = {
  completedAt?: string;
  items: Record<string, 'done' | 'failed'>;
  visitIdMap: Record<string, string>;
};

export const migrationStore = createJsonStore<MigrationState>('migration.json', {
  items: {},
  visitIdMap: {},
});

export type MigrationProgress = { done: number; failed: number; total: number; label: string };

/** The store caches still hold the device's v3 data until the first refresh —
 * capture BEFORE any refreshAllApiStores() runs. */
export function captureLocalSnapshot(): LocalSnapshot {
  return {
    profile: profileStore.get(),
    entries: journeyStore.get(),
    visits: visitsStore.get(),
    payments: paymentsStore.get(),
  };
}

export function localDataPresent(s: LocalSnapshot): boolean {
  return (
    s.entries.length > 0 ||
    s.visits.length > 0 ||
    s.payments.records.length > 0 ||
    s.payments.planTotal > 0
  );
}

export function migrationCompleted(): boolean {
  return migrationStore.get().completedAt !== undefined;
}

/** Also used by the merge path and by "skip" — a stamped migration never re-prompts. */
export function markMigrationCompleted(): void {
  migrationStore.update((s) => ({ ...s, completedAt: new Date().toISOString() }));
}

type Meta = { meta: { total: number } };

export async function serverInventory(): Promise<{ entries: number; visits: number; payments: number }> {
  const [entries, visits, payments] = await Promise.all([
    apiRequest<Meta>('GET', '/journey-entries?page=1'),
    apiRequest<Meta>('GET', '/visits?page=1'),
    apiRequest<{ data: unknown[] }>('GET', '/payments'),
  ]);
  return { entries: entries.meta.total, visits: visits.meta.total, payments: payments.data.length };
}

export async function fetchServerMonths(): Promise<Set<number>> {
  const { fetchAllPages } = await import('@/lib/api/pagination');
  const rows = await fetchAllPages<{ month_number: number }>('/journey-entries');
  return new Set(rows.map((r) => r.month_number));
}

function isMonthConflict(e: unknown): boolean {
  return e instanceof ApiError && e.status === 422 && e.fieldErrors?.month_number !== undefined;
}

function status(key: string): 'done' | 'failed' | undefined {
  return migrationStore.get().items[key];
}

function mark(key: string, value: 'done' | 'failed'): void {
  migrationStore.update((s) => ({ ...s, items: { ...s.items, [key]: value } }));
}

export async function runMigration(
  snapshot: LocalSnapshot,
  onProgress: (p: MigrationProgress) => void,
): Promise<{ failed: number }> {
  const entries = [...snapshot.entries].sort((a, b) => a.monthNumber - b.monthNumber);
  const hasPlanTotal = snapshot.payments.planTotal > 0;
  const total =
    1 + snapshot.visits.length + entries.length + snapshot.payments.records.length + (hasPlanTotal ? 1 : 0);
  let done = 0;
  let failed = 0;

  async function step(key: string, label: string, upload: () => Promise<void>): Promise<void> {
    if (status(key) === 'done') {
      done += 1;
    } else {
      try {
        await upload();
        mark(key, 'done');
        done += 1;
      } catch (e) {
        if (isMonthConflict(e)) {
          mark(key, 'done');
          done += 1;
        } else {
          mark(key, 'failed');
          failed += 1;
        }
      }
    }
    onProgress({ done, failed, total, label });
  }

  await step('profile', 'Your profile', async () => {
    await saveProfile({
      name: snapshot.profile.name,
      clinicName: snapshot.profile.clinicName,
      treatmentStartDate: snapshot.profile.treatmentStartDate,
      plannedMonths: snapshot.profile.plannedMonths,
      bracesType: snapshot.profile.bracesType,
    });
  });

  for (const visit of snapshot.visits) {
    await step(`visit:${visit.id}`, visit.title, async () => {
      const created = await addVisit({
        title: visit.title,
        date: visit.date,
        time: visit.time,
        location: visit.location,
        notes: visit.notes,
        status: visit.status,
      });
      migrationStore.update((s) => ({
        ...s,
        visitIdMap: { ...s.visitIdMap, [visit.id]: created.id },
      }));
    });
  }

  for (const entry of entries) {
    await step(`entry:${entry.id}`, `Month ${entry.monthNumber}`, async () => {
      const mappedVisitId = entry.appointmentId
        ? migrationStore.get().visitIdMap[entry.appointmentId]
        : undefined;
      await createEntry({
        monthNumber: entry.monthNumber,
        date: entry.date,
        photoUri: entry.photo?.uri,
        bracketColor: entry.bracketColor,
        note: entry.note,
        appointmentId: mappedVisitId,
      });
    });
  }

  for (const record of snapshot.payments.records) {
    await step(`payment:${record.id}`, 'Payments', async () => {
      await addPayment({ date: record.date, amount: record.amount, method: record.method });
    });
  }

  if (hasPlanTotal) {
    await step('planTotal', 'Plan total', async () => {
      await setPlanTotal(snapshot.payments.planTotal);
    });
  }

  if (failed === 0) {
    markMigrationCompleted();
    await refreshAllApiStores();
    cleanupOrphanPhotoFiles(
      new Set(
        journeyStore
          .get()
          .map((e) => e.photo?.uri)
          .filter((uri): uri is string => uri !== undefined),
      ),
    );
  }

  return { failed };
}

/** After a completed migration the server ids own the photo cache — legacy
 * `<Date.now()>.jpg` files are dead weight. Best-effort. */
function cleanupOrphanPhotoFiles(keep: Set<string>): void {
  try {
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) return;
    for (const item of dir.list()) {
      if (item instanceof File && !keep.has(item.uri)) item.delete();
    }
  } catch {
    // storage cleanup is never worth failing the migration over
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/migration/engine.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + full suite, commit**

Run: `npm run typecheck && npm test`
Expected: green.

```bash
git add src/features/migration/engine.ts src/features/migration/engine.test.ts
git commit -m "feat: one-time migration engine — ordered, resumable, id-remapping"
```

---

### Task 12: Migration + merge screens, post-sign-in routing

**Files:**
- Create: `src/features/migration/routing.ts`
- Create: `src/features/migration/routing.test.ts`
- Create: `src/app/migrate.tsx`
- Create: `src/app/merge-months.tsx`
- Modify: `src/app/sign-in.tsx` (route through `routeAfterSignIn`)
- Modify: `src/app/_layout.tsx` (register `migrate` + `merge-months`, gestures disabled on migrate)

**Interfaces:**
- Consumes: the whole Task 11 engine, `refreshAllApiStores`.
- Produces: `routeAfterSignIn(): Promise<'/migrate' | '/merge-months' | '/'>` — decides from a pre-refresh local snapshot + server inventory: full migration only into an empty account; a non-empty account with local-only journey months offers the manual months merge (D5 alternate); otherwise refresh and go home. Routes `/migrate` and `/merge-months`.

- [ ] **Step 1: Write the failing tests**

`src/features/migration/routing.test.ts` (same module mocks as the engine test; mock the engine module itself to isolate routing):

```ts
jest.mock('@/features/migration/engine', () => ({
  captureLocalSnapshot: jest.fn(),
  localDataPresent: jest.requireActual('@/features/migration/engine').localDataPresent,
  migrationCompleted: jest.fn(),
  serverInventory: jest.fn(),
  fetchServerMonths: jest.fn(),
}));
jest.mock('@/lib/store/create-api-store', () => ({
  ...jest.requireActual('@/lib/store/create-api-store'),
  refreshAllApiStores: jest.fn(() => Promise.resolve()),
}));
// plus the expo-file-system / expo-secure-store / expo-image-manipulator mocks as before

import {
  captureLocalSnapshot,
  fetchServerMonths,
  migrationCompleted,
  serverInventory,
} from '@/features/migration/engine';
import { routeAfterSignIn } from '@/features/migration/routing';
import { refreshAllApiStores } from '@/lib/store/create-api-store';

const emptySnapshot = {
  profile: { name: '', clinicName: '', treatmentStartDate: '2026-01-01', plannedMonths: 24 },
  entries: [],
  visits: [],
  payments: { planTotal: 0, records: [] },
};
const localSnapshot = {
  ...emptySnapshot,
  entries: [{ id: 'e1', monthNumber: 3, date: '2026-03-01' }],
};

beforeEach(() => jest.clearAllMocks());

test('no local data → refresh and go home', async () => {
  (captureLocalSnapshot as jest.Mock).mockReturnValue(emptySnapshot);
  (migrationCompleted as jest.Mock).mockReturnValue(false);
  await expect(routeAfterSignIn()).resolves.toBe('/');
  expect(refreshAllApiStores).toHaveBeenCalled();
});

test('local data + empty server account → /migrate (no refresh yet)', async () => {
  (captureLocalSnapshot as jest.Mock).mockReturnValue(localSnapshot);
  (migrationCompleted as jest.Mock).mockReturnValue(false);
  (serverInventory as jest.Mock).mockResolvedValue({ entries: 0, visits: 0, payments: 0 });
  await expect(routeAfterSignIn()).resolves.toBe('/migrate');
  expect(refreshAllApiStores).not.toHaveBeenCalled();
});

test('local data + non-empty server with local-only months → /merge-months', async () => {
  (captureLocalSnapshot as jest.Mock).mockReturnValue(localSnapshot);
  (migrationCompleted as jest.Mock).mockReturnValue(false);
  (serverInventory as jest.Mock).mockResolvedValue({ entries: 2, visits: 0, payments: 0 });
  (fetchServerMonths as jest.Mock).mockResolvedValue(new Set([1, 2]));
  await expect(routeAfterSignIn()).resolves.toBe('/merge-months');
});

test('non-empty server, nothing local-only → refresh and go home', async () => {
  (captureLocalSnapshot as jest.Mock).mockReturnValue(localSnapshot);
  (migrationCompleted as jest.Mock).mockReturnValue(false);
  (serverInventory as jest.Mock).mockResolvedValue({ entries: 2, visits: 0, payments: 0 });
  (fetchServerMonths as jest.Mock).mockResolvedValue(new Set([3]));
  await expect(routeAfterSignIn()).resolves.toBe('/');
  expect(refreshAllApiStores).toHaveBeenCalled();
});

test('already-completed migration short-circuits home', async () => {
  (captureLocalSnapshot as jest.Mock).mockReturnValue(localSnapshot);
  (migrationCompleted as jest.Mock).mockReturnValue(true);
  await expect(routeAfterSignIn()).resolves.toBe('/');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/migration/routing.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement routing**

`src/features/migration/routing.ts`:

```ts
import {
  captureLocalSnapshot,
  fetchServerMonths,
  localDataPresent,
  migrationCompleted,
  serverInventory,
} from '@/features/migration/engine';
import { refreshAllApiStores } from '@/lib/store/create-api-store';

/** Decides where sign-in lands. Must run BEFORE any refresh — the caches
 * still hold the device's v3 data at this point. */
export async function routeAfterSignIn(): Promise<'/migrate' | '/merge-months' | '/'> {
  const snapshot = captureLocalSnapshot();

  if (!localDataPresent(snapshot) || migrationCompleted()) {
    await refreshAllApiStores();
    return '/';
  }

  const inventory = await serverInventory();
  const serverEmpty =
    inventory.entries === 0 && inventory.visits === 0 && inventory.payments === 0;

  if (serverEmpty) return '/migrate';

  const serverMonths = await fetchServerMonths();
  const localOnly = snapshot.entries.filter((e) => !serverMonths.has(e.monthNumber));
  if (localOnly.length > 0) return '/merge-months';

  await refreshAllApiStores();
  return '/';
}
```

`src/app/sign-in.tsx` — the action becomes:

```tsx
  const { run, pending, error } = useAsyncAction(async () => {
    await login({ email: email.trim(), password });
    const destination = await routeAfterSignIn();
    router.replace(destination);
  });
```

(Remove the now-unused `refreshAllApiStores` import; add `routeAfterSignIn` from `@/features/migration/routing`.)

- [ ] **Step 4: The migrate screen**

`src/app/migrate.tsx`:

```tsx
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import {
  captureLocalSnapshot,
  runMigration,
  type LocalSnapshot,
  type MigrationProgress,
} from '@/features/migration/engine';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function MigrateScreen() {
  const colors = useTheme();
  const snapshotRef = useRef<LocalSnapshot | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(0);
  const [finished, setFinished] = useState(false);

  async function start() {
    if (running) return;
    setRunning(true);
    snapshotRef.current ??= captureLocalSnapshot();
    const result = await runMigration(snapshotRef.current, setProgress);
    setFailed(result.failed);
    setFinished(result.failed === 0);
    setRunning(false);
  }

  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const ratio = progress && progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: Space.md }}>
        <Text style={[Type.display, { color: colors.textPrimary }]}>Moving your journey</Text>
        <Text style={[Type.body, { color: colors.textSecondary }]}>
          Your months, visits, and payments are being uploaded to your account. Keep the app open.
        </Text>
        <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
          <View style={{ width: `${ratio * 100}%`, height: 6, backgroundColor: colors.accent, borderRadius: 3 }} />
        </View>
        {progress ? (
          <Text style={[Type.caption, { color: colors.textTertiary }]}>
            {progress.done} of {progress.total}
            {progress.failed > 0 ? ` · ${progress.failed} failed` : ''} — {progress.label}
          </Text>
        ) : null}
        {failed > 0 && !running ? (
          <Text style={[Type.caption, { color: colors.danger }]}>
            {failed} {failed === 1 ? 'item' : 'items'} could not be uploaded. Retry when you have a
            connection — nothing already uploaded is sent twice.
          </Text>
        ) : null}
      </View>
      {finished ? (
        <Button label="Continue" onPress={() => router.replace('/')} />
      ) : failed > 0 && !running ? (
        <Button label="Retry failed" onPress={() => void start()} />
      ) : null}
    </Screen>
  );
}
```

- [ ] **Step 5: The merge screen (D5 alternate)**

`src/app/merge-months.tsx`:

```tsx
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { createEntry } from '@/features/journey/store';
import {
  captureLocalSnapshot,
  markMigrationCompleted,
} from '@/features/migration/engine';
import { refreshAllApiStores } from '@/lib/store/create-api-store';
import { useAsyncAction } from '@/lib/use-async-action';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function MergeMonthsScreen() {
  const colors = useTheme();
  // Captured once, before any refresh — this is the device's v3 data.
  const snapshot = useMemo(() => captureLocalSnapshot(), []);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(snapshot.entries.map((e) => e.id)),
  );

  const finishAction = useAsyncAction(async (upload: boolean) => {
    if (upload) {
      for (const entry of snapshot.entries) {
        if (!selected.has(entry.id)) continue;
        await createEntry({
          monthNumber: entry.monthNumber,
          date: entry.date,
          photoUri: entry.photo?.uri,
          bracketColor: entry.bracketColor,
          note: entry.note,
          // visit links are not merged — visits stay server-authoritative
        });
      }
    }
    markMigrationCompleted();
    await refreshAllApiStores();
    router.replace('/');
  });

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Months on this phone</Text>
      <Text style={[Type.body, { color: colors.textSecondary }]}>
        Your account already has a journey. These months exist only on this phone — choose which to
        add to your account. Visits and payments follow your account.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {snapshot.entries.map((entry) => (
          <Chip
            key={entry.id}
            label={`Month ${entry.monthNumber}`}
            selected={selected.has(entry.id)}
            onPress={() => toggle(entry.id)}
          />
        ))}
      </View>
      {finishAction.error ? (
        <Text style={[Type.caption, { color: colors.danger }]}>{finishAction.error}</Text>
      ) : null}
      <Button
        label={finishAction.pending ? 'Adding…' : `Add ${selected.size} to my account`}
        onPress={() => void finishAction.run(true)}
        disabled={finishAction.pending || selected.size === 0}
      />
      <Button
        label="Skip — use my account as is"
        variant="secondary"
        disabled={finishAction.pending}
        onPress={() => void finishAction.run(false)}
      />
    </Screen>
  );
}
```

NOTE — the screen lists every local entry; entries whose month already exists on the server will come back 422 on upload. Guard it: in `routeAfterSignIn` the merge route is only chosen when local-only months exist, and here filter the listed entries the same way. To keep this screen self-contained, filter at render: pass the server months through route params is over-engineering — instead call `fetchServerMonths()` in a `useEffect`, hold it in state, and render only entries whose month is absent; while loading show nothing but the title. Implement that (state `serverMonths: Set<number> | null`, effect calls `fetchServerMonths().then(setServerMonths).catch(() => setServerMonths(new Set()))`, list filters on it).

- [ ] **Step 6: Register the routes**

`src/app/_layout.tsx`:

```tsx
<Stack.Screen name="migrate" options={{ gestureEnabled: false }} />
<Stack.Screen name="merge-months" options={{ gestureEnabled: false }} />
```

- [ ] **Step 7: Run tests, typecheck, commit**

Run: `npm test -- src/features/migration/routing.test.ts` then `npm run typecheck && npm test`
Expected: green.

```bash
git add src/features/migration/routing.ts src/features/migration/routing.test.ts src/app/migrate.tsx src/app/merge-months.tsx src/app/sign-in.tsx src/app/_layout.tsx
git commit -m "feat: one-time migration flow — full upload into empty accounts, months merge otherwise"
```

---

### Task 13: Refresh on launch/foreground + server-aware error banner

**Files:**
- Modify: `src/app/_layout.tsx` (AppState-driven refresh)
- Modify: `src/components/save-error-banner.tsx` (also listens to refresh errors)

**Interfaces:**
- Consumes: `refreshAllApiStores`, `onRefreshError` (Task 3), `authStore` (Task 2).
- Produces: behavior only — signed-in sessions refresh all stores when the app becomes active; background refresh failures surface in the existing banner with their own copy.

- [ ] **Step 1: Foreground refresh**

In `src/app/_layout.tsx` add (inside the root component, with imports for `AppState` from react-native, `authStore`, `refreshAllApiStores`):

```tsx
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && authStore.get().status === 'signedIn') {
        void refreshAllApiStores();
      }
    });
    return () => subscription.remove();
  }, []);
```

(Launch-time refresh is already covered: sign-in routes refresh, and a cold start of a signed-in app fires this listener's `active` transition on iOS; if it does not in the simulator, add a one-shot `void authStore.whenReady().then(...)` — verify in the simulator and keep whichever fires exactly once.)

- [ ] **Step 2: Banner listens to both channels**

`src/components/save-error-banner.tsx` — extend to a message state fed by both sources:

```tsx
  const [message, setMessage] = useState<string | null>(null);

  useEffect(
    () =>
      onPersistError(() =>
        setMessage("Couldn't save your latest change — it's kept in memory. Tap to dismiss."),
      ),
    [],
  );
  useEffect(
    () =>
      onRefreshError(() =>
        setMessage("Couldn't refresh from the server — showing your last synced data. Tap to dismiss."),
      ),
    [],
  );
```

Render `message` instead of the hardcoded string; import `onRefreshError` from `@/lib/store/create-api-store`. Keep the Pressable/dismiss behavior identical.

- [ ] **Step 3: Typecheck + full suite, commit**

Run: `npm run typecheck && npm test`
Expected: green.

```bash
git add src/app/_layout.tsx src/components/save-error-banner.tsx
git commit -m "feat: foreground refresh and server-aware error banner"
```

---

### Task 14: Verification sweep + AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Interfaces:** none — verification + documentation.

- [ ] **Step 1: Full verification**

Run: `npm run typecheck && npm test && npx expo lint`
Expected: all green, no lint errors in changed files. Fix anything that surfaces (formatting-level only; behavior changes go back through a task).

- [ ] **Step 2: Update AGENTS.md (the repo's maintenance rule)**

Apply these edits:
- First paragraph: replace "Everything is stored on-device." with "Data lives on the braces-journey-be API (server-authoritative); reads come from per-feature JSON caches that keep the app browsable offline, writes require a connection."
- The recipe step 2: `createJsonStore` becomes "a store: `createApiStore<T>('name.json', initial, fetchRemote)` in `src/features/<name>/store.ts` with an `api.ts` beside it for mappers (snake_case ↔ camelCase, ISO datetimes split at the boundary). Export async mutation functions that call the API first, then update the cache."
- Rules: add
  - "API calls only via `src/lib/api/client.ts` (`apiRequest`); dates cross the boundary as `YYYY-MM-DD` (+ `HH:MM` for visit times) — screens never see ISO datetimes."
  - "Write actions in screens go through `useAsyncAction` — pending label + danger-caption error, input preserved on failure."
- Structure: mention `src/lib/api/` (client, token, pagination), `src/features/auth/`, `src/features/migration/`, routes `welcome`, `sign-in`, `create-account`, `migrate`, `merge-months`.
- Domain cheatsheet: add "Auth: Sanctum bearer token in expo-secure-store; token gate in `(tabs)/_layout` ahead of the onboarding gate. Photo cache: `<documentDirectory>/photos/<entryId>.<ext>`, server ids."
- Keep the existing dependency lines added in Tasks 2 and 9.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: AGENTS.md reflects the server-backed architecture"
```
