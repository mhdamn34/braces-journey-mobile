import type { JourneyEntry } from '@/features/journey/types';
import type { Profile } from '@/features/profile/types';
import type { Visit } from '@/features/visits/types';
import { daysBetween, formatMonthName, monthsBetween } from '@/lib/dates';

export type DueState = 'first' | 'due' | 'done';

/** The month number a new capture should get. Mid-journey installs start at
 * the elapsed month (Feb start + Aug install = Month 7), never Month 1. */
export function suggestedMonthNumber(
  entries: JourneyEntry[],
  profile: Profile,
  todayIsoDate: string,
): number {
  const base = Math.max(1, monthsBetween(profile.treatmentStartDate, todayIsoDate) + 1);
  const maxUsed = entries.reduce((max, e) => Math.max(max, e.monthNumber), 0);
  return maxUsed >= base ? maxUsed + 1 : base;
}

function latestEntryDate(entries: JourneyEntry[]): string | undefined {
  return entries
    .map((e) => (e.photo ? e.photo.capturedAt.slice(0, 10) : e.date))
    .sort()
    .at(-1);
}

function latestCompletedVisit(visits: Visit[]): Visit | undefined {
  return visits
    .filter((v) => v.status === 'completed')
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

export function dueState(
  entries: JourneyEntry[],
  visits: Visit[],
  todayIsoDate: string,
): DueState {
  if (entries.length === 0) return 'first';
  const lastPhotoDate = latestEntryDate(entries)!;
  const lastVisit = latestCompletedVisit(visits);
  if (lastVisit && lastVisit.date > lastPhotoDate) return 'due';
  if (daysBetween(lastPhotoDate, todayIsoDate) >= 30) return 'due';
  return 'done';
}

/** The visit a new capture should link to: the most recent completed visit
 * with no photo taken on or after its date (same condition that makes a month due). */
export function linkableVisitId(entries: JourneyEntry[], visits: Visit[]): string | undefined {
  const lastVisit = latestCompletedVisit(visits);
  if (!lastVisit) return undefined;
  const lastPhotoDate = latestEntryDate(entries);
  if (lastPhotoDate && lastPhotoDate >= lastVisit.date) return undefined;
  return lastVisit.id;
}

/** Propose a month number per import candidate (caller passes them sorted by
 * creation date). Dated photos map to their treatment month; undated ones
 * continue sequentially. Never collides, always ascending. */
export function suggestImportMonths(
  candidates: { creationDateIso?: string }[],
  profile: Profile,
  existingMonths: number[],
): number[] {
  const taken = new Set(existingMonths);
  const result: number[] = [];
  let last = 0;
  for (const candidate of candidates) {
    let month = candidate.creationDateIso
      ? Math.max(1, monthsBetween(profile.treatmentStartDate, candidate.creationDateIso) + 1)
      : last + 1;
    if (month <= last) month = last + 1;
    while (taken.has(month)) month += 1;
    taken.add(month);
    result.push(month);
    last = month;
  }
  return result;
}

export function monthLabel(entry: JourneyEntry): string {
  return `Month ${entry.monthNumber} · ${formatMonthName(entry.date)}`;
}
