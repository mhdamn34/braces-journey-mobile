# ML Kit Binding Decision

**Date:** 2026-08-30
**Status:** Validated on a physical device (§5). The package works, but detection fails on
3 of 8 real photos and the package's TypeScript types are wrong about landmark names, contour
names and angle flags. Cannot build for the iOS Simulator on Apple Silicon (§2a).
**Resolves:** `2026-08-30-tooth-movement-comparison-design.md` §12 and §15 items 1–2
**Spike task:** Task 12 of `docs/superpowers/plans/2026-08-30-tooth-movement-comparison-phase-1.md`

## Decision

| Purpose | Package | Version |
|---|---|---|
| Still-image detection (import, backfill, review) | **`@infinitered/react-native-mlkit-face-detection`** | 5.0.0 |
| Live frame detection (phase 2 coach + auto-shutter) | **`react-native-vision-camera`** + `react-native-vision-camera-face-detector` | 5.2.3 + 2.0.6 |

**Chin comes from the `faceOval` contour, not from `MOUTH_BOTTOM`.** The spec's fallback is not
needed. See §3.

**Pitch is available**, which the spec assumed it would not be. See §4 — this changes §7 of the
design spec from "known hole" to "gateable".

## 1. Candidates evaluated

### `expo-face-detector` — dead, confirmed

Not a candidate. Last real release **13.0.2 on 2025-01-10**; npm `dist-tags` stop at `sdk-51`
with no tag for SDK 52 or later. A recent `time.modified` on the registry is metadata churn, not
a release. Nothing ships in Expo SDK 56 that replaces it.

### `@react-native-ml-kit/face-detection` 2.0.1 — rejected

The obvious first choice by name, and the API shape is right (`detect(imageURL, options)`
returning landmarks, contours and `rotationX/Y/Z`). Rejected on native integration:

- **Legacy bridge module.** `ios/FaceDetection.m` uses `RCT_EXPORT_MODULE()` / `RCT_EXPORT_METHOD`,
  and Android ships `FaceDetectionModule.java` + `FaceDetectionPackage.java` — the old
  `ReactContextBaseJavaModule` pattern, not a TurboModule. RN 0.85 under Expo SDK 56 is
  bridgeless New Architecture; legacy modules run only through the interop layer.
- **Stale Android build script.** `implementation 'com.facebook.react:react-native:+'` is the
  pre-0.71 Maven coordinate — RN 0.85 publishes `com.facebook.react:react-android`. The
  buildscript also pins `com.android.tools.build:gradle:3.4.1`.
- **No Expo config plugin.** The tarball contains no `app.plugin.js`, and the package's own
  linking error advises "You are not using Expo managed workflow".
- Last published 2025-09-01.

Any one of these is survivable; together they mean fighting the build before writing a line of
feature code.

### `@infinitered/react-native-mlkit-face-detection` 5.0.0 — chosen

- **A real Expo module.** Ships `expo-module.config.json` declaring native modules for iOS and
  Android, so Expo autolinking picks it up during `prebuild` with no manual native edits and no
  config plugin required.
- **Built on the Expo Modules API** (`s.dependency 'ExpoModulesCore'`, `implementation
  project(':expo-modules-core')`), which is New-Architecture-native. This is the decisive
  difference from the rejected package.
- **Ships TypeScript types** (`build/index.d.ts`), so the mapper to `FaceAlignment` is typed
  end to end.
- Android picks up the app's `compileSdkVersion` via `safeExtGet`, so it inherits SDK 56's.
- 23 releases, actively maintained through 4.0.0 and 5.0.0 in November 2025.

## 2a. Blocker found: no iOS Simulator support on Apple Silicon

Discovered by installing the package and building, after §1 was written. It does not change the
choice of package — every ML Kit binding inherits this, because it comes from Google's pod, not
the wrapper — but it changes how the work can be developed and tested.

**What happened.** `npx expo install` succeeded, `expo prebuild --clean` succeeded, and
CocoaPods resolved `GoogleMLKit/FaceDetection`, `MLKitVision`, `MLKitCommon` and `MLImage`
cleanly. The JS bundle built with `0 error(s), and 0 warning(s)`. The build then failed:

