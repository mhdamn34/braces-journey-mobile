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
globalThis.fetch = fetchMock as unknown as typeof fetch;

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
