# Tooth Movement Comparison — Alignment & Arch Compare

**Date:** 2026-08-30
**Status:** Approved design, pending implementation plan
**Repos touched:** `braces-journey-mobile` (primary), `braces-journey-be` (one migration + contract)

## 1. What this is

Today the Compare screen shows two months side by side under a wipe slider, with both
photos rendered `contentFit="cover"`. Each photo is fitted to the stage independently, so
any difference in shooting distance, head tilt or framing is rendered *as if it were tooth
movement*. The ghost overlay in the camera helps a careful user line up a new shot, but it
is advisory — nothing records how well they matched it, imported photos get no help at all,
and nothing downstream can correct what went wrong.

This design makes the comparison honest: every photo is normalized into one canonical frame
using landmarks that do not move during orthodontic treatment, so what remains on screen is
movement rather than photography.

### Goals

1. **Comparison that can be trusted** — framing error is corrected, not displayed as signal.
2. **Retroactive** — photos already in the journey are fixed without the user re-shooting or
   re-tapping anything.
3. **Honest about its limits** — errors that cannot be corrected are prevented at capture or
   surfaced as warnings, never silently "corrected" into a plausible-looking lie.
4. **A seam for a future model** — the alignment source is swappable, so a trained model can
   replace detection later without touching the maths, the storage or the UI.

### Non-goals

- Measurement in millimetres. No physical scale reference exists in the photos, so any number
  would be fabricated. The app shows movement; it does not quantify it.
- Any clinical claim, score, or assessment.
- Correcting head yaw, head pitch, or jaw-opening perspective after the fact — see §7.

## 2. Decisions made during brainstorming

| Decision | Choice | Why |
|---|---|---|
| What the feature claims | Trustworthy visual comparison, no numbers | Honest ceiling for uncontrolled phone photos |
| Alignment reference | Face landmarks (eyes, nose base, chin) | Rigid to the skull — cannot cancel tooth movement |
| Rejected: tooth anchors | Back-most visible bracket | It is a *different tooth* per shot (see §3), and teeth move |
| Normalization target | One canonical frame per arch | Avoids N² pairwise relationships; adding a month never changes old pairs |
| Transform class | Similarity (scale, rotation, translation) | Affine/homography can shear and would absorb real movement |
| Stage aspect | `4 : 5` | Chosen against mockups; matches `photo-stage.tsx`, so the journey feed is untouched |
| Arches | Upper **and** lower, separate translation origins | Lower teeth ride the mandible, not the skull |
| Anchor persistence | Raw landmarks on the API, not a derived transform | Lossless — maths can improve, or a model can overwrite, without re-tapping |
| Photos without alignment | Skippable; compare degrades honestly | No forced backfill, no hidden months |
| Taps | Manual fallback + source for the overlay graphic | Alignment no longer needs them; they keep the `source` seam alive |
| Phasing | Detection in phase 1, live coaching/auto-shutter in phase 2 | Detection is load-bearing and retroactive; coaching only helps future photos |

## 3. Evidence

Three real photos from the user were measured during design. They drove three corrections to
earlier drafts and should be kept as the regression fixture.

| | Photo 1 (car) | Photo 2 (blue) | Photo 3 (glasses) |
|---|---|---|---|
| Framing | full face | full face | full face |
| Interpupillary distance | ~332px | ~330px | ~310px |
| Teeth span | ~40% of frame width | ~40% | ~38% |
| Jaw | moderately open | wide open | nearly closed |
| Head roll | visibly tilted | level | slight |
| Lighting | dim, warm | bright, neutral | bright, neutral |

**What the photos proved:**

1. **"Back-most visible bracket" is not a landmark.** Photo 2 (wide open) exposes more posterior
   teeth than photo 3 (nearly closed), so that anchor lands on a different tooth in different
   months. The baseline would change for reasons unrelated to treatment, and normalization
   scales by exactly that error.
2. **Shots are full-face, so rigid skull landmarks are always available** — including through
   glasses (photo 3). This was not assumed in earlier drafts, which designed for a mouth crop.
