import type { Arch, FaceAlignment } from '@/features/capture/alignment/types';

/** Head turn. The only BLOCKING check — a similarity transform cannot undo
 *  out-of-plane rotation, so yaw silently fakes tooth movement. */
export const MAX_YAW_DEG = 8;
/** Head tilt. Fully correctable, so this only warns. */
export const MAX_ROLL_DEG = 15;
/** Eye-line width as a fraction of frame width. Below this, detail is lost. */
export const MIN_IPD_FRACTION = 0.25;
/** Fractional drift in openingRatio before the lower arch is called mismatched. */
export const MAX_OPENING_DRIFT = 0.15;

export type QualityIssue = 'yaw' | 'roll' | 'too-far' | 'opening-mismatch';

export type QualityVerdict = {
  ok: boolean;
  blocking: boolean;
  issues: QualityIssue[];
  message: string | null;
};

const MESSAGES: Record<QualityIssue, string> = {
  yaw: 'Turn to face the camera straight on.',
  roll: 'Hold your head a little more level.',
  'too-far': 'Come closer — your teeth are too small in the frame.',
  'opening-mismatch': "Your jaw is open wider than last month's photo.",
};

export function assessAlignment(
  alignment: FaceAlignment,
  options: { arch?: Arch; targetOpeningRatio?: number } = {},
): QualityVerdict {
  const { arch = 'upper', targetOpeningRatio } = options;
  const issues: QualityIssue[] = [];

  // Taps place points but assert nothing about head orientation, so a tapped
  // yawDeg carries no information and must not gate.
  if (alignment.source !== 'taps' && Math.abs(alignment.yawDeg) > MAX_YAW_DEG) {
    issues.push('yaw');
  }
  if (Math.abs(alignment.rollDeg) > MAX_ROLL_DEG) issues.push('roll');

  const ipdFraction = Math.abs(alignment.rightEye.x - alignment.leftEye.x);
  if (ipdFraction < MIN_IPD_FRACTION) issues.push('too-far');

  if (arch === 'lower' && targetOpeningRatio !== undefined && targetOpeningRatio > 0) {
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
