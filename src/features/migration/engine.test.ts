const mockDirList = jest.fn((): unknown[] => []);

jest.mock('expo-file-system', () => ({
  Paths: { document: '/docs' },
  Directory: class {
    uri = '/docs/photos';
    get exists() {
      return true;
    }
    create() {}
    list() {
      return mockDirList();
    }
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
      return false;
    }
    async text() {
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
  isMonthConflict,
  migrationStore,
  runMigration,
  type LocalSnapshot,
} from '@/features/migration/engine';
import { journeyStore } from '@/features/journey/store';
import { paymentsStore } from '@/features/payments/store';
import { visitsStore } from '@/features/visits/store';
import { ApiError } from '@/lib/api/client';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

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
  mockDirList.mockClear();
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
  expect(mockDirList).toHaveBeenCalled(); // no quota hit → orphan cleanup ran
});

test('the snapshot is persisted before the first upload and dropped on completion', async () => {
  routeFetch((url, init) => {
    if (init.method === 'PUT' && url.includes('/profile')) {
      return jsonResponse(200, { data: { name: 'A', clinic_name: null, orthodontist_name: null, treatment_start_date: null, planned_months: null, braces_type: null } });
    }
    if (init.method === 'POST' && url.endsWith('/visits')) {
      return jsonResponse(201, { data: { id: 70, title: 'B', appointment_date: '2026-02-10T10:00:00+00:00', type: null, status: 'completed', doctor_name: null, clinic_name: null, cost: null, currency: 'MYR', notes: null, created_at: null } });
    }
    if (init.method === 'POST' && url.endsWith('/journey-entries')) {
      return jsonResponse(201, { data: { id: 91, month_number: 1, photo_date: '2026-02-10', bracket_color_name: null, bracket_color_hex: null, notes: null, appointment_id: 70, photo_url: null, created_at: null } });
    }
    if (init.method === 'POST' && url.endsWith('/payments')) {
      return jsonResponse(201, { data: { id: 6, amount: 500, currency: 'MYR', method: 'cash', paid_at: '2026-02-10', notes: null, created_at: null } });
    }
    if (init.method === 'PUT' && url.includes('plan-total')) return jsonResponse(200, {});
    return undefined;
  });

  // The first progress callback fires after the first upload — the persisted
  // snapshot must already be there (a kill at any point can then resume).
  let snapshotAtFirstProgress: LocalSnapshot | undefined | 'unchecked' = 'unchecked';
  const result = await runMigration(snapshot(), () => {
    if (snapshotAtFirstProgress === 'unchecked') {
      snapshotAtFirstProgress = migrationStore.get().snapshot;
    }
  });
  expect(result.failed).toBe(0);
  expect(snapshotAtFirstProgress).toEqual(snapshot());
  // completedAt stamped → the persisted snapshot is dropped again.
  expect(migrationStore.get().completedAt).toBeTruthy();
  expect(migrationStore.get().snapshot).toBeUndefined();
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
  let entryPostCalls = 0;
  let lastEntryFormData: FormData | undefined;
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
      entryPostCalls += 1;
      lastEntryFormData = init.body as FormData;
      return jsonResponse(201, { data: { id: 91, month_number: 1, photo_date: '2026-02-10', bracket_color_name: null, bracket_color_hex: null, notes: null, appointment_id: 70, photo_url: null, created_at: null } });
    }
    if (init.method === 'POST' && url.endsWith('/payments')) {
      return jsonResponse(201, { data: { id: 6, amount: 500, currency: 'MYR', method: 'cash', paid_at: '2026-02-10', notes: null, created_at: null } });
    }
    if (init.method === 'PUT' && url.includes('plan-total')) return jsonResponse(200, {});
    return undefined;
  });

  // Run 1: the visit upload fails, so the dependent entry (appointmentId: 'v1')
  // must be DEFERRED rather than uploaded link-less — no POST /journey-entries.
  const first = await runMigration(snapshot(), () => undefined);
  expect(first.failed).toBe(2); // visit:v1 failed + entry:e1 deferred
  expect(entryPostCalls).toBe(0);
  expect(migrationStore.get().items['entry:e1']).toBe('failed');
  expect(migrationStore.get().completedAt).toBeUndefined();
  expect(migrationStore.get().items['profile']).toBe('done');
  // An unfinished run keeps its persisted snapshot — a relaunch resumes from it.
  expect(migrationStore.get().snapshot).toEqual(snapshot());

  const profilePuts = () =>
    fetchMock.mock.calls.filter(([u, i]) => (i as RequestInit).method === 'PUT' && String(u).includes('/profile')).length;
  const before = profilePuts();

  // Run 2: the visit upload now succeeds, so the entry uploads WITH the
  // mapped appointment_id — the local↔server link is preserved, not lost.
  const second = await runMigration(snapshot(), () => undefined);
  expect(second.failed).toBe(0);
  expect(profilePuts()).toBe(before); // profile not re-uploaded
  expect(entryPostCalls).toBe(1);
  expect(lastEntryFormData?.get('appointment_id')).toBe('70');
  expect(migrationStore.get().visitIdMap.v1).toBe('70');
  expect(migrationStore.get().items['entry:e1']).toBe('done');
  expect(migrationStore.get().completedAt).toBeTruthy();
  expect(migrationStore.get().snapshot).toBeUndefined();
});

