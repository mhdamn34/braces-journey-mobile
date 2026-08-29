import {
  captureLocalSnapshot,
  fetchServerMonths,
  localDataPresent,
  migrationCompleted,
  serverInventory,
} from '@/features/migration/engine';
import { refreshAllApiStores } from '@/lib/store/create-api-store';

/** Decides where sign-in lands. Must run BEFORE any refresh — the caches
 * still hold the device's v3 data at this point. */
export async function routeAfterSignIn(): Promise<'/migrate' | '/merge-months' | '/'> {
  const snapshot = captureLocalSnapshot();

  if (!localDataPresent(snapshot) || migrationCompleted()) {
    await refreshAllApiStores();
    return '/';
  }

  const inventory = await serverInventory();
  const serverEmpty =
    inventory.entries === 0 && inventory.visits === 0 && inventory.payments === 0;

  if (serverEmpty) return '/migrate';

  const serverMonths = await fetchServerMonths();
  const localOnly = snapshot.entries.filter((e) => !serverMonths.has(e.monthNumber));
  if (localOnly.length > 0) return '/merge-months';

  await refreshAllApiStores();
  return '/';
}
