import type { FaceAlignment, Point } from '@/features/capture/alignment/types';
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
  /** Optional so cached payloads and older servers still typecheck. */
  alignment?: ApiFaceAlignment | null;
};

export type ApiPoint = { x: number; y: number };

export type ApiFaceAlignment = {
  left_eye: ApiPoint;
  right_eye: ApiPoint;
  nose_base: ApiPoint;
  chin: ApiPoint;
  roll_deg: number;
  yaw_deg: number;
  opening_ratio: number;
  source: FaceAlignment['source'];
  version: number;
};

const point = (p: ApiPoint): Point => ({ x: p.x, y: p.y });

export function alignmentFromApi(raw: ApiFaceAlignment | null): FaceAlignment | undefined {
  if (!raw) return undefined;
  return {
    leftEye: point(raw.left_eye),
    rightEye: point(raw.right_eye),
    noseBase: point(raw.nose_base),
    chin: point(raw.chin),
    rollDeg: raw.roll_deg,
    yawDeg: raw.yaw_deg,
    openingRatio: raw.opening_ratio,
    source: raw.source,
    version: 1,
  };
}

export function alignmentToApi(alignment: FaceAlignment): ApiFaceAlignment {
  return {
    left_eye: point(alignment.leftEye),
    right_eye: point(alignment.rightEye),
    nose_base: point(alignment.noseBase),
    chin: point(alignment.chin),
    roll_deg: alignment.rollDeg,
    yaw_deg: alignment.yawDeg,
    opening_ratio: alignment.openingRatio,
    source: alignment.source,
    version: alignment.version,
  };
}

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
    alignment: alignmentFromApi(e.alignment ?? null),
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