3. **Jaw opening is the largest inconsistency, larger than distance or angle.** IPD varies only
   ~7% across the three; jaw opening varies from wide open to shut.

## 4. Alignment model

### 4.1 Types

```ts
// src/features/capture/alignment/types.ts
/** Normalized 0–1 in the photo's own pixel space, origin top-left.
 *  Resolution-independent, so resize/compress never invalidates it. */
export type Point = { x: number; y: number };

export type FaceAlignment = {
  leftEye: Point;
  rightEye: Point;
  noseBase: Point;              // translation origin for the upper arch
  chin: Point;                  // translation origin for the lower arch
  rollDeg: number;              // correctable
  yawDeg: number;               // NOT correctable — gated, never corrected
  pitchDeg?: number;            // NOT correctable either (§7); absent for 'taps'
  openingRatio: number;         // |noseBase→chin| / IPD, resolution-independent
  source: 'mlkit' | 'taps' | 'model';
  version: 1;
};
```

`source` is the forward-compatibility seam. A future trained model writes the identical shape
with `source: 'model'`; the transform code never learns which producer it got. `version`
allows re-deriving existing photos if the maths changes.

Normalized coordinates also sidestep an existing defect: `src/features/journey/api.ts` hardcodes
`width: 1200, height: 1600` for every server photo, discarding real dimensions. Because
landmarks are fractions, that staleness cannot corrupt alignment.

### 4.2 Canonical frames

```ts
// src/features/capture/alignment/canonical.ts
export const STAGE_ASPECT = 4 / 5;          // width / height
export const CANONICAL_IPD = 0.62;          // eye-line length as a fraction of stage width
export const CANONICAL_UPPER_ORIGIN = { x: 0.5, y: 0.30 };   // where noseBase lands
export const CANONICAL_LOWER_ORIGIN = { x: 0.5, y: 0.94 };   // where chin lands
```

The two origins sit at opposite ends of the stage because the landmarks sit at opposite ends
of their arches. The upper teeth are **below** the nose base, so the nose is placed high; the
lower teeth are **above** the chin, so the chin is placed low. Derived from the evidence
photos: upper teeth fall roughly `0.52 × IPD` below the nose base, lower teeth roughly
`0.48 × IPD` above the chin, which lands each arch near the middle of the stage.

The lower origin is `0.94` rather than a gentler value because of a coverage constraint found
in the simulator, not by calculation. A typical selfie leaves only ~9% of image height below the
chin — about `0.18` square units once `s0 × scale` is applied. Whatever fraction of the stage
sits below the chin must be filled from that. At `0.85` the stage asks for `0.1875` and
letterboxes badly; at `0.90` it asks for `0.125` and still clips at the corners once roll
rotates the frame; `0.94` asks for `0.075` and covers. Verified against the evidence photos at
roll −5.4°.

Note what is *not* an acceptable fix here. Increasing scale to guarantee coverage, or clamping
translation to keep the image on stage, would each break the property the whole design rests on:
that every photo of an arch shares one scale and one frame. A photo nudged to fit would show
false movement against its neighbours. The canonical constants must fit the data instead.

Every photo is normalized to a fixed canonical frame, **not pairwise against its partner**.
One transform per photo, computed once, cached, and reused by compare, the player and the
filmstrip alike. Pairwise alignment would make each photo's rendering depend on what it is
being compared against, and adding a new month would silently change how old pairs look.

`CANONICAL_IPD` is chosen so the scale factor lands at or above 1 for typical shots, meaning
photos crop rather than letterbox. It is calibrated from the user's own first aligned photo
rather than left at the constant — the user's IPD varies only ~7%, so their own baseline is
a better target than any global default. The constant above is the fallback when no calibrated
value exists yet.

### 4.3 The transform

Maths runs in **square units** — stage width `= 1`, stage height `= 1 / STAGE_ASPECT`. Landmarks
are stored as fractions of the *image*, which has a different aspect ratio; computing a rotation
in mismatched non-square units produces shear.

Step 1 — where a landmark lands under the base `cover` layout:

