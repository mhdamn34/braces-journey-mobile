import { deletePhotoFile, persistPhotoFile } from '@/features/capture/photo-files';
import { resizeForUpload } from '@/features/capture/resize';
import { entryFromApi, fetchEntries, type ApiJourneyEntry } from '@/features/journey/api';
import type { BracketColor, JourneyEntry } from '@/features/journey/types';
import { apiRequest } from '@/lib/api/client';
import { createApiStore } from '@/lib/store/create-api-store';

export const journeyStore = createApiStore<JourneyEntry[]>('journey.json', [], fetchEntries);

function sorted(entries: JourneyEntry[]): JourneyEntry[] {
  return [...entries].sort((a, b) => a.monthNumber - b.monthNumber);
}

export async function createEntry(input: {
  monthNumber: number;
  date: string;
  photoUri?: string;
  bracketColor?: BracketColor;
  note?: string;
  appointmentId?: string;
}): Promise<JourneyEntry> {
  const form = new FormData();
  form.append('photo_date', input.date);
  form.append('month_number', String(input.monthNumber));
  if (input.bracketColor) {
    form.append('bracket_color_name', input.bracketColor.name);
    form.append('bracket_color_hex', input.bracketColor.hex);
  }
  if (input.note) form.append('notes', input.note);
  if (input.appointmentId) form.append('appointment_id', input.appointmentId);

  let uploadUri: string | undefined;
  if (input.photoUri) {
    uploadUri = await resizeForUpload(input.photoUri);
    form.append('photo', {
      uri: uploadUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  const res = await apiRequest<{ data: ApiJourneyEntry }>('POST', '/journey-entries', {
    formData: form,
  });
  const id = String(res.data.id);
  const cachedUri = uploadUri ? persistPhotoFile(uploadUri, id) : undefined;
  const entry = entryFromApi(res.data, cachedUri);
  journeyStore.update((entries) => sorted([...entries, entry]));
  return entry;
}

export async function updateEntry(
  id: string,
  patch: { bracketColor?: BracketColor; note?: string; appointmentId?: string },
): Promise<void> {
  const body: Record<string, unknown> = {};
  if ('bracketColor' in patch) {
    body.bracket_color_name = patch.bracketColor?.name ?? null;
    body.bracket_color_hex = patch.bracketColor?.hex ?? null;
  }
  if ('note' in patch) body.notes = patch.note ?? null;
  if ('appointmentId' in patch) body.appointment_id = patch.appointmentId ?? null;

  const res = await apiRequest<{ data: ApiJourneyEntry }>('PATCH', `/journey-entries/${id}`, {
    body,
  });
  journeyStore.update((entries) =>
    sorted(
      entries.map((e) => (e.id === id ? entryFromApi(res.data, e.photo?.uri) : e)),
    ),
  );
}

/** Server first (source of truth), then the cache row, then best-effort file. */
export async function deleteEntry(id: string): Promise<void> {
  const entry = journeyStore.get().find((e) => e.id === id);
  await apiRequest('DELETE', `/journey-entries/${id}`);
  journeyStore.update((entries) => entries.filter((e) => e.id !== id));
  if (entry?.photo) deletePhotoFile(entry.photo.uri);
}

export function entriesWithPhotos(entries: JourneyEntry[]): JourneyEntry[] {
  return entries.filter((e) => e.photo);
}
