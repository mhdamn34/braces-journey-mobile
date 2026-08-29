import { Directory, File, Paths } from 'expo-file-system';

import type { JourneyEntry } from '@/features/journey/types';
import type { PaymentsState } from '@/features/payments/types';
import type { Profile } from '@/features/profile/types';
import type { Visit } from '@/features/visits/types';
import { createEntry, journeyStore } from '@/features/journey/store';
import { addPayment, paymentsStore, setPlanTotal } from '@/features/payments/store';
import { profileStore } from '@/features/profile/store';
import { saveProfile } from '@/features/profile/api';
import { addVisit, visitsStore } from '@/features/visits/store';
import { ApiError, apiRequest } from '@/lib/api/client';
import { createJsonStore } from '@/lib/store/create-json-store';
import { refreshAllApiStores } from '@/lib/store/create-api-store';

export type LocalSnapshot = {
  profile: Profile;
  entries: JourneyEntry[];
  visits: Visit[];
  payments: PaymentsState;
};

export type MigrationState = {
  completedAt?: string;
  items: Record<string, 'done' | 'failed'>;
  visitIdMap: Record<string, string>;
};

export const migrationStore = createJsonStore<MigrationState>('migration.json', {
  items: {},
  visitIdMap: {},
});

export type MigrationProgress = { done: number; failed: number; total: number; label: string };

/** The store caches still hold the device's v3 data until the first refresh —
 * capture BEFORE any refreshAllApiStores() runs. */
export function captureLocalSnapshot(): LocalSnapshot {
  return {
    profile: profileStore.get(),
    entries: journeyStore.get(),
    visits: visitsStore.get(),
    payments: paymentsStore.get(),
  };
}

export function localDataPresent(s: LocalSnapshot): boolean {
  return (
    s.entries.length > 0 ||
    s.visits.length > 0 ||
    s.payments.records.length > 0 ||
    s.payments.planTotal > 0
  );
}

export function migrationCompleted(): boolean {
  return migrationStore.get().completedAt !== undefined;
}

/** Also used by the merge path and by "skip" — a stamped migration never re-prompts. */
export function markMigrationCompleted(): void {
  migrationStore.update((s) => ({ ...s, completedAt: new Date().toISOString() }));
}

type Meta = { meta: { total: number } };

export async function serverInventory(): Promise<{ entries: number; visits: number; payments: number }> {
  const [entries, visits, payments] = await Promise.all([
    apiRequest<Meta>('GET', '/journey-entries?page=1'),
    apiRequest<Meta>('GET', '/visits?page=1'),
    apiRequest<{ data: unknown[] }>('GET', '/payments'),
  ]);
  return { entries: entries.meta.total, visits: visits.meta.total, payments: payments.data.length };
}

export async function fetchServerMonths(): Promise<Set<number>> {
  const { fetchAllPages } = await import('@/lib/api/pagination');
  const rows = await fetchAllPages<{ month_number: number }>('/journey-entries');
  return new Set(rows.map((r) => r.month_number));
}

function isMonthConflict(e: unknown): boolean {
  return e instanceof ApiError && e.status === 422 && e.fieldErrors?.month_number !== undefined;
}

function status(key: string): 'done' | 'failed' | undefined {
  return migrationStore.get().items[key];
}

function mark(key: string, value: 'done' | 'failed'): void {
  migrationStore.update((s) => ({ ...s, items: { ...s.items, [key]: value } }));
}

export async function runMigration(
  snapshot: LocalSnapshot,
  onProgress: (p: MigrationProgress) => void,
): Promise<{ failed: number }> {
  const entries = [...snapshot.entries].sort((a, b) => a.monthNumber - b.monthNumber);
  const hasPlanTotal = snapshot.payments.planTotal > 0;
  const total =
    1 + snapshot.visits.length + entries.length + snapshot.payments.records.length + (hasPlanTotal ? 1 : 0);
  let done = 0;
  let failed = 0;

  async function step(key: string, label: string, upload: () => Promise<void>): Promise<void> {
    if (status(key) === 'done') {
      done += 1;
    } else {
      try {
        await upload();
        mark(key, 'done');
        done += 1;
      } catch (e) {
        if (isMonthConflict(e)) {
          mark(key, 'done');
          done += 1;
        } else {
          mark(key, 'failed');
          failed += 1;
        }
      }
    }
    onProgress({ done, failed, total, label });
  }

  await step('profile', 'Your profile', async () => {
    await saveProfile({
      name: snapshot.profile.name,
      clinicName: snapshot.profile.clinicName,
      treatmentStartDate: snapshot.profile.treatmentStartDate,
      plannedMonths: snapshot.profile.plannedMonths,
      bracesType: snapshot.profile.bracesType,
    });
  });

  for (const visit of snapshot.visits) {
    await step(`visit:${visit.id}`, visit.title, async () => {
      const created = await addVisit({
        title: visit.title,
        date: visit.date,
        time: visit.time,
        location: visit.location,
        notes: visit.notes,
        status: visit.status,
      });
      migrationStore.update((s) => ({
        ...s,
        visitIdMap: { ...s.visitIdMap, [visit.id]: created.id },
      }));
    });
  }

  for (const entry of entries) {
    const key = `entry:${entry.id}`;
    // A local appointmentId that points at one of this snapshot's visits is a
    // real dependency — don't upload the entry until that visit's upload has
    // actually landed, or the local↔server link is lost forever the moment
    // this entry is marked done with no appointment_id. A dangling
    // appointmentId (no matching local visit) has nothing to wait for.
    const dependentVisit = entry.appointmentId
      ? snapshot.visits.find((v) => v.id === entry.appointmentId)
      : undefined;
    const visitPending = dependentVisit !== undefined && status(`visit:${dependentVisit.id}`) !== 'done';

    if (status(key) !== 'done' && visitPending) {
      mark(key, 'failed');
      failed += 1;
      onProgress({ done, failed, total, label: `Month ${entry.monthNumber}` });
      continue;
    }

    await step(key, `Month ${entry.monthNumber}`, async () => {
      const mappedVisitId = entry.appointmentId
        ? migrationStore.get().visitIdMap[entry.appointmentId]
        : undefined;
      await createEntry({
        monthNumber: entry.monthNumber,
        date: entry.date,
        photoUri: entry.photo?.uri,
        bracketColor: entry.bracketColor,
        note: entry.note,
        appointmentId: mappedVisitId,
      });
    });
  }

  for (const record of snapshot.payments.records) {
    await step(`payment:${record.id}`, 'Payments', async () => {
      await addPayment({ date: record.date, amount: record.amount, method: record.method });
    });
  }

  if (hasPlanTotal) {
    await step('planTotal', 'Plan total', async () => {
      await setPlanTotal(snapshot.payments.planTotal);
    });
  }

  if (failed === 0) {
    markMigrationCompleted();
    await refreshAllApiStores();
    cleanupOrphanPhotoFiles(
      new Set(
        journeyStore
          .get()
          .map((e) => e.photo?.uri)
          .filter((uri): uri is string => uri !== undefined),
      ),
    );
  }

  return { failed };
}

/** After a completed migration the server ids own the photo cache — legacy
 * `<Date.now()>.jpg` files are dead weight. Best-effort. */
function cleanupOrphanPhotoFiles(keep: Set<string>): void {
  try {
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) return;
    for (const item of dir.list()) {
      if (item instanceof File && !keep.has(item.uri)) item.delete();
    }
  } catch {
    // storage cleanup is never worth failing the migration over
  }
}
