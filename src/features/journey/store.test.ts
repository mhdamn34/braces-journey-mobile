const mockFiles = new Map<string, string>();

jest.mock('expo-file-system', () => ({
  Paths: { document: '/docs' },
  Directory: class {
    uri = '/docs/photos';
    get exists() {
      return true;
    }
    create() {}
  },
  // Extends Blob: the real expo-file-system File implements Blob, and the
  // test environment's strict FormData rejects non-Blob file parts.
  File: class MockFile extends Blob {
    uri: string;
    constructor(...segments: unknown[]) {
      super(['mock-bytes'], { type: 'image/jpeg' });
      this.uri = segments
        .map((s) => (typeof s === 'string' ? s : (s as { uri: string }).uri))
        .join('/');
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    async text() {
      return mockFiles.get(this.uri)!;
    }
    textSync() {
      return mockFiles.get(this.uri)!;
    }
    write(content: string) {
      mockFiles.set(this.uri, content);
    }
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

import { createEntry, deleteEntry, journeyStore, updateEntry } from '@/features/journey/store';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

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
