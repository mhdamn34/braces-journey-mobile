import { fetchAllPages } from '@/lib/api/pagination';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

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
