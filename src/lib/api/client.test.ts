import { ApiError, apiRequest, onUnauthorized, setTokenProvider } from '@/lib/api/client';

const fetchMock = jest.fn();
(globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;

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
  const error = (await apiRequest('POST', '/journey-entries', { body: {} }).catch((e) => e)) as unknown;
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(422);
  expect(((error as ApiError).fieldErrors?.month_number[0])).toContain('already exists');
});

test('403 quota error carries its code', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(403, { message: 'Photo limit reached for your plan.', code: 'photo_quota_exceeded' }),
  );
  const error = (await apiRequest('POST', '/journey-entries', { body: {} }).catch((e) => e)) as unknown;
  expect(((error as ApiError).code)).toBe('photo_quota_exceeded');
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
  const error = (await apiRequest('GET', '/profile').catch((e) => e)) as unknown;
  expect(((error as ApiError).status)).toBe(0);
  expect(((error as ApiError).code)).toBe('network');
});
