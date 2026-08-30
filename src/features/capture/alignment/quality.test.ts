import {
  assessAlignment,
  MAX_OPENING_DRIFT,
  MAX_PITCH_DEG,
  MAX_ROLL_DEG,
  MAX_YAW_DEG,
} from '@/features/capture/alignment/quality';
import type { FaceAlignment } from '@/features/capture/alignment/types';

function alignment(overrides: Partial<FaceAlignment> = {}): FaceAlignment {
  return {
    leftEye: { x: 0.28, y: 0.3 },
    rightEye: { x: 0.72, y: 0.3 },
    noseBase: { x: 0.5, y: 0.45 },
    chin: { x: 0.5, y: 0.78 },
    rollDeg: 0,
    yawDeg: 0,
    openingRatio: 0.82,
    source: 'mediapipe',
    version: 1,
    ...overrides,
  };
}

test('a square, level, close-enough face passes', () => {
  const v = assessAlignment(alignment());
  expect(v.ok).toBe(true);
  expect(v.blocking).toBe(false);
  expect(v.issues).toEqual([]);
});

test('excessive yaw blocks, because it cannot be corrected', () => {
  const v = assessAlignment(alignment({ yawDeg: MAX_YAW_DEG + 1 }));
  expect(v.ok).toBe(false);
  expect(v.blocking).toBe(true);
  expect(v.issues).toContain('yaw');
});

test('yaw exactly at the threshold is allowed', () => {
  expect(assessAlignment(alignment({ yawDeg: MAX_YAW_DEG })).blocking).toBe(false);
});

test('negative yaw is judged by magnitude', () => {
  expect(assessAlignment(alignment({ yawDeg: -(MAX_YAW_DEG + 1) })).blocking).toBe(true);
});

test('excessive roll warns but never blocks — it is fully correctable', () => {
  const v = assessAlignment(alignment({ rollDeg: MAX_ROLL_DEG + 5 }));
  expect(v.ok).toBe(false);
  expect(v.blocking).toBe(false);
  expect(v.issues).toContain('roll');
});

test('a face too small in frame warns', () => {
  const v = assessAlignment(
    alignment({ leftEye: { x: 0.45, y: 0.3 }, rightEye: { x: 0.6, y: 0.3 } }),
  );
  expect(v.issues).toContain('too-far');
  expect(v.blocking).toBe(false);
});

test('tapped landmarks skip the yaw check — taps cannot measure yaw', () => {
  const v = assessAlignment(alignment({ source: 'taps', yawDeg: 45 }));
  expect(v.issues).not.toContain('yaw');
  expect(v.blocking).toBe(false);
});

test('lower arch warns when the jaw opening drifts from the target', () => {
  const v = assessAlignment(alignment({ openingRatio: 0.82 * (1 + MAX_OPENING_DRIFT + 0.05) }), {
    arch: 'lower',
    targetOpeningRatio: 0.82,
  });
  expect(v.issues).toContain('opening-mismatch');
  expect(v.blocking).toBe(false);
});

test('the opening check does not fire without a calibrated target', () => {
  const v = assessAlignment(alignment({ openingRatio: 5 }), { arch: 'lower' });
  expect(v.issues).not.toContain('opening-mismatch');
});

test('the opening check does not apply to the upper arch', () => {
  const v = assessAlignment(alignment({ openingRatio: 5 }), {
    arch: 'upper',
    targetOpeningRatio: 0.82,
  });
  expect(v.issues).not.toContain('opening-mismatch');
});

test('pitch beyond the threshold warns but never blocks', () => {
  const verdict = assessAlignment(alignment({ source: 'mediapipe', pitchDeg: -25 }));

  expect(verdict.issues).toContain('pitch');
  expect(verdict.blocking).toBe(false);
});

test('pitch at the threshold is accepted', () => {
  expect(
    assessAlignment(alignment({ source: 'mediapipe', pitchDeg: -MAX_PITCH_DEG })).issues,
  ).not.toContain('pitch');
});

test('absent pitch is unknown, not perfect', () => {
  expect(assessAlignment(alignment({ source: 'taps' })).issues).not.toContain('pitch');
});

test('opening mismatch is only judged between photos of the same source', () => {
  // Drift of 30%, well past MAX_OPENING_DRIFT, so the only thing separating
  // these two cases is the source of the reference measurement.
  const detected = alignment({ source: 'mediapipe', openingRatio: 1.3 });

  // Tapped anchors measure the same jaw differently, so this is not evidence
  // the jaw moved — see spec 2026-08-30 §9.2.
  expect(
    assessAlignment(detected, { arch: 'lower', targetOpeningRatio: 1.0, targetSource: 'taps' })
      .issues,
  ).not.toContain('opening-mismatch');

  expect(
    assessAlignment(detected, {
      arch: 'lower',
      targetOpeningRatio: 1.0,
      targetSource: 'mediapipe',
    }).issues,
  ).toContain('opening-mismatch');
});

test('an unspecified target source still compares, for callers that have one photo', () => {
  expect(
    assessAlignment(alignment({ source: 'mediapipe', openingRatio: 1.5 }), {
      arch: 'lower',
      targetOpeningRatio: 1.0,
    }).issues,
  ).toContain('opening-mismatch');
});