```
s0 = max(1 / w_img, (1 / STAGE_ASPECT) / h_img)
p  = ( 0.5 + (nx − 0.5)·w_img·s0,
       0.5 / STAGE_ASPECT + (ny − 0.5)·h_img·s0 )
```

Step 2 — the similarity transform, with `origin` = `noseBase` (upper) or `chin` (lower):

```
scale    = CANONICAL_IPD / |p_rightEye − p_leftEye|
rotation = −atan2(p_rightEye − p_leftEye)          // canonical eye line is horizontal
tx, ty   = q_origin − C − scale·R·(p_origin − C)   // C = stage centre
```

The `− C` term is required because React Native's default transform origin is the view's
**centre**, not its top-left. Omitting it shifts every photo by half a stage. This is the single
easiest defect to introduce here and gets a dedicated test.

```ts
// src/features/capture/alignment/transform.ts — pure, unit-tested
export type Arch = 'upper' | 'lower';
export type StageTransform = { scale: number; rotationRad: number; tx: number; ty: number };

export function alignmentTransform(
  alignment: FaceAlignment,
  image: { width: number; height: number },
  arch: Arch,
): StageTransform;
```

Everything is dimensionless, so a transform is computed once per (photo, arch) and reused at
any stage size.

Step 3 — application:

```tsx
// src/features/journey/components/aligned-photo.tsx
transform: [
  { translateX: t.tx * stageW }, { translateY: t.ty * stageW },
  { rotate: `${t.rotationRad}rad` }, { scale: t.scale },
]
```

React Native composes these as `T·R·S` — scale reaches the point first, translate last. That
ordering is load-bearing and is pinned by a test against hand-computed pixel positions rather
than taken on faith from documentation.

## 5. Why the lower arch differs

The upper arch is rigid to the skull, so eyes and nose pin it exactly. The lower teeth are
attached to the **mandible**, which swings. Aligning the lower arch on skull landmarks would
render jaw opening as tooth movement — and in the evidence photos that difference dwarfs any
real movement.

The correction is narrow: **only the translation origin changes**, from `noseBase` to `chin`.
Scale and roll still come from the eye line, because camera distance and head tilt do not care
which arch is in view. The chin rides with the mandible exactly as the lower teeth do, so jaw
opening cancels.

Compare gains an Upper/Lower toggle. `transform.ts` is unchanged; it is simply told which
origin to use.

## 6. Capture

### 6.1 Static guide (phase 1)

A fixed outline drawn over the camera preview as a framing target. Requires no detection and
replaces the current ghost overlay's job of "get roughly the same shot".

It frames the **face**, not the mouth — the oval must enclose the eyes, nose base and chin,
because those are the landmarks alignment reads. A mouth-only target would teach the user to
shoot tight crops with no landmarks in frame, breaking both the tap editor and, later,
detection. `GhostOverlay` is kept
as an option the user can toggle, since it remains useful for judging colour and lighting.

### 6.2 Quality gate

| Check | Threshold | Action |
|---|---|---|
| No face detected | — | Fall back to manual taps |
| Yaw | > 8° | **Block / warn** — uncorrectable, and it fakes movement |
| Pitch | > 8° | **Block / warn**, once detection supplies the angle — see §7 |
| Roll | > 15° | Allow, correct silently — fully correctable |
| Face too small | IPD < 25% of frame width | Warn — too far, detail lost |
| Opening mismatch (lower arch) | `openingRatio` differs > 15% from the calibrated target | Warn |

The calibrated target is the `openingRatio` of the user's first successfully aligned photo —
the same first-photo calibration used for `CANONICAL_IPD` in §4.2. Until one exists, the
opening check does not fire.

Yaw and pitch are the checks that block, because they are the ones that lie — both are
out-of-plane and neither can be undone after the fact. Pitch is unmeasurable until detection
lands (taps cannot infer it), so its row is inert in phase 1; §7 records that as a known hole.
These are starting values to tune against real photos, not settled constants; they live in one
module so tuning is a single-file change.

### 6.3 Opening coach and auto-shutter (phase 2)

