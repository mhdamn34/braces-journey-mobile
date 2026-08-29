import { ensurePhotoCached } from '@/features/journey/photo-cache';
import type { JourneyEntry } from '@/features/journey/types';
import { fetchAllPages } from '@/lib/api/pagination';

export type ApiJourneyEntry = {
  id: number;
  month_number: number;
  photo_date: string | null;
  bracket_color_name: string | null;
  bracket_color_hex: string | null;
  notes: string | null;
  appointment_id: number | null;
  photo_url: string | null;
  created_at: string | null;
};

export function entryFromApi(e: ApiJourneyEntry, photoUri: string | undefined): JourneyEntry {
  const date = e.photo_date ?? '';
  return {
    id: String(e.id),
    monthNumber: e.month_number,
    date,
    photo: photoUri
      ? { uri: photoUri, width: 1200, height: 1600, capturedAt: `${date}T12:00:00.000Z` }
      : undefined,
    bracketColor:
      e.bracket_color_name && e.bracket_color_hex
        ? { name: e.bracket_color_name, hex: e.bracket_color_hex }
        : undefined,
    note: e.notes ?? undefined,
    appointmentId: e.appointment_id !== null ? String(e.appointment_id) : undefined,
  };
}

export async function fetchEntries(): Promise<JourneyEntry[]> {
  const rows = await fetchAllPages<ApiJourneyEntry>('/journey-entries');
  const entries = await Promise.all(
    rows.map(async (row) => {
      const uri = row.photo_url ? await ensurePhotoCached(String(row.id), row.photo_url) : undefined;
      return entryFromApi(row, uri);
    }),
  );
  return entries.sort((a, b) => a.monthNumber - b.monthNumber);
}