```
xcodebuild: error: Unable to find a destination matching the provided destination specifier:
        { id:EC8C9F9C-EA50-439C-A347-47D6A3C60222 }
```

**Cause.** The ML Kit frameworks ship as fat static Mach-O binaries, not `.xcframework`s:

```
MLKitFaceDetection: Mach-O universal binary with 2 architectures
  [x86_64: Mach-O 64-bit object] [arm64]
```

A fat binary cannot distinguish device-arm64 from simulator-arm64, so on an Apple Silicon Mac
the simulator has no usable slice and Xcode drops every simulator destination from the scheme.

**Controlled confirmation.** `xcodebuild -showdestinations` on the same scheme:

| State | Concrete iOS Simulator destinations |
|---|---|
| Before installing ML Kit | 22 |
| With ML Kit installed | **0** (placeholders only) |
| After removing ML Kit again | 22 |

Only the physical device destination survived with ML Kit present.

**Consequences.**

1. **Detection cannot be developed or tested on the simulator.** Device builds only, with
   signing and provisioning. Every other part of this feature — taps, transform, compare,
   quality gate — remains simulator-testable, because none of them need the native module.
2. **`detect.ts` must degrade gracefully when the native module is absent**, not merely when
   detection fails. This is now a hard requirement rather than defensive polish: a simulator
   build will not have the module at all, and the app must fall back to the taps path instead
   of crashing on import. Design spec §9's fallback covers the behaviour; this widens its
   trigger.
3. Switching wrapper packages does not help. `@react-native-ml-kit/face-detection` depends on
   the same `GoogleMLKit/FaceDetection` pod and inherits the same limitation.

## 2b. Risks accepted

1. **Not verified against Expo SDK 56.** 5.0.0 shipped 2025-11-17; nothing since, while Expo has
   moved on. Expo modules usually survive SDK bumps, but this is unproven here and is the main
   risk. Mitigation: it is a leaf dependency behind `detect.ts` — if it breaks, the taps path
   still works and the app still functions.
2. **Unpinned ML Kit.** `GoogleMLKit/FaceDetection` has no version constraint in the podspec and
   Android uses `com.google.mlkit:face-detection:16.+`. Landmark output could drift between
   builds. Mitigation: the evidence-photo fixture in `transform.test.ts` catches gross geometry
   changes, though not detector drift directly — see §5.
3. **`react-native-vision-camera` 5.x pulls a Nitro stack** (`react-native-nitro-modules` 0.37.1,
   `react-native-nitro-image` 0.15.2) as peers. That is three native dependencies for phase 2,
   not one. Deferred with phase 2 — nothing in phase 1 needs it.

## 3. Chin: use the `faceOval` contour

The spec (§12) flagged that a chin point might need contour mode, with `MOUTH_BOTTOM` as a
fallback that would have forced a tighter opening threshold. Resolved in favour of contours.

The landmark set contains **no chin**:

```
leftEye · rightEye · noseBase · leftEar · rightEar · leftEarTip · rightEarTip
leftCheek · rightCheek · leftMouth · rightMouth · bottomMouth
```

But the contour set contains **`faceOval`** — the closed outline of the face. Its bottom-most
point is the chin. So:

- Enable **both** `landmarkMode` and `contourMode`.
- Take `leftEye`, `rightEye`, `noseBase` from landmarks.
- Take **chin = the maximum-y point of the `faceOval` contour**.

This is anatomically the chin rather than lower-lip soft tissue, so the design's mandible
anchoring works as specified and **the `MOUTH_BOTTOM` fallback and its tightened threshold are
not needed.** Spec §12 and §15 item 2 can be closed.

Cost of contour mode: ML Kit detects contours for **only the most prominent face**, and it is
slower than landmarks alone. Both are fine here — this app photographs one face, off the
capture hot path.

## 4. Pitch is available — §7 changes

Each detected face carries all three Euler angles, with explicit presence flags:

```ts
hasHeadEulerAngleX: boolean; headEulerAngleX?: number | null; // pitch — nod
hasHeadEulerAngleY: boolean; headEulerAngleY?: number | null; // yaw  — turn
hasHeadEulerAngleZ: boolean; headEulerAngleZ?: number | null; // roll — tilt
```

Design spec §7 records head pitch as uncorrectable *and* unmeasurable, calling it "a known hole
rather than a solved problem", and §6.2's Pitch row is marked inert. **Detection closes that.**
Once this lands, pitch is measured like yaw and the gate can block on it, exactly as §6.2
anticipates. The `pitchDeg` field deferred in §15 item 4 should ship with this work.

The `has*` flags matter: the angles are optional, so `detect.ts` must treat a missing angle as
"unknown" and skip that check rather than defaulting to `0`, which would read as a perfect
score.

## 5. Device test results

Run on an iPhone 17 Pro Max, Debug build, bundle id `…bracesjourney.spike` so the real app was
untouched. Eight real photos: five bracket colours, jaw shut through wide-open, glasses on and
off, car and studio lighting. `performanceMode: 'accurate'`, `landmarkMode: true`,
`contourMode: true`.

### 5.1 It works — with a detection rate of 5 of 8

| Photo | Detected |
|---|---|
| p01 car, silver | ✅ |
| p02 blue, **wide open**, studio | ❌ **no face** |
| p03 red, glasses | ✅ |
| p04 silver, glasses | ✅ |
| p05 steel, glasses, **wide open** | ❌ **no face** |
| p06 silver, glasses | ✅ |
| p07 blue, glasses | ✅ |
| p08 silver, glasses | ❌ **no face** |

**Glasses are not the problem** — four of the five successes wear them. The two clearest failures
are the two widest-open-mouth shots, which is the worst possible pattern: a wide-open mouth is
exactly what makes an arch photo useful, and it is what the capture guide asks for.

n = 8 is too small to call this causal, but it is large enough to retire the assumption that
detection "just works" on real photos. **The automatic-backfill premise in design spec §9 is
weaker than stated: roughly a third of an existing library may need manual taps anyway.**

Note also that **p02 is one of the three evidence photos** in the `EVIDENCE` fixture — so one of
the fixture's own photos cannot be detected at all.

### 5.2 The hand-measured fixture is validated

Comparing detector output with the eyeballed coordinates in `transform.test.ts`, as normalized
fractions:

| | left eye | right eye | nose base |
|---|---|---|---|
| p01 detector | (0.262, 0.377) | (0.678, 0.351) | (0.473, 0.497) |
| p01 fixture | (0.260, 0.381) | (0.690, 0.347) | (0.462, 0.508) |
| **Δ** | 0.002 / 0.004 | 0.012 / 0.004 | 0.011 / 0.011 |

Agreement to ~1% of frame width on photo 1, ~4–5% on photo 3. The fixture stands; it does not
need re-deriving.

### 5.3 The package's TypeScript types are wrong in three places

All three cost a debugging cycle and would cost the implementer the same. Every one is a silent
failure — wrong name, empty result, no error.

| Declared in types | Actual at runtime |
|---|---|
| `landmarks[].type` camelCase, e.g. `"noseBase"` | **PascalCase**, `"NoseBase"` |
| mouth landmark `"bottomMouth"` | **`"MouthBottom"`** |
| contour `"faceOval"` | **`"Face"`** (36 points) |
| `hasHeadEulerAngleX/Y/Z` flags | **do not exist** — the field is simply absent or present |

`detect.ts` must therefore match landmark and contour types **case-insensitively against the
runtime names**, and must null-check `headEulerAngleX/Y/Z` directly rather than consulting the
`has*` flags §4 originally recommended.

### 5.4 Chin: confirmed, with two caveats

The `Face` contour returns 36 points and its maximum-y point is a usable chin — §3's approach is
correct, only the contour name was wrong. Two things the design must handle:

1. **Contours are not always returned.** p07 detected a face but produced **zero** contours, so
   the chin was unavailable while the eyes and nose base were fine. Lower-arch alignment must
   degrade to unavailable per-photo, not assume a chin whenever a face exists.