`openingRatio` gives a live coach — "open a little wider" until this month matches last month's
jaw position. The same signal is the auto-shutter trigger: fire when yaw is square, roll is
small, and opening matches. One mechanism covering both problems.

## 7. Known limits

A similarity transform corrects scale, in-plane rotation and translation. Everything below is
outside that set, so it is stated plainly in the UI, prevented, or warned about — never
silently "corrected".

1. **Head yaw is not correctable.** Turning left or right is out-of-plane rotation. Yaw makes
   one side's teeth larger, which reads as movement. Prevented at capture, gated on import —
   the only blocking check.
2. **Head pitch is not correctable either.** Nodding up or down foreshortens the face, which
   moves the landmarks relative to each other rather than rigidly. Measured on the evidence
   photos: nose-to-eye distance varies 148–183px across the three, a ~24% spread that is
   pitch, not shooting distance. This is the main contributor to the residual characterized in
   §14. Same family as yaw, and it should be gated the same way once detection supplies a pitch
   angle; until then it is unmeasured, which is a known hole rather than a solved problem.
3. **Jaw opening rotates the lower arch out of plane.** Closed, the lower teeth are seen
   edge-on; wide open, from above onto the chewing surfaces. No 2D transform fixes this, which
   is why the coach matters more for the lower arch than the upper.
4. **Lighting and colour vary** and are not normalized. They do not affect geometry.

## 8. Persistence and API contract

Mobile leads the contract; the backend follows.

**Backend (`braces-journey-be`)**

- Migration: nullable `alignment` JSON column on `progress_photos`.
- `ProgressPhoto`: add `alignment` to `$fillable` and cast to `array`.
- `StoreJourneyEntryRequest` / `UpdateJourneyEntryRequest`: nested array validation for the
  `FaceAlignment` shape; the whole object is optional and nullable.
- `JourneyEntryResource`: expose `alignment`.

**Mobile**

- `ApiJourneyEntry.alignment: ApiFaceAlignment | null`, mapped in `src/features/journey/api.ts`.
- `JourneyEntry.alignment?: FaceAlignment` in `src/features/journey/types.ts`.

`null` means "not aligned yet" — the state of every existing row.

**Note:** the dev database is a live MySQL instance. The migration must not be run against it
without explicit confirmation.

## 9. Backfill and degradation

Because detection runs on stills, existing photos are aligned **with no user action**: a one-time
pass over the journey after upgrade, writing `alignment` per entry. This is the main reason
detection moved into phase 1 — it fixes the user's existing library, which taps never could.

Backfill writes go through the API like any other mutation and therefore require a connection,
consistent with the read-cached / write-online rule in `AGENTS.md`.

Where detection fails, `alignment` stays `null` and:

- Compare falls back to today's `contentFit="cover"` behaviour for that pair.
- A quiet "not aligned — add anchors" affordance appears, opening the manual tap editor.
- No month is ever hidden from the pickers.

## 10. Module layout

```
src/features/capture/alignment/
  types.ts            ← FaceAlignment, Point, Arch
  canonical.ts        ← canonical frames + calibration
  transform.ts        ← pure maths (unit-tested)
  detect.ts           ← ML Kit still-image detection → FaceAlignment
  quality.ts          ← the gate thresholds and verdicts
  components/
    anchor-editor.tsx ← manual tap fallback
src/features/journey/components/
  aligned-photo.tsx   ← applies a StageTransform
```

All files stay under the ~150-line rule in `AGENTS.md`. Only stores and
`src/features/capture/photo-files.ts` touch persistence; these modules are pure or
detection-only.

## 11. Ordering constraint

`src/app/import-photos.tsx` currently passes the raw picker URI into `createEntry`, which
resizes internally via `resizeForUpload`. `expo-image-manipulator` bakes EXIF orientation
during that resize, so landmarks detected on the original would be against the wrong pixels.

**Detection and tapping must run on the final stored image, after resize.** The same rule makes
front-camera mirroring a non-issue: `src/app/camera.tsx` mirrors the *preview* only, and
alignment never reads the preview.

## 12. Dependencies

New dependencies require a written reason in `AGENTS.md`:

