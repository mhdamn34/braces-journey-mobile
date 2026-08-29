import type { Arch, Point } from '@/features/capture/alignment/types';

/** Aligned stages are 4:5. Chosen against mockups; matches photo-stage.tsx. */
export const STAGE_ASPECT = 4 / 5;

/** Stage height in "square units" where stage width = 1. Rotations computed in
 *  non-square units come out sheared, so all maths runs in this space. */
export const STAGE_HEIGHT = 1 / STAGE_ASPECT;

/** Target eye-line length as a fraction of stage width. Set above the typical
 *  measured value (~0.43) so photos scale UP and crop rather than letterbox. */
export const CANONICAL_IPD = 0.62;

/** Where each arch's translation origin lands, y as a fraction of stage height.
 *  The two sit at opposite ends because the landmarks sit at opposite ends of
 *  their arches: upper teeth are BELOW the nose base, lower teeth are ABOVE the
 *  chin. Derived from the evidence photos — upper teeth ≈ 0.52 × IPD below the
 *  nose base, lower teeth ≈ 0.48 × IPD above the chin. */
export const CANONICAL_ORIGIN: Record<Arch, Point> = {
  upper: { x: 0.5, y: 0.3 },
  lower: { x: 0.5, y: 0.85 },
};
