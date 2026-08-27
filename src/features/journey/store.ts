import { deletePhotoFile } from '@/features/capture/photo-files';
import type { JourneyEntry } from '@/features/journey/types';
import { createJsonStore } from '@/lib/store/create-json-store';

export const journeyStore = createJsonStore<JourneyEntry[]>('journey.json', []);

function sorted(entries: JourneyEntry[]): JourneyEntry[] {
  return [...entries].sort((a, b) => a.monthNumber - b.monthNumber);
}

export function addEntry(entry: JourneyEntry): void {
  journeyStore.update((entries) => sorted([...entries, entry]));
}

export function updateEntry(id: string, patch: Partial<JourneyEntry>): void {
  journeyStore.update((entries) =>
    sorted(entries.map((e) => (e.id === id ? { ...e, ...patch } : e))),
  );
}

/** Removes the entry first (source of truth), then best-effort deletes its photo file. */
export function deleteEntry(id: string): void {
  const entry = journeyStore.get().find((e) => e.id === id);
  journeyStore.update((entries) => entries.filter((e) => e.id !== id));
  if (entry?.photo) deletePhotoFile(entry.photo.uri);
}

export function entriesWithPhotos(entries: JourneyEntry[]): JourneyEntry[] {
  return entries.filter((e) => e.photo);
}