- **A still-image ML Kit face detector** — required for import and for backfilling existing
  photos, which is the feature's main value. This is the load-bearing addition.
- **A camera frame-processor binding** (phase 2 only) — required for live coaching and
  auto-shutter.

The exact packages are to be confirmed during planning against Expo SDK 56 / RN 0.85 and the
project's CNG prebuild setup, with the shortlist verified for maintenance status and New
Architecture support before selection.

**Chin landmark:** ML Kit's basic landmark set provides eyes, nose base and mouth points; a true
chin point comes from *contour* detection, a heavier mode. If contour detection proves
unavailable or inaccurate, the fallback is `MOUTH_BOTTOM`, accepting that it is lower-lip soft
tissue that also moves with expression — in which case the lower-arch opening threshold in §6.2
tightens to compensate. This choice is made at planning against real detector output on the
three evidence photos, not at implementation time.

## 13. Phasing

**Phase 1 — trustworthy compare**

1. `alignment` column, model, request validation, resource (backend).
2. `alignment/` module: types, canonical, transform, detect, quality.
3. Still-image detection on capture and import, after resize.
4. One-time backfill of existing entries.
5. `aligned-photo.tsx`; rewrite `compare.tsx` to use it; stage `3/4` → `4/5`.
6. Upper/Lower toggle, opening-mismatch warning, unaligned fallback + affordance.
7. Static capture guide.
8. Manual tap editor as the detection-failure fallback.

**Phase 2 — prevention**

9. Frame-processor detection on the live preview.
10. Live yaw/roll/opening coach; auto-shutter on all-green.
11. Arch overlay graphic driven by taps (`source: 'taps'`), the groundwork for the future model.

## 14. Testing

Per `AGENTS.md`: pure logic is unit-tested, screens are verified in the iOS simulator.

- `alignment/transform.test.ts` — maths against hand-computed pixel positions. Explicitly pins
  the centre-origin translation and the `T·R·S` composition order.
- Degenerate inputs: coincident eyes, zero IPD, extreme roll, missing chin.
- `alignment/quality.test.ts` — each gate threshold at, above and below the boundary.
- **Regression fixture from the three evidence photos** — the real acceptance test for the
  feature. A similarity transform has four degrees of freedom, and all four are spent: scale and
  rotation pin the eye line's length and angle, translation pins the nose base. Nothing is left
  to also pin absolute eye position, so "the eye lines coincide" is not an achievable criterion
  and must not be asserted. Assert instead:
  - every photo's **nose base lands exactly on the canonical origin** (the anchor);
  - every photo's **eye line ends level and exactly `CANONICAL_IPD` long**;
  - **upper-arch normalization is unchanged by the jaw differences** between photos 2 and 3;
  - photo 1's roll is corrected to level, and photo 3's greater shooting distance scales up to
    match photo 2.

  Then **characterize** the leftover eye-position spread rather than asserting it away —
  measured at x 0.044, y 0.093 in square units. It is an eye-region figure; the teeth sit near
  the anchor and their residual is far smaller. If those bounds start failing, the landmarks or
  the pitch situation changed: investigate, do not raise them.
- `journey/api.test.ts` — the `alignment` mapper, including the `null` case.
- Compare screen (both arches, aligned and unaligned pairs): simulator.

## 15. Open decisions deferred to planning

Each has a decided fallback, so none blocks implementation:

1. Exact ML Kit packages (§12) — fallback is to ship phase 1 with the manual tap editor as the
   only alignment source and add detection when the binding is settled.
2. Chin vs `MOUTH_BOTTOM` (§12) — fallback is `MOUTH_BOTTOM` with a tightened opening threshold.
3. Gate thresholds (§6.2) — starting values given; tuned against real photos in one module.
4. `pitchDeg` (§4.1) ships with the detection follow-up, not phase 1: taps cannot infer pitch,
   so adding the field earlier would persist a value that is always absent. Landing it means
   extending the API validation in §8 and deciding whether it warrants a `version` bump — the
   fallback is to keep `version: 1` and treat the field as optional, since every consumer
   already tolerates its absence.
