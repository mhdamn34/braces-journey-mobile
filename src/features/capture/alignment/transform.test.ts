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

/** Derived from the three evidence photos in spec §3. All 768×1024.
 *  Photo 1: rolled, moderate opening. Photo 2: level, wide open.
 *  Photo 3: level, nearly shut, and shot slightly further away (IPD 310 vs ~330). */
const EVIDENCE = {
  photo1: alignment({
    leftEye: { x: 200 / 768, y: 390 / 1024 },
    rightEye: { x: 530 / 768, y: 355 / 1024 },
    noseBase: { x: 355 / 768, y: 520 / 1024 },
    chin: { x: 360 / 768, y: 940 / 1024 },
  }),
  photo2: alignment({
    leftEye: { x: 215 / 768, y: 350 / 1024 },
    rightEye: { x: 545 / 768, y: 350 / 1024 },
    noseBase: { x: 378 / 768, y: 520 / 1024 },
    chin: { x: 378 / 768, y: 985 / 1024 },
  }),
  photo3: alignment({
    leftEye: { x: 215 / 768, y: 375 / 1024 },
    rightEye: { x: 525 / 768, y: 370 / 1024 },
    noseBase: { x: 370 / 768, y: 555 / 1024 },
    chin: { x: 370 / 768, y: 930 / 1024 },
  }),
};

const EVIDENCE_IMAGE = { width: 768, height: 1024 };

const EVIDENCE_S0 = Math.max(1 / EVIDENCE_IMAGE.width, STAGE_HEIGHT / EVIDENCE_IMAGE.height);

function toEvidenceStage(p: { x: number; y: number }) {
  return {
    x: 0.5 + (p.x - 0.5) * EVIDENCE_IMAGE.width * EVIDENCE_S0,
    y: STAGE_HEIGHT / 2 + (p.y - 0.5) * EVIDENCE_IMAGE.height * EVIDENCE_S0,
  };
}

function alignedEyes(a: FaceAlignment) {
  const t = alignmentTransform(a, EVIDENCE_IMAGE, 'upper')!;
  return {
    left: applyStageTransform(toEvidenceStage(a.leftEye), t),
    right: applyStageTransform(toEvidenceStage(a.rightEye), t),
  };
}

const ALL_EVIDENCE = [EVIDENCE.photo1, EVIDENCE.photo2, EVIDENCE.photo3];

test('all three evidence photos anchor their nose base to the canonical origin', () => {
  // The nose base is the upper-arch anchor, so this is the invariant that must
  // hold exactly. A similarity transform has 4 DOF: scale and rotation pin the
  // eye line's length and angle, translation pins the nose base. Nothing is left
  // over to also pin absolute eye position — see the spread test below.
  for (const a of ALL_EVIDENCE) {
    const t = alignmentTransform(a, EVIDENCE_IMAGE, 'upper')!;
    const p = applyStageTransform(toEvidenceStage(a.noseBase), t);

    expect(p.x).toBeCloseTo(CANONICAL_ORIGIN.upper.x, 6);
    expect(p.y).toBeCloseTo(CANONICAL_ORIGIN.upper.y * STAGE_HEIGHT, 6);
  }
});

test('all three evidence photos end level and at the same eye-line length', () => {
  for (const a of ALL_EVIDENCE) {
    const { left, right } = alignedEyes(a);

    expect(right.y - left.y).toBeCloseTo(0, 6);
    expect(Math.hypot(right.x - left.x, right.y - left.y)).toBeCloseTo(CANONICAL_IPD, 6);
  }
});

test('residual eye-position spread is bounded (characterization)', () => {
  // Characterization, not a correctness property. Once the nose base is pinned
  // there is no freedom left to also pin the eyes, so whatever varies in each
  // face's nose-to-eye offset shows up here. Measured on the evidence photos:
  // x spread 0.044, y spread 0.093 (square units, stage width = 1).
  //
  // The vertical figure is the larger one because nose-to-eye distance varies
  // 148-183px across the three — that is head PITCH foreshortening the face.
  // Like yaw, it is out-of-plane and a similarity transform cannot undo it.
  //
  // This is an eye-region figure. The teeth sit near the anchor, so their
  // residual is far smaller. Bounds are empirical with modest headroom; if they
  // start failing, the landmarks or the pitch gate changed — investigate, do
  // not raise them.
  const xs = ALL_EVIDENCE.map((a) => alignedEyes(a).left.x);
  const ys = ALL_EVIDENCE.map((a) => alignedEyes(a).left.y);

  expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.05);
  expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.1);
});

test("photo 1's roll is corrected to level", () => {
  const { left, right } = alignedEyes(EVIDENCE.photo1);
  expect(right.y - left.y).toBeCloseTo(0, 6);
});

test("photo 3's greater shooting distance is scaled to match photo 2", () => {
  const two = alignmentTransform(EVIDENCE.photo2, EVIDENCE_IMAGE, 'upper')!;
  const three = alignmentTransform(EVIDENCE.photo3, EVIDENCE_IMAGE, 'upper')!;

  expect(three.scale).toBeGreaterThan(two.scale); // shot further away, scaled up more
  expect(three.scale / two.scale).toBeCloseTo(330 / 310, 1);
});

test('the wide-open vs nearly-shut jaw does not disturb upper-arch alignment', () => {
  const two = alignmentTransform(EVIDENCE.photo2, EVIDENCE_IMAGE, 'upper')!;
  const three = alignmentTransform(EVIDENCE.photo3, EVIDENCE_IMAGE, 'upper')!;
  const nudged = alignmentTransform(
    { ...EVIDENCE.photo2, chin: { x: 378 / 768, y: 700 / 1024 } },
    EVIDENCE_IMAGE,
    'upper',
  )!;

  expect(nudged.ty).toBeCloseTo(two.ty, 9);
  expect(nudged.scale).toBeCloseTo(two.scale, 9);
  expect(three.ty).toBeDefined();
});
