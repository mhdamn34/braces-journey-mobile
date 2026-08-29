import { signOutLocally } from '@/features/auth/store';
import { deleteAllPhotoFiles } from '@/features/capture/photo-files';
import { resetMigrationState } from '@/features/migration/engine';
import { onUnauthorized } from '@/lib/api/client';
import { resetAllApiStores } from '@/lib/store/create-api-store';

/** Everything a sign-out must wipe — shared by logout() and the 401 handler.
 * A signed-out device must never keep another account's journey (caches,
 * photo files, or migration scratch) where the next sign-in could upload it. */
export async function clearLocalData(): Promise<void> {
  await signOutLocally();
  resetAllApiStores();
  deleteAllPhotoFiles();
  resetMigrationState();
}

/** Registered here rather than inside auth/store so the store stays free of
 * the migration/engine import (and the whole feature-store graph behind it).
 * Called once at startup, beside initAuth(). */
export function initClearLocalDataOnUnauthorized(): void {
  onUnauthorized(() => {
    void clearLocalData();
  });
}
