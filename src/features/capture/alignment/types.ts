/** Normalized 0–1 in the photo's own pixel space, origin top-left.
 *  Resolution-independent, so resize and compression never invalidate it. */
export type Point = { x: number; y: number };

export type Arch = 'upper' | 'lower';

/** Who produced the landmarks. The transform never branches on this — it exists
 *  so a future trained model can replace detection without changing consumers. */
export type AlignmentSource = 'mlkit' | 'taps' | 'model';

export type FaceAlignment = {
  leftEye: Point;
  rightEye: Point;
  /** Translation origin for the upper arch — rigid to the skull. */
  noseBase: Point;
  /** Translation origin for the lower arch — rides with the mandible. */
  chin: Point;
  /** Head tilt. Correctable by the transform. */
  rollDeg: number;
  /** Head turn. NOT correctable — gated at capture, never corrected. */
  yawDeg: number;
  /** |noseBase→chin| / interpupillary distance. Resolution-independent. */
  openingRatio: number;
  source: AlignmentSource;
  version: 1;
};
