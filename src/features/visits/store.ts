import type { Visit } from '@/features/visits/types';
import { createJsonStore } from '@/lib/store/create-json-store';

export const visitsStore = createJsonStore<Visit[]>('visits.json', []);

function sorted(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export function addVisit(visit: Visit): void {
  visitsStore.update((visits) => sorted([...visits, visit]));
}

export function updateVisit(id: string, patch: Partial<Visit>): void {
  visitsStore.update((visits) => sorted(visits.map((v) => (v.id === id ? { ...v, ...patch } : v))));
}

export function deleteVisit(id: string): void {
  visitsStore.update((visits) => visits.filter((v) => v.id !== id));
}
