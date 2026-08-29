import { Directory, File, Paths } from 'expo-file-system';

import { cachedToken } from '@/lib/api/token';

/** Server-backed photos cached under the same <documentDirectory>/photos/
 * directory photo-files.ts owns, keyed `<entryId>.<ext>` — the flipbook,
 * ghost overlay, and compare keep working offline from these files. */

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create();
  return dir;
}

export function cachedPhotoUri(entryId: string): string | undefined {
  for (const ext of EXTENSIONS) {
    const file = new File(photosDir(), `${entryId}.${ext}`);
    if (file.exists) return file.uri;
  }
  return undefined;
}

async function downloadPhoto(entryId: string, url: string): Promise<string | undefined> {
  try {
    const token = cachedToken();
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return undefined;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const dest = new File(photosDir(), `${entryId}.jpg`);
    dest.write(bytes);
    return dest.uri;
  } catch {
    return undefined; // offline or stream error — entry renders photo-less until next refresh
  }
}

export async function ensurePhotoCached(entryId: string, url: string): Promise<string | undefined> {
  return cachedPhotoUri(entryId) ?? downloadPhoto(entryId, url);
}
