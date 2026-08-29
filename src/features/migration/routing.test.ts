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
jest.mock('expo-file-system', () => ({
  Paths: { document: '/docs' },
  Directory: class {
    uri = '/docs/photos';
    get exists() {
      return true;
    }
    create() {}
  },
  File: class MockFile {
    uri: string;
    constructor(...segments: unknown[]) {
      this.uri = segments
        .map((s) => (typeof s === 'string' ? s : (s as { uri: string }).uri))
        .join('/');
    }
    get exists() {
      return false;
    }
    text() {
      return '';
    }
    textSync() {
      return '';
    }
    write() {}
    copySync() {}
    delete() {}
  },
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri: string) => Promise.resolve({ uri })),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

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
