import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { CapturedPhoto } from '@/features/capture/types';

/**
 * Local-only photo storage for now.
 *
 * Files are written to `<documentDirectory>/progress-photos/`. We
 * keep a small JSON index at `<documentDirectory>/progress-photos/index.json`
 * so the gallery can list all captured photos without scanning
 * the directory.
 *
 * The `CapturedPhoto` shape is identical to what a future R2/S3
 * sync would persist, so the UI doesn't need to change.
 */

const PHOTO_DIR = `${FileSystem.documentDirectory ?? ''}progress-photos/`;
const INDEX_FILE = `${PHOTO_DIR}index.json`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

async function readIndex(): Promise<CapturedPhoto[]> {
  try {
    const info = await FileSystem.getInfoAsync(INDEX_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(INDEX_FILE);
    return JSON.parse(raw) as CapturedPhoto[];
  } catch {
    return [];
  }
}

async function writeIndex(photos: CapturedPhoto[]): Promise<void> {
  await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(photos));
}

function fileUriFromTmp(tmpUri: string): string {
  // expo-camera returns `file://...` on iOS. On Android it can return
  // a content URI. We always copy to our own directory and return a
  // stable `file://` path.
  if (Platform.OS === 'ios') return tmpUri;
  return tmpUri;
}

/**
 * Persist a captured photo. `tmpUri` is the URI returned by the camera.
 * Returns the fully-formed `CapturedPhoto` ready to add to the gallery.
 */
export async function savePhoto(input: {
  tmpUri: string;
  width: number;
  height: number;
  score: number;
  isAcceptable: boolean;
  issues: CapturedPhoto['issues'];
  note?: string;
}): Promise<CapturedPhoto> {
  await ensureDir();

  const id = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const extension = input.tmpUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const dest = `${PHOTO_DIR}${id}.${extension}`;

  // Copy the temp capture to our own directory so it survives the
  // camera's temp cleanup.
  await FileSystem.copyAsync({ from: input.tmpUri, to: dest });

  const photo: CapturedPhoto = {
    id,
    uri: fileUriFromTmp(dest),
    width: input.width,
    height: input.height,
    capturedAt: new Date().toISOString(),
    score: input.score,
    isAcceptable: input.isAcceptable,
    issues: input.issues,
    note: input.note,
  };

  const index = await readIndex();
  index.unshift(photo); // newest first
  await writeIndex(index);

  return photo;
}

/**
 * List every captured photo, newest first.
 */
export async function listPhotos(): Promise<CapturedPhoto[]> {
  return readIndex();
}

/**
 * Remove a photo from disk + the index. Used if the user undoes a save.
 */
export async function deletePhoto(id: string): Promise<void> {
  const index = await readIndex();
  const target = index.find((p) => p.id === id);
  if (target) {
    try {
      await FileSystem.deleteAsync(target.uri, { idempotent: true });
    } catch {
      /* ignore */
    }
  }
  const next = index.filter((p) => p.id !== id);
  await writeIndex(next);
}

/**
 * Replace a photo in the index (e.g. when the user adds a note).
 */
export async function updatePhoto(updated: CapturedPhoto): Promise<void> {
  const index = await readIndex();
  const next = index.map((p) => (p.id === updated.id ? updated : p));
  await writeIndex(next);
}
