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

const mockPhotoFiles: unknown[] = [];
jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    deleted = false;
    constructor(...segments: unknown[]) {
      this.uri = segments
        .map((s) => (typeof s === 'string' ? s : (s as { uri: string }).uri))
        .join('/');
    }
    get exists() {
      return false;
    }
    textSync() {
      return '';
    }
    write() {}
    copySync() {}
    delete() {
      this.deleted = true;
    }
  }
  class MockDirectory {
    uri = '/docs/photos';
    get exists() {
      return true;
    }
    create() {}
    list() {
      return mockPhotoFiles;
    }
  }
  return { Paths: { document: '/docs' }, Directory: MockDirectory, File: MockFile };
});
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri: string) => Promise.resolve({ uri })),
  SaveFormat: { JPEG: 'jpeg' },
}));

import { File } from 'expo-file-system';

import { initClearLocalDataOnUnauthorized } from '@/features/auth/clear-local-data';
import { authStore, initAuth, __resetAuthForTesting } from '@/features/auth/store';
import { journeyStore } from '@/features/journey/store';
import { migrationStore } from '@/features/migration/engine';
import { apiRequest } from '@/lib/api/client';
import { cachedToken, __resetTokenForTesting } from '@/lib/api/token';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 300, status, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  Object.keys(secure).forEach((k) => delete secure[k]);
  mockPhotoFiles.length = 0;
  __resetTokenForTesting();
  __resetAuthForTesting();
});

test('a 401 signs out AND wipes caches, photo files, and migration scratch', async () => {
  secure.api_token = 'tok';
  await initAuth();
  initClearLocalDataOnUnauthorized();
  expect(authStore.get().status).toBe('signedIn');

  // The previous account's data, as it would sit on the device.
  journeyStore.set([{ id: '91', monthNumber: 1, date: '2026-02-10' }]);
  migrationStore.set({
    completedAt: '2026-02-01T00:00:00Z',
    items: { profile: 'done' },
    visitIdMap: { v1: '77' },
  });
  const photo = new File('/docs/photos/91.jpg') as InstanceType<typeof File> & {
    deleted: boolean;
  };
  mockPhotoFiles.push(photo);

  fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Unauthenticated.' }));
  await expect(apiRequest('GET', '/journey-entries?page=1')).rejects.toThrow('Unauthenticated.');
  // The unauthorized listener kicks off the async clear — let it finish.
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(authStore.get().status).toBe('signedOut');
  expect(cachedToken()).toBeNull();
  expect(journeyStore.get()).toEqual([]); // a registered ApiStore, back to initial
  expect(migrationStore.get()).toEqual({ items: {}, visitIdMap: {} });
  expect(photo.deleted).toBe(true); // photos directory emptied
});
