import { visitFromApi, visitToApi, type ApiVisit } from '@/features/visits/api';
import type { Visit } from '@/features/visits/types';
import { apiRequest } from '@/lib/api/client';
import { fetchAllPages } from '@/lib/api/pagination';
import { createApiStore } from '@/lib/store/create-api-store';

function sorted(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export const visitsStore = createApiStore<Visit[]>('visits.json', [], async () =>
  sorted((await fetchAllPages<ApiVisit>('/visits')).map(visitFromApi)),
);

export async function addVisit(input: Omit<Visit, 'id'>): Promise<Visit> {
  const res = await apiRequest<{ data: ApiVisit }>('POST', '/visits', { body: visitToApi(input) });
  const visit = visitFromApi(res.data);
  visitsStore.update((visits) => sorted([...visits, visit]));
  return visit;
}

export async function updateVisit(id: string, patch: Partial<Omit<Visit, 'id'>>): Promise<void> {
  const current = visitsStore.get().find((v) => v.id === id);
  if (!current) return;
  const next = { ...current, ...patch };
  const res = await apiRequest<{ data: ApiVisit }>(`PATCH`, `/visits/${id}`, {
    body: visitToApi(next),
  });
  const visit = visitFromApi(res.data);
  visitsStore.update((visits) => sorted(visits.map((v) => (v.id === id ? visit : v))));
}

export async function deleteVisit(id: string): Promise<void> {
  await apiRequest('DELETE', `/visits/${id}`);
  visitsStore.update((visits) => visits.filter((v) => v.id !== id));
}
