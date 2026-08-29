import { Directory, File, Paths } from 'expo-file-system';

/** Photo files live in <documentDirectory>/photos/. The journey store is the
 * single source of truth — these helpers only move bytes. */

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create();
  return dir;
}

export function persistPhotoFile(tempUri: string, id: string): string {
  const rawExt = tempUri.split('.').pop()?.split('?')[0] ?? '';
  // When the path has no dot, split('.').pop() returns the whole path,
  // which fails this regex — so extension-less URIs fall back to jpg.
  const ext = /^[a-zA-Z0-9]{2,5}$/.test(rawExt) ? rawExt : 'jpg';
  const dest = new File(photosDir(), `${id}.${ext}`);
  new File(tempUri).copySync(dest);
  return dest.uri;
}

export function deletePhotoFile(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    // best-effort: a missing file is fine
  }
}

/** Sign-out wipe: a signed-out device must not keep the previous account's
 * photos where the next sign-in could upload them. Best-effort. */
export function deleteAllPhotoFiles(): void {
  try {
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) return;
    for (const item of dir.list()) {
      if (item instanceof File) item.delete();
    }
  } catch {
    // storage cleanup is never worth failing a sign-out over
  }
}