test('a quota 403 retries the entry photo-less, marks it done, and keeps local photos', async () => {
  const entryPosts: FormData[] = [];
  routeFetch((url, init) => {
    if (init.method === 'PUT' && url.includes('/profile')) {
      return jsonResponse(200, { data: { name: 'A', clinic_name: null, orthodontist_name: null, treatment_start_date: null, planned_months: null, braces_type: null } });
    }
    if (init.method === 'POST' && url.endsWith('/visits')) {
      return jsonResponse(201, { data: { id: 70, title: 'B', appointment_date: '2026-02-10T10:00:00+00:00', type: null, status: 'completed', doctor_name: null, clinic_name: null, cost: null, currency: 'MYR', notes: null, created_at: null } });
    }
    if (init.method === 'POST' && url.endsWith('/journey-entries')) {
      const form = init.body as FormData;
      entryPosts.push(form);
      if (form.get('photo')) {
        return jsonResponse(403, { message: 'Photo limit reached for your plan.', code: 'photo_quota_exceeded' });
      }
      return jsonResponse(201, { data: { id: 91, month_number: 1, photo_date: '2026-02-10', bracket_color_name: null, bracket_color_hex: null, notes: 'first', appointment_id: 70, photo_url: null, created_at: null } });
    }
    if (init.method === 'POST' && url.endsWith('/payments')) {
      return jsonResponse(201, { data: { id: 6, amount: 500, currency: 'MYR', method: 'cash', paid_at: '2026-02-10', notes: null, created_at: null } });
    }
    if (init.method === 'PUT' && url.includes('plan-total')) return jsonResponse(200, {});
    return undefined;
  });

  const snap = snapshot();
  snap.entries[0].photo = {
    uri: '/docs/photos/legacy.jpg',
    width: 100,
    height: 100,
    capturedAt: '2026-02-10T10:00:00Z',
  };
  const result = await runMigration(snap, () => undefined);

  expect(result).toEqual({ failed: 0, quotaHit: true });
  expect(entryPosts).toHaveLength(2); // with photo (403), then photo-less retry
  expect(entryPosts[1].get('photo')).toBeNull();
  expect(migrationStore.get().items['entry:e1']).toBe('done');
  expect(migrationStore.get().quotaHit).toBe(true);
  expect(migrationStore.get().completedAt).toBeTruthy();
  // Local photo files survive: the orphan cleanup never even lists the dir.
  expect(mockDirList).not.toHaveBeenCalled();
});

test('isMonthConflict matches only a 422 carrying month_number field errors', () => {
  expect(isMonthConflict(new ApiError(422, 'dup', undefined, { month_number: ['exists'] }))).toBe(true);
  expect(isMonthConflict(new ApiError(422, 'bad', undefined, { photo_date: ['invalid'] }))).toBe(false);
  expect(isMonthConflict(new ApiError(403, 'quota', 'photo_quota_exceeded'))).toBe(false);
  expect(isMonthConflict(new ApiError(500, 'boom'))).toBe(false);
  expect(isMonthConflict(new Error('plain'))).toBe(false);
});

