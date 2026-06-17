import {
  ACCEPTABLE_SCORE_THRESHOLD,
  buildHints,
} from '@/features/capture/data/capture';
import type { CaptureIssue, VerificationResult } from '@/features/capture/types';

/**
 * The real verification API contract (when the backend is ready):
 *
 *   POST /verify-progress-photo
 *     body: multipart/form-data with `image` (jpeg) and `width`, `height`
 *     response: {
 *       score: number,            // 0..100
 *       isAcceptable: boolean,    // server-applied threshold
 *       issues: CaptureIssue[],
 *     }
 *
 * For now we ship a deterministic mock that produces realistic-looking
 * results so the entire capture flow is testable end-to-end. The
 * caller doesn't know whether the result came from the API or the
 * mock — the UI just consumes a `VerificationResult`.
 *
 * To wire the real API later, replace `verifyPhotoMock` with
 * `verifyPhoto` and post the file via `fetch` to the endpoint.
 */

const ALL_ISSUES: CaptureIssue[] = [
  'tilt_left',
  'tilt_right',
  'too_close',
  'too_far',
  'out_of_frame',
  'low_light',
  'low_confidence',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickIssues(seed: number): CaptureIssue[] {
  // The mock always returns 0–2 issues. Higher scores = fewer issues.
  const r1 = seed % 7;
  const r2 = (seed >> 3) % 7;
  const set = new Set<CaptureIssue>();
  if (r1 < 3) set.add(ALL_ISSUES[r1]);
  if (r2 !== r1 && r2 < 2) set.add(ALL_ISSUES[r2]);
  return Array.from(set);
}

/**
 * Mock verifier. Returns a stable score for a given `uri` + the
 * current minute, so retakes during the same minute yield similar
 * (not identical) results — realistic enough for UI dev.
 */
export function verifyPhotoMock(input: {
  uri: string;
  width: number;
  height: number;
}): Promise<VerificationResult> {
  return new Promise((resolve) => {
    const minuteBucket = Math.floor(Date.now() / 1500); // changes every 1.5s
    const seed = hashString(`${input.uri}-${minuteBucket}`);
    const score = 50 + (seed % 51); // 50..100
    const issues = score >= ACCEPTABLE_SCORE_THRESHOLD ? [] : pickIssues(seed);
    const result: VerificationResult = {
      score,
      isAcceptable: score >= ACCEPTABLE_SCORE_THRESHOLD,
      issues,
      hints: buildHints(issues),
      analyzedAt: new Date().toISOString(),
    };
    setTimeout(() => resolve(result), 900);
  });
}

/**
 * Real verifier (stub). Falls back to the mock if the API URL isn't
 * configured. The shape matches the contract above.
 */
export async function verifyPhoto(input: {
  uri: string;
  width: number;
  height: number;
}): Promise<VerificationResult> {
  const endpoint = process.env.EXPO_PUBLIC_VERIFY_PHOTO_URL;
  if (!endpoint) {
    return verifyPhotoMock(input);
  }

  try {
    const form = new FormData();
    // RN supports { uri, name, type } file objects in FormData.
    form.append('image', {
      uri: input.uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    form.append('width', String(input.width));
    form.append('height', String(input.height));

    const res = await fetch(endpoint, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`verify api ${res.status}`);
    const data = (await res.json()) as {
      score: number;
      isAcceptable: boolean;
      issues: CaptureIssue[];
    };
    return {
      score: data.score,
      isAcceptable: data.isAcceptable,
      issues: data.issues ?? [],
      hints: buildHints(data.issues ?? []),
      analyzedAt: new Date().toISOString(),
    };
  } catch {
    // Network / API failure — degrade to the mock so the user is
    // never blocked from saving a photo.
    return verifyPhotoMock(input);
  }
}
