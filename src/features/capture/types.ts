import type { AnalysisTone } from '@/features/progress-gallery/types';

/**
 * Issues the verification API (or mock) can report about a captured
 * progress photo. The UI maps each of these to a friendly tip.
 */
export type CaptureIssue =
  | 'good'
  | 'tilt_left'
  | 'tilt_right'
  | 'too_close'
  | 'too_far'
  | 'out_of_frame'
  | 'low_light'
  | 'low_confidence';

/**
 * A typed hint shown to the user when their photo is below threshold.
 * `title` is short, `detail` is a one-sentence coaching tip.
 */
export type CaptureHint = {
  issue: CaptureIssue;
  title: string;
  detail: string;
  tone: AnalysisTone;
};

/**
 * Result returned by the verification service.
 *
 * `score` is 0..100. `isAcceptable` mirrors the threshold check the
 * server performs so the UI doesn't have to duplicate the policy.
 */
export type VerificationResult = {
  score: number;
  isAcceptable: boolean;
  issues: CaptureIssue[];
  hints: CaptureHint[];
  /** ISO timestamp the photo was analyzed */
  analyzedAt: string;
};

/**
 * A photo as it lives on disk + in the in-app gallery.
 * `uri` is either a `file://` (dev) or `https://` (R2/S3) URL.
 */
export type CapturedPhoto = {
  id: string;
  uri: string;
  width: number;
  height: number;
  capturedAt: string;
  score: number;
  isAcceptable: boolean;
  issues: CaptureIssue[];
  note?: string;
};
