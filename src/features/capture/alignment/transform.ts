import {
  CANONICAL_IPD,
  CANONICAL_ORIGIN,
  STAGE_HEIGHT,
} from '@/features/capture/alignment/canonical';
import type { Arch, FaceAlignment, Point } from '@/features/capture/alignment/types';

/** Scale, rotation and translation in square units (stage width = 1).
 *  tx and ty are BOTH multiplied by stage *width* at render time. */
export type StageTransform = { scale: number; rotationRad: number; tx: number; ty: number };

/** Below this the eye line is too short to trust — scale would explode. */
export const MIN_STAGE_IPD = 0.05;

type ImageSize = { width: number; height: number };

/** Where a normalized image point lands under the base `contentFit="cover"` layout. */
function toStage(p: Point, image: ImageSize): Point {
  const s0 = Math.max(1 / image.width, STAGE_HEIGHT / image.height);
  return {
    x: 0.5 + (p.x - 0.5) * image.width * s0,
    y: STAGE_HEIGHT / 2 + (p.y - 0.5) * image.height * s0,
  };
}

/** Mirrors React Native's `[translate, rotate, scale]` composition — T·R·S about
 *  the view CENTRE. Kept here so the tests and the renderer share one definition
 *  of the semantics rather than trusting the docs twice. */
export function applyStageTransform(point: Point, t: StageTransform): Point {
  const cx = 0.5;
  const cy = STAGE_HEIGHT / 2;
  const vx = point.x - cx;
  const vy = point.y - cy;
  const cos = Math.cos(t.rotationRad);
  const sin = Math.sin(t.rotationRad);
  return {
    x: cx + (vx * cos - vy * sin) * t.scale + t.tx,
    y: cy + (vx * sin + vy * cos) * t.scale + t.ty,
  };
}

export function alignmentTransform(
  alignment: FaceAlignment,
  image: ImageSize,
  arch: Arch,
): StageTransform | null {
  const left = toStage(alignment.leftEye, image);
  const right = toStage(alignment.rightEye, image);

  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const ipd = Math.hypot(dx, dy);
  if (!Number.isFinite(ipd) || ipd < MIN_STAGE_IPD) return null;

  const scale = CANONICAL_IPD / ipd;
  const rotationRad = -Math.atan2(dy, dx); // canonical eye line is horizontal

  const origin = toStage(arch === 'upper' ? alignment.noseBase : alignment.chin, image);
  const target = CANONICAL_ORIGIN[arch];

  const cx = 0.5;
  const cy = STAGE_HEIGHT / 2;
  const vx = origin.x - cx;
  const vy = origin.y - cy;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  // Subtracting the centre is required: RN's transform origin is the view centre,
  // not its top-left. Omitting it shifts every photo by half a stage.
  return {
    scale,
    rotationRad,
    tx: target.x - cx - (vx * cos - vy * sin) * scale,
    ty: target.y * STAGE_HEIGHT - cy - (vx * sin + vy * cos) * scale,
  };
}
