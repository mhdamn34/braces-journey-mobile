/** Normalized in the photo's own pixel space, origin top-left. Usually 0–1, but
 *  mesh vertices extrapolate slightly past the frame edge — a real photo measured
 *  a chin at y = 1.044 — so consumers must not assume the range.
 *  Resolution-independent, so resize and compression never invalidate it. */
export type Point = { x: number; y: number };

export type Arch = 'upper' | 'lower';

/** Who produced the landmarks. The transform never branches on this — it exists
 *  so a future trained model can replace detection without changing consumers.
 *  'mediapipe' is the server-side detector; 'taps' is the manual editor. */
export type AlignmentSource = 'mediapipe' | 'taps' | 'model';

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
  /** Head nod. NOT correctable, and only the detector can measure it — taps
   *  cannot infer pitch, so this is absent on manually-aligned photos. */
  pitchDeg?: number;
  /** |noseBase→chin| / interpupillary distance. Resolution-independent. */
  openingRatio: number;
  source: AlignmentSource;
  version: 1;
};
