import {
  assessAlignment,
  MAX_OPENING_DRIFT,
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
