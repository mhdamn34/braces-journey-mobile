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

import { cachedToken, loadToken, saveToken, __resetTokenForTesting } from '@/lib/api/token';
import { authStore, initAuth, signOutLocally, signedIn, __resetAuthForTesting } from '@/features/auth/store';

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  __resetTokenForTesting();
  __resetAuthForTesting();
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
