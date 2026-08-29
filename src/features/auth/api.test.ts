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
import { profileStore } from '@/features/profile/store';
import { cachedToken } from '@/lib/api/token';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

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
