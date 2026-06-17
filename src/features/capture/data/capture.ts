import type { AnalysisTone } from '@/features/progress-gallery/types';
import type { CaptureHint, CaptureIssue } from '@/features/capture/types';

/**
 * Threshold at or above which the verification result is considered
 * "perfect" — the UI hides the retry nudge above this and shows it
 * below it (with a "Save anyway" option).
 */
export const ACCEPTABLE_SCORE_THRESHOLD = 70;

/**
 * Each known issue maps to a friendly hint. The UI uses this table
 * to render the "Try again" tips.
 */
export const captureHintMap: Record<CaptureIssue, Omit<CaptureHint, 'issue'>> = {
  good: {
    title: 'Looking great',
    detail: 'Your teeth are centered, well-lit, and easy to compare later.',
    tone: 'teal',
  },
  tilt_left: {
    title: 'Tilt your head right',
    detail: 'Your chin is leaning a bit to the left — straighten up.',
    tone: 'blue',
  },
  tilt_right: {
    title: 'Tilt your head left',
    detail: 'Your chin is leaning a bit to the right — straighten up.',
    tone: 'blue',
  },
  too_close: {
    title: 'Step back a little',
    detail: 'Move the phone slightly farther so we can see the whole smile.',
    tone: 'pink',
  },
  too_far: {
    title: 'Come closer',
    detail: 'Bring the phone in so the teeth fill more of the frame.',
    tone: 'pink',
  },
  out_of_frame: {
    title: 'Center your smile',
    detail: 'Your mouth is near the edge — re-center it inside the guide.',
    tone: 'pink',
  },
  low_light: {
    title: 'Find more light',
    detail: 'Try a brighter room so the brackets are easy to see.',
    tone: 'blue',
  },
  low_confidence: {
    title: 'Hold still',
    detail: 'A little movement made the analysis unsure — try again.',
    tone: 'teal',
  },
};

/**
 * Convenience for the capture screen to map a list of issues into
 * fully-typed hints.
 */
export function buildHints(issues: CaptureIssue[]): CaptureHint[] {
  if (issues.length === 0 || issues[0] === 'good') {
    return [{ issue: 'good', ...captureHintMap.good }];
  }
  return issues.map((issue) => ({ issue, ...captureHintMap[issue] }));
}

/**
 * Tone helper for the result card. Mirrors the progress gallery
 * color vocabulary.
 */
export function scoreTone(score: number): AnalysisTone {
  if (score >= 80) return 'teal';
  if (score >= 60) return 'blue';
  return 'pink';
}