2. **The chin can fall outside the image.** p04 returned chin `y = 1.029` — ML Kit extrapolates
   the oval past the frame edge. Landmarks are therefore *not* guaranteed to be within 0–1, which
   the `FaceAlignment` doc comment currently asserts. Either clamp on ingest or relax the
   contract; the API validation in design spec §8 (`between:0,1`) would **reject this payload**.

### 5.5 Angles, including pitch

Present and plausible on every detected photo:

| Photo | yaw | pitch | roll |
|---|---|---|---|
| p01 | −2.7 | 8.3 | 4.8 |
| p03 | −2.4 | 7.8 | −0.0 |
| p04 | 1.4 | 2.6 | −0.9 |
| p06 | −0.9 | 3.4 | 3.8 |
| p07 | −1.7 | 2.0 | 0.9 |

Pitch spans 2.0°–8.3°, confirming design spec §7: pitch genuinely varies across these photos and
is now measurable, so §6.2's inert Pitch row can be activated.

Roll needs a **sign-convention check**: p01 reads +4.8° from ML Kit where the tap editor computed
−5.39° for the same photo. Magnitudes agree; signs are opposite. `detect.ts` must normalize this,
or aligned photos will rotate the wrong way.

## 5a. Previously outstanding (now done)

**Step 3 of the spike is blocked, not merely skipped.** Per §2a, ML Kit cannot build for the iOS
Simulator on Apple Silicon, so running it over the evidence photos requires a physical device
build. The harness for it is straightforward and was written and discarded during the spike: a
throwaway route that reads image files from `<documentDirectory>/spike/`, runs
`new RNMLKitFaceDetector({ performanceMode: 'accurate', landmarkMode: true, contourMode: true })`
over each, and writes the results to a JSON file for comparison against the fixture.

There are now **eight** evidence photos rather than three — five bracket colours, jaw shut through
wide-open, glasses on and off, car and studio lighting — which makes this a far better validation
set than when §1 was written. It is the one
claim in this document resting on documentation rather than observation.

What it must answer, before detection is trusted in `detect.ts`:

1. Is a face detected in all three photos — including photo 3, shot through **glasses**, and
   photo 1, which is **dim and rolled**?
2. How do the returned `leftEye` / `rightEye` / `noseBase` positions compare with the
   hand-measured values in the `EVIDENCE` fixture in
   `src/features/capture/alignment/transform.test.ts`?
3. Is the `faceOval` bottom-most point a plausible chin on all three?
4. Are `headEulerAngleX/Y/Z` present, and do they match the visible roll in photo 1 and the
   pitch spread inferred in design spec §7?

If detection disagrees materially with the hand measurements, the fixture is the thing to
re-derive — it was eyeballed by a human reading the photos, and a detector is likely more
accurate than that, not less. The maths tested against it does not change.

## 6. Integration steps

1. `npx expo install @infinitered/react-native-mlkit-face-detection` (pulls
   `@infinitered/react-native-mlkit-core`).
2. `npx expo prebuild --clean` — autolinking handles both platforms; no config plugin, no manual
   native edits.
3. iOS minimum is driven by `GoogleMLKit/FaceDetection`; confirm the app's deployment target is
   at least what the pod resolves to.
4. Record the dependency and its reason in `AGENTS.md`, which requires a written reason per
   dependency.
5. Implement `src/features/capture/alignment/detect.ts` mapping a detected face to
   `FaceAlignment` with `source: 'mlkit'` — normalizing every point by the image's pixel
   dimensions, and running **after** `resizeForUpload`, per design spec §11.

## 7. Consequences for the design spec

- §12 — chin question resolved: `faceOval` contour, no `MOUTH_BOTTOM` fallback, no tightened
  threshold.
- §15 item 1 — resolved; packages named above.
- §15 item 2 — resolved; can be struck.
- §15 item 4 — `pitchDeg` ships with detection, now justified rather than speculative.
- §7 / §6.2 — pitch moves from unmeasurable to gateable once detection lands.
