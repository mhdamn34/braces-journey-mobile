import type { AlignmentSource, Arch, FaceAlignment } from '@/features/capture/alignment/types';

/** Head turn. The only BLOCKING check — a similarity transform cannot undo
 *  out-of-plane rotation, so yaw silently fakes tooth movement. */
export const MAX_YAW_DEG = 8;
/** Head tilt. Fully correctable, so this only warns. */
export const MAX_ROLL_DEG = 15;
/** Head nod. Like yaw, a similarity transform cannot undo it — but unlike yaw it
 *  does not block, because the evidence photos span 4.9°–15.4° of perfectly
 *  usable pitch and blocking there would reject the user's whole library.
 *  Only the detector measures it; taps leave it absent. */
export const MAX_PITCH_DEG = 20;
/** Eye-line width as a fraction of frame width. Below this, detail is lost. */
export const MIN_IPD_FRACTION = 0.25;
/** Fractional drift in openingRatio before the lower arch is called mismatched. */
export const MAX_OPENING_DRIFT = 0.15;

export type QualityIssue = 'yaw' | 'roll' | 'pitch' | 'too-far' | 'opening-mismatch';

export type QualityVerdict = {
  ok: boolean;
  blocking: boolean;
  issues: QualityIssue[];
  message: string | null;
};

const MESSAGES: Record<QualityIssue, string> = {
  yaw: 'Turn to face the camera straight on.',
  roll: 'Hold your head a little more level.',
  pitch: 'Hold the camera level with your mouth, not above or below it.',
  'too-far': 'Come closer — your teeth are too small in the frame.',
  'opening-mismatch': "Your jaw is open wider than last month's photo.",
};

export function assessAlignment(
  alignment: FaceAlignment,
  options: { arch?: Arch; targetOpeningRatio?: number; targetSource?: AlignmentSource } = {},
): QualityVerdict {
  const { arch = 'upper', targetOpeningRatio, targetSource } = options;
  const issues: QualityIssue[] = [];

  // Taps place points but assert nothing about head orientation, so a tapped
  // yawDeg carries no information and must not gate.
  if (alignment.source !== 'taps' && Math.abs(alignment.yawDeg) > MAX_YAW_DEG) {
    issues.push('yaw');
  }
  if (Math.abs(alignment.rollDeg) > MAX_ROLL_DEG) issues.push('roll');
  // Absent pitch is unknown, not zero — defaulting would read as a perfect score.
  if (alignment.pitchDeg !== undefined && Math.abs(alignment.pitchDeg) > MAX_PITCH_DEG) {
    issues.push('pitch');
  }

  const ipdFraction = Math.abs(alignment.rightEye.x - alignment.leftEye.x);
  if (ipdFraction < MIN_IPD_FRACTION) issues.push('too-far');

  // Detected and tapped landmarks measure openings ~7-13% apart because the mesh
  // vertices are not where a human taps, so comparing across sources would warn
  // about a jaw that never moved. See spec 2026-08-30 §9.2.
  const sourcesComparable = targetSource === undefined || targetSource === alignment.source;

  if (
    arch === 'lower' &&
    sourcesComparable &&
    targetOpeningRatio !== undefined &&
    targetOpeningRatio > 0
  ) {
    const drift = Math.abs(alignment.openingRatio - targetOpeningRatio) / targetOpeningRatio;
    if (drift > MAX_OPENING_DRIFT) issues.push('opening-mismatch');
  }

  const blocking = issues.includes('yaw');
  return {
    ok: issues.length === 0,
    blocking,
    issues,
    message: issues.length === 0 ? null : MESSAGES[issues[0]],
  };
}
