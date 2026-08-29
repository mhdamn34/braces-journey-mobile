import {
  captureLocalSnapshot,
  fetchServerMonths,
  localDataPresent,
  markMigrationCompleted,
  migrationCompleted,
  serverInventory,
} from '@/features/migration/engine';
import { refreshAllApiStores } from '@/lib/store/create-api-store';

/** Decides where sign-in lands. Must run BEFORE any refresh — the caches
 * still hold the device's v3 data at this point. Every '/' return stamps the
 * migration completed first, so a later 401/sign-in cycle can never misroute
 * into migration off caches the refresh is about to overwrite. */
export async function routeAfterSignIn(): Promise<'/migrate' | '/merge-months' | '/'> {
  const snapshot = captureLocalSnapshot();

  if (!localDataPresent(snapshot) || migrationCompleted()) {
    markMigrationCompleted();
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

  markMigrationCompleted();
  await refreshAllApiStores();
  return '/';
}

/** Decides where a fresh registration lands. A brand-new account is empty by
 * definition, so no server inventory call. A v3 user with local data was
 * already onboarded — migration uploads their intact local profile
 * (onboardedAt included), so it replaces the pager, not the other way round. */
export function routeAfterRegister(): '/migrate' | '/onboarding' {
  const snapshot = captureLocalSnapshot();
  if (localDataPresent(snapshot) && !migrationCompleted()) return '/migrate';
  return '/onboarding';
}
