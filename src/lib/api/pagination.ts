import { apiRequest } from '@/lib/api/client';

type Paginated<T> = { data: T[]; meta: { current_page: number; last_page: number } };

/** The app's derived logic (dueState etc.) needs full collections, so
 * paginated endpoints are always drained into the cache. */
export async function fetchAllPages<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  for (;;) {
    const res = await apiRequest<Paginated<T>>('GET', `${path}?page=${page}`);
    all.push(...res.data);
    if (res.meta.current_page >= res.meta.last_page) return all;
    page += 1;
  }
}
