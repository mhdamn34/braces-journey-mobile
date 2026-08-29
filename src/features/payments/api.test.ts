import { fetchPayments, paymentFromApi } from '@/features/payments/api';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

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
