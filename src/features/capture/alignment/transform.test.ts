import {
  CANONICAL_IPD,
  CANONICAL_ORIGIN,
  STAGE_HEIGHT,
} from '@/features/capture/alignment/canonical';
import { alignmentTransform, applyStageTransform } from '@/features/capture/alignment/transform';
import type { FaceAlignment } from '@/features/capture/alignment/types';

/** 800×1000 is exactly 4:5, so image space maps to stage space with no crop —
 *  it keeps the hand-computed expectations readable. */
const IMAGE = { width: 800, height: 1000 };

function alignment(overrides: Partial<FaceAlignment> = {}): FaceAlignment {
  return {
    leftEye: { x: 0.3, y: 0.3 },
    rightEye: { x: 0.7, y: 0.3 },
    noseBase: { x: 0.5, y: 0.45 },
    chin: { x: 0.5, y: 0.78 },
    rollDeg: 0,
    yawDeg: 0,
    openingRatio: 0.82,
    source: 'taps',
    version: 1,
    ...overrides,
  };
}

test('a level face produces pure scale and vertical translation', () => {
  const t = alignmentTransform(alignment(), IMAGE, 'upper')!;

  // eyes are 0.4 apart in stage units; canonical wants CANONICAL_IPD
  expect(t.scale).toBeCloseTo(CANONICAL_IPD / 0.4, 6);
  expect(t.rotationRad).toBeCloseTo(0, 6);
  expect(t.tx).toBeCloseTo(0, 6);
  expect(t.ty).toBeLessThan(0); // nose base pulled up toward y = 0.30
});

test('after transform the eyes land horizontal and CANONICAL_IPD apart', () => {
  const a = alignment({ leftEye: { x: 0.28, y: 0.34 }, rightEye: { x: 0.66, y: 0.41 } });
  const t = alignmentTransform(a, IMAGE, 'upper')!;

  const toStage = (p: { x: number; y: number }) => ({ x: p.x, y: p.y * STAGE_HEIGHT });
  const l = applyStageTransform(toStage(a.leftEye), t);
  const r = applyStageTransform(toStage(a.rightEye), t);

  expect(r.y - l.y).toBeCloseTo(0, 6);
  expect(Math.hypot(r.x - l.x, r.y - l.y)).toBeCloseTo(CANONICAL_IPD, 6);
});

test('the upper origin lands on the canonical upper origin', () => {
  const a = alignment();
  const t = alignmentTransform(a, IMAGE, 'upper')!;
  const p = applyStageTransform({ x: a.noseBase.x, y: a.noseBase.y * STAGE_HEIGHT }, t);

  expect(p.x).toBeCloseTo(CANONICAL_ORIGIN.upper.x, 6);
  expect(p.y).toBeCloseTo(CANONICAL_ORIGIN.upper.y * STAGE_HEIGHT, 6);
});

test('the lower origin lands on the canonical lower origin', () => {
  const a = alignment();
  const t = alignmentTransform(a, IMAGE, 'lower')!;
  const p = applyStageTransform({ x: a.chin.x, y: a.chin.y * STAGE_HEIGHT }, t);

  expect(p.x).toBeCloseTo(CANONICAL_ORIGIN.lower.x, 6);
  expect(p.y).toBeCloseTo(CANONICAL_ORIGIN.lower.y * STAGE_HEIGHT, 6);
});

test('upper and lower differ only in translation', () => {
  const upper = alignmentTransform(alignment(), IMAGE, 'upper')!;
  const lower = alignmentTransform(alignment(), IMAGE, 'lower')!;

  expect(lower.scale).toBeCloseTo(upper.scale, 6);
  expect(lower.rotationRad).toBeCloseTo(upper.rotationRad, 6);
  expect(lower.ty).not.toBeCloseTo(upper.ty, 3);
});

test('jaw opening does not move the upper arch', () => {
  const shut = alignmentTransform(alignment({ chin: { x: 0.5, y: 0.7 } }), IMAGE, 'upper')!;
  const wide = alignmentTransform(alignment({ chin: { x: 0.5, y: 0.92 } }), IMAGE, 'upper')!;

  expect(wide.scale).toBeCloseTo(shut.scale, 6);
  expect(wide.ty).toBeCloseTo(shut.ty, 6);
});

test('jaw opening does move the lower arch frame', () => {
  const shut = alignmentTransform(alignment({ chin: { x: 0.5, y: 0.7 } }), IMAGE, 'lower')!;
  const wide = alignmentTransform(alignment({ chin: { x: 0.5, y: 0.92 } }), IMAGE, 'lower')!;

  expect(wide.ty).not.toBeCloseTo(shut.ty, 3);
});

test('a portrait photo of a different aspect still lands the eyes correctly', () => {
  const a = alignment();
  const t = alignmentTransform(a, { width: 768, height: 1024 }, 'upper')!;

  const s0 = Math.max(1 / 768, STAGE_HEIGHT / 1024);
  const toStage = (p: { x: number; y: number }) => ({
    x: 0.5 + (p.x - 0.5) * 768 * s0,
    y: STAGE_HEIGHT / 2 + (p.y - 0.5) * 1024 * s0,
  });
  const l = applyStageTransform(toStage(a.leftEye), t);
  const r = applyStageTransform(toStage(a.rightEye), t);

  expect(Math.hypot(r.x - l.x, r.y - l.y)).toBeCloseTo(CANONICAL_IPD, 6);
});

test('degenerate landmarks return null rather than an exploding scale', () => {
  const coincident = alignment({ leftEye: { x: 0.5, y: 0.5 }, rightEye: { x: 0.5, y: 0.5 } });
  expect(alignmentTransform(coincident, IMAGE, 'upper')).toBeNull();
});
