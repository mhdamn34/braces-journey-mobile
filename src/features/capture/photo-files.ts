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
  new File(tempUri).copy(dest);
  return dest.uri;
}

export function deletePhotoFile(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    // best-effort: a missing file is fine
  }
}
