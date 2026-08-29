# Tooth Movement Comparison — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize every journey photo into a canonical frame using rigid face landmarks, so the Compare screen shows tooth movement instead of framing differences.

**Architecture:** Landmarks are stored per photo as normalized 0–1 points on the API. A pure similarity transform (scale, rotation, translation) maps each photo into one canonical frame per arch — nose base for the upper arch, chin for the lower, because the mandible swings independently of the skull. Compare renders through that transform; photos without landmarks fall back to today's behaviour.

**Tech Stack:** Expo SDK 56, React Native 0.85, expo-router, Reanimated 4, Jest + jest-expo (mobile); Laravel + Pest (backend).

**Spec:** `docs/superpowers/specs/2026-08-30-tooth-movement-comparison-design.md`

## Scope of this plan

This plan implements the spec **except automatic ML Kit detection**. Spec §15 defers the choice of ML Kit binding to planning, and it cannot be resolved without verifying candidate packages against Expo SDK 56 / RN 0.85 and the CNG prebuild. Writing detection tasks now would mean inventing package names and APIs.

So this plan delivers the full alignment system with **manual taps as the landmark source** (`source: 'taps'`), which is exactly the fallback the spec names in §15. Every consumer — storage, transform, compare, quality gate — is written against `FaceAlignment` and is indifferent to which producer filled it in. Task 12 is a time-boxed spike that selects the binding; detection then lands as a small follow-up plan that adds one producer and a backfill pass.

**What this defers:** automatic retroactive backfill of existing photos. Until detection ships, a user aligns a photo by tapping four points. This is the single largest benefit named in spec §9, and it is postponed, not cancelled.

**Out of scope entirely (spec phase 2, separate plan):** live frame-processor detection, the opening coach, auto-shutter, and the tap-driven arch overlay graphic.

## Global Constraints

Copied from `AGENTS.md` and the spec. Every task's requirements implicitly include these.

- All colours, type and spacing come from `src/theme/tokens.ts`. No hex literals in screens — exceptions are bracket swatches and chrome drawn over photos or camera.
- Camera, review, player and compare always render dark (`darkColors`).
- Icons via `src/components/icon.tsx`. Never emoji.
- Components ≤ ~150 lines, one per file.
- Dates cross the API boundary as `YYYY-MM-DD`. Screens never see ISO datetimes.
- API calls only via `apiRequest` from `src/lib/api/client.ts`.
- Write actions in screens go through `useAsyncAction`.
- New dependencies require a written reason in `AGENTS.md`. **This plan adds no new dependencies.**
- Mobile leads the API contract; the backend follows.
- Pure logic is unit-tested (`npm test`); screens are verified in the iOS simulator.
- Landmark coordinates are **normalized 0–1 in the photo's own pixel space**, never raw pixels.
- **The dev MySQL database is live.** Never run `php artisan migrate` against it without explicit confirmation. Pest runs on sqlite `:memory:` (`phpunit.xml`), so `composer test` is safe.

## File Structure

**Created — mobile**

| File | Responsibility |
|---|---|
| `src/features/capture/alignment/types.ts` | `Point`, `Arch`, `AlignmentSource`, `FaceAlignment` |
| `src/features/capture/alignment/canonical.ts` | Canonical frame constants |
| `src/features/capture/alignment/transform.ts` | Pure similarity-transform maths |
| `src/features/capture/alignment/transform.test.ts` | Maths tests incl. the evidence-photo regression |
| `src/features/capture/alignment/quality.ts` | Gate thresholds and verdicts |
| `src/features/capture/alignment/quality.test.ts` | Gate boundary tests |
| `src/features/capture/alignment/components/anchor-editor.tsx` | Four-tap landmark editor |
| `src/features/journey/components/aligned-photo.tsx` | Renders an entry through a `StageTransform` |
| `src/app/align/[id].tsx` | Route hosting the editor |

**Modified — mobile**

| File | Change |
|---|---|
| `src/features/journey/types.ts` | Add `alignment?: FaceAlignment` to `JourneyEntry` |
| `src/features/journey/api.ts` | `ApiFaceAlignment`, `alignmentFromApi`, `alignmentToApi`, wire into `entryFromApi` |
| `src/features/journey/api.test.ts` | Mapper tests |
| `src/features/journey/store.ts` | `setEntryAlignment` mutation |
| `src/app/compare.tsx` | Stage `3/4` → `4/5`, arch toggle, aligned rendering, fallback affordance |
| `src/app/camera.tsx` | Static guide overlay |
| `AGENTS.md` | Structure entry for `alignment/` |

**Created / modified — backend**

| File | Change |
|---|---|
| `database/migrations/*_add_alignment_to_progress_photos_table.php` | Nullable JSON `alignment` |
| `app/Models/ProgressPhoto.php` | `alignment` in `#[Fillable]`, cast to `array` |
| `app/Http/Requests/.../StoreJourneyEntryRequest.php` | Nested validation |
| `app/Http/Requests/.../UpdateJourneyEntryRequest.php` | Nested validation |
| `app/Http/Resources/Api/Mobile/V1/JourneyEntryResource.php` | Expose `alignment` |
| `tests/Feature/Api/Mobile/V1/JourneyEntryTest.php` | Alignment round-trip tests |

---

### Task 1: Backend — persist `alignment`

**Files:**
- Create: `braces-journey-be/database/migrations/2026_08_30_100000_add_alignment_to_progress_photos_table.php`
- Modify: `braces-journey-be/app/Models/ProgressPhoto.php`
- Modify: `braces-journey-be/app/Http/Requests/Api/Mobile/V1/JourneyEntries/StoreJourneyEntryRequest.php`
- Modify: `braces-journey-be/app/Http/Requests/Api/Mobile/V1/JourneyEntries/UpdateJourneyEntryRequest.php`
- Modify: `braces-journey-be/app/Http/Resources/Api/Mobile/V1/JourneyEntryResource.php`
- Test: `braces-journey-be/tests/Feature/Api/Mobile/V1/JourneyEntryTest.php`

**Interfaces:**
- Consumes: nothing.
- Produces: the `alignment` JSON field on `POST`/`PATCH /api/mobile/v1/journey-entries` and in the resource. Shape is exactly the `ApiFaceAlignment` type defined in Task 4.

- [ ] **Step 1: Write the failing test**

Append to `tests/Feature/Api/Mobile/V1/JourneyEntryTest.php`:

```php
function alignmentPayload(array $overrides = []): array
{
    return array_merge([
        'left_eye' => ['x' => 0.30, 'y' => 0.30],
        'right_eye' => ['x' => 0.70, 'y' => 0.30],
        'nose_base' => ['x' => 0.50, 'y' => 0.45],
        'chin' => ['x' => 0.50, 'y' => 0.78],
        'roll_deg' => 0.0,
        'yaw_deg' => 0.0,
        'opening_ratio' => 0.82,
        'source' => 'taps',
        'version' => 1,
    ], $overrides);
}

test('store persists alignment and returns it', function (): void {
    Sanctum::actingAs(mobileUser());

    $response = $this->postJson(
        '/api/mobile/v1/journey-entries',
        journeyPayload(['alignment' => alignmentPayload()]),
    );

    $response->assertCreated()
        ->assertJsonPath('data.alignment.source', 'taps')
        ->assertJsonPath('data.alignment.left_eye.x', 0.30);

    expect(ProgressPhoto::firstOrFail()->alignment['version'])->toBe(1);
});

test('alignment is null when not supplied', function (): void {
    Sanctum::actingAs(mobileUser());

    $this->postJson('/api/mobile/v1/journey-entries', journeyPayload())
        ->assertCreated()
        ->assertJsonPath('data.alignment', null);
});

test('patch sets alignment on an existing entry', function (): void {
    $user = mobileUser();
    Sanctum::actingAs($user);
    $entry = ProgressPhoto::factory()->create(['user_id' => $user->id, 'month_number' => 3]);

    $this->patchJson("/api/mobile/v1/journey-entries/{$entry->id}", [
        'alignment' => alignmentPayload(['source' => 'taps']),
    ])->assertOk()->assertJsonPath('data.alignment.opening_ratio', 0.82);
});

test('store rejects a landmark outside 0..1', function (): void {
    Sanctum::actingAs(mobileUser());

    $this->postJson('/api/mobile/v1/journey-entries', journeyPayload([
        'alignment' => alignmentPayload(['left_eye' => ['x' => 1.4, 'y' => 0.3]]),
    ]))->assertStatus(422)->assertJsonValidationErrors('alignment.left_eye.x');
});

test('store rejects an unknown alignment source', function (): void {
    Sanctum::actingAs(mobileUser());

    $this->postJson('/api/mobile/v1/journey-entries', journeyPayload([
        'alignment' => alignmentPayload(['source' => 'guesswork']),
    ]))->assertStatus(422)->assertJsonValidationErrors('alignment.source');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd braces-journey-be && composer test -- --filter=alignment`
Expected: FAIL — `data.alignment` missing from the response, and the 422 assertions fail because no rule rejects the bad values.

- [ ] **Step 3: Create the migration**

```php
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('progress_photos', function (Blueprint $table): void {
            $table->json('alignment')->nullable()->after('appointment_id');
        });
    }

    public function down(): void
    {
        Schema::table('progress_photos', function (Blueprint $table): void {
            $table->dropColumn('alignment');
        });
    }
};
```

- [ ] **Step 4: Add to the model**

In `app/Models/ProgressPhoto.php`, add `'alignment',` as the last entry of the `#[Fillable([...])]` attribute list, and add to `casts()`:

```php
'alignment' => 'array',
```

- [ ] **Step 5: Add validation to both requests**

Add these rules to the `rules()` array of **both** `StoreJourneyEntryRequest` and `UpdateJourneyEntryRequest`. Repeat verbatim in each file — they are separate classes with separate rule sets.

```php
'alignment' => ['nullable', 'array'],
'alignment.left_eye.x' => ['required_with:alignment', 'numeric', 'between:0,1'],
'alignment.left_eye.y' => ['required_with:alignment', 'numeric', 'between:0,1'],
'alignment.right_eye.x' => ['required_with:alignment', 'numeric', 'between:0,1'],
'alignment.right_eye.y' => ['required_with:alignment', 'numeric', 'between:0,1'],
'alignment.nose_base.x' => ['required_with:alignment', 'numeric', 'between:0,1'],
'alignment.nose_base.y' => ['required_with:alignment', 'numeric', 'between:0,1'],
'alignment.chin.x' => ['required_with:alignment', 'numeric', 'between:0,1'],
'alignment.chin.y' => ['required_with:alignment', 'numeric', 'between:0,1'],
'alignment.roll_deg' => ['required_with:alignment', 'numeric', 'between:-180,180'],
'alignment.yaw_deg' => ['required_with:alignment', 'numeric', 'between:-180,180'],
'alignment.opening_ratio' => ['required_with:alignment', 'numeric', 'min:0'],
'alignment.source' => ['required_with:alignment', 'string', 'in:mlkit,taps,model'],
'alignment.version' => ['required_with:alignment', 'integer', 'min:1'],
```

Note: `StoreJourneyEntryRequest` accepts multipart (the photo upload), so `alignment` arrives as nested form fields. Laravel parses `alignment[left_eye][x]` into the same nested array, so one rule set covers both content types.

- [ ] **Step 6: Expose it in the resource**

In `JourneyEntryResource::toArray()`, add after `'appointment_id'`:

```php
'alignment' => $this->alignment,
```

- [ ] **Step 7: Run the tests**

Run: `cd braces-journey-be && composer test -- --filter=alignment`
Expected: PASS, 5 tests.

- [ ] **Step 8: Run the full backend suite**

Run: `cd braces-journey-be && composer test`
Expected: PASS. Confirms the new column and the `SchemaTest` still agree.

- [ ] **Step 9: Commit**

```bash
cd braces-journey-be
git add database/migrations app/Models/ProgressPhoto.php app/Http/Requests app/Http/Resources tests
git commit -m "feat: persist photo alignment landmarks on journey entries"
```

Do **not** run `php artisan migrate` against the dev database as part of this task.

---

### Task 2: Alignment types and canonical frame

**Files:**
- Create: `src/features/capture/alignment/types.ts`
- Create: `src/features/capture/alignment/canonical.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Point`, `Arch`, `AlignmentSource`, `FaceAlignment`, `STAGE_ASPECT`, `STAGE_HEIGHT`, `CANONICAL_IPD`, `CANONICAL_ORIGIN`. Every later task imports from here.

This task has no test of its own — types and constants have no behaviour. It is separated because Tasks 3–9 all import it, and a reviewer should be able to reject the contract before nine tasks are built on it.

- [ ] **Step 1: Write the types**

```ts
// src/features/capture/alignment/types.ts

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
```

- [ ] **Step 2: Write the canonical frame**

```ts
// src/features/capture/alignment/canonical.ts
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
  upper: { x: 0.5, y: 0.30 },
  lower: { x: 0.5, y: 0.85 },
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/capture/alignment/types.ts src/features/capture/alignment/canonical.ts
git commit -m "feat: alignment types and canonical frame constants"
```

---

### Task 3: The similarity transform

**Files:**
- Create: `src/features/capture/alignment/transform.ts`
- Test: `src/features/capture/alignment/transform.test.ts`

**Interfaces:**
- Consumes: `FaceAlignment`, `Arch`, `Point` (Task 2); `STAGE_HEIGHT`, `CANONICAL_IPD`, `CANONICAL_ORIGIN` (Task 2).
- Produces:
  - `type StageTransform = { scale: number; rotationRad: number; tx: number; ty: number }`
  - `alignmentTransform(alignment: FaceAlignment, image: { width: number; height: number }, arch: Arch): StageTransform | null`
  - `applyStageTransform(point: Point, t: StageTransform): Point`
  - `MIN_STAGE_IPD: number`

`tx`/`ty` are in square units — multiply **both** by stage *width* at render time, never by height.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/capture/alignment/transform.test.ts
import { CANONICAL_IPD, CANONICAL_ORIGIN, STAGE_HEIGHT } from '@/features/capture/alignment/canonical';
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
  const shut = alignmentTransform(alignment({ chin: { x: 0.5, y: 0.70 } }), IMAGE, 'upper')!;
  const wide = alignmentTransform(alignment({ chin: { x: 0.5, y: 0.92 } }), IMAGE, 'upper')!;

  expect(wide.scale).toBeCloseTo(shut.scale, 6);
  expect(wide.ty).toBeCloseTo(shut.ty, 6);
});

test('jaw opening does move the lower arch frame', () => {
  const shut = alignmentTransform(alignment({ chin: { x: 0.5, y: 0.70 } }), IMAGE, 'lower')!;
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/capture/alignment/transform.test.ts`
Expected: FAIL — `Cannot find module '@/features/capture/alignment/transform'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/features/capture/alignment/transform.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/features/capture/alignment/transform.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/capture/alignment/transform.ts src/features/capture/alignment/transform.test.ts
git commit -m "feat: similarity transform normalizing photos to a canonical frame"
```

---

### Task 4: The evidence-photo regression test

**Files:**
- Modify: `src/features/capture/alignment/transform.test.ts`

**Interfaces:**
- Consumes: `alignmentTransform`, `applyStageTransform` (Task 3).
- Produces: nothing consumed by later tasks. This is the acceptance test for the feature.

Spec §14 names this the real acceptance test: the three evidence photos, whose measurements are recorded in spec §3, must align to each other. The landmark values below are derived from those measurements — a 768×1024 frame, interpupillary distances of 332 / 330 / 310 px, photo 1 visibly rolled, photos 2 and 3 differing mainly in jaw opening.

- [ ] **Step 1: Write the failing test**

Append to `src/features/capture/alignment/transform.test.ts`:

```ts
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

function alignedEyes(a: typeof EVIDENCE.photo1) {
  const t = alignmentTransform(a, EVIDENCE_IMAGE, 'upper')!;
  const s0 = Math.max(1 / EVIDENCE_IMAGE.width, STAGE_HEIGHT / EVIDENCE_IMAGE.height);
  const toStage = (p: { x: number; y: number }) => ({
    x: 0.5 + (p.x - 0.5) * EVIDENCE_IMAGE.width * s0,
    y: STAGE_HEIGHT / 2 + (p.y - 0.5) * EVIDENCE_IMAGE.height * s0,
  });
  return {
    left: applyStageTransform(toStage(a.leftEye), t),
    right: applyStageTransform(toStage(a.rightEye), t),
  };
}

test('all three evidence photos align their eye lines to the same place', () => {
  const one = alignedEyes(EVIDENCE.photo1);
  const two = alignedEyes(EVIDENCE.photo2);
  const three = alignedEyes(EVIDENCE.photo3);

  for (const pair of [
    [one, two],
    [two, three],
    [one, three],
  ] as const) {
    expect(pair[0].left.x).toBeCloseTo(pair[1].left.x, 4);
    expect(pair[0].left.y).toBeCloseTo(pair[1].left.y, 4);
    expect(pair[0].right.x).toBeCloseTo(pair[1].right.x, 4);
    expect(pair[0].right.y).toBeCloseTo(pair[1].right.y, 4);
  }
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
```

- [ ] **Step 2: Run tests to verify they fail or pass**

Run: `npx jest src/features/capture/alignment/transform.test.ts`
Expected: PASS if Task 3 is correct — these tests exercise existing behaviour with real data. If any fail, the transform is wrong and Task 3 must be fixed; do **not** loosen the tolerances to make them pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/capture/alignment/transform.test.ts
git commit -m "test: evidence-photo regression for alignment"
```

---

### Task 5: The quality gate

**Files:**
- Create: `src/features/capture/alignment/quality.ts`
- Test: `src/features/capture/alignment/quality.test.ts`

**Interfaces:**
- Consumes: `FaceAlignment`, `Arch` (Task 2).
- Produces:
  - `type QualityIssue = 'yaw' | 'roll' | 'too-far' | 'opening-mismatch'`
  - `type QualityVerdict = { ok: boolean; blocking: boolean; issues: QualityIssue[]; message: string | null }`
  - `assessAlignment(alignment: FaceAlignment, options?: { arch?: Arch; targetOpeningRatio?: number }): QualityVerdict`
  - Threshold constants `MAX_YAW_DEG`, `MAX_ROLL_DEG`, `MIN_IPD_FRACTION`, `MAX_OPENING_DRIFT`

Thresholds come from spec §6.2 and are starting values to tune. They live in this one module so tuning is a single-file change.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/capture/alignment/quality.test.ts
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
    source: 'mlkit',
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
  const v = assessAlignment(alignment({ leftEye: { x: 0.45, y: 0.3 }, rightEye: { x: 0.6, y: 0.3 } }));
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/capture/alignment/quality.test.ts`
Expected: FAIL — `Cannot find module '@/features/capture/alignment/quality'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/features/capture/alignment/quality.ts
import type { Arch, FaceAlignment } from '@/features/capture/alignment/types';

/** Head turn. The only BLOCKING check — a similarity transform cannot undo
 *  out-of-plane rotation, so yaw silently fakes tooth movement. */
export const MAX_YAW_DEG = 8;
/** Head tilt. Fully correctable, so this only warns. */
export const MAX_ROLL_DEG = 15;
/** Eye-line width as a fraction of frame width. Below this, detail is lost. */
export const MIN_IPD_FRACTION = 0.25;
/** Fractional drift in openingRatio before the lower arch is called mismatched. */
export const MAX_OPENING_DRIFT = 0.15;

export type QualityIssue = 'yaw' | 'roll' | 'too-far' | 'opening-mismatch';

export type QualityVerdict = {
  ok: boolean;
  blocking: boolean;
  issues: QualityIssue[];
  message: string | null;
};

const MESSAGES: Record<QualityIssue, string> = {
  yaw: 'Turn to face the camera straight on.',
  roll: 'Hold your head a little more level.',
  'too-far': 'Come closer — your teeth are too small in the frame.',
  'opening-mismatch': "Your jaw is open wider than last month's photo.",
};

export function assessAlignment(
  alignment: FaceAlignment,
  options: { arch?: Arch; targetOpeningRatio?: number } = {},
): QualityVerdict {
  const { arch = 'upper', targetOpeningRatio } = options;
  const issues: QualityIssue[] = [];

  // Taps place points but assert nothing about head orientation, so a tapped
  // yawDeg carries no information and must not gate.
  if (alignment.source !== 'taps' && Math.abs(alignment.yawDeg) > MAX_YAW_DEG) {
    issues.push('yaw');
  }
  if (Math.abs(alignment.rollDeg) > MAX_ROLL_DEG) issues.push('roll');

  const ipdFraction = Math.abs(alignment.rightEye.x - alignment.leftEye.x);
  if (ipdFraction < MIN_IPD_FRACTION) issues.push('too-far');

  if (arch === 'lower' && targetOpeningRatio !== undefined && targetOpeningRatio > 0) {
    const drift = Math.abs(alignment.openingRatio - targetOpeningRatio) / targetOpeningRatio;
    if (drift > MAX_OPENING_DRIFT) issues.push('opening-mismatch');
  }

  const blocking = issues.includes('yaw');
  return {
    ok: issues.length === 0,
    blocking,
    issues,
    message: issues.length === 0 ? null : MESSAGES[issues[0]],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/features/capture/alignment/quality.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/capture/alignment/quality.ts src/features/capture/alignment/quality.test.ts
git commit -m "feat: alignment quality gate with yaw blocking"
```

---

### Task 6: API contract mapping

**Files:**
- Modify: `src/features/journey/types.ts`
- Modify: `src/features/journey/api.ts`
- Test: `src/features/journey/api.test.ts`

**Interfaces:**
- Consumes: `FaceAlignment`, `Point` (Task 2); the backend field from Task 1.
- Produces:
  - `type ApiFaceAlignment` on `ApiJourneyEntry.alignment`
  - `alignmentFromApi(raw: ApiFaceAlignment | null): FaceAlignment | undefined`
  - `alignmentToApi(alignment: FaceAlignment): ApiFaceAlignment`
  - `JourneyEntry.alignment?: FaceAlignment`

- [ ] **Step 1: Write the failing test**

Append to `src/features/journey/api.test.ts`:

```ts
import { alignmentFromApi, alignmentToApi, type ApiFaceAlignment } from '@/features/journey/api';
import type { FaceAlignment } from '@/features/capture/alignment/types';

const apiAlignment: ApiFaceAlignment = {
  left_eye: { x: 0.3, y: 0.3 },
  right_eye: { x: 0.7, y: 0.3 },
  nose_base: { x: 0.5, y: 0.45 },
  chin: { x: 0.5, y: 0.78 },
  roll_deg: 1.5,
  yaw_deg: -2,
  opening_ratio: 0.82,
  source: 'taps',
  version: 1,
};

const appAlignment: FaceAlignment = {
  leftEye: { x: 0.3, y: 0.3 },
  rightEye: { x: 0.7, y: 0.3 },
  noseBase: { x: 0.5, y: 0.45 },
  chin: { x: 0.5, y: 0.78 },
  rollDeg: 1.5,
  yawDeg: -2,
  openingRatio: 0.82,
  source: 'taps',
  version: 1,
};

test('alignmentFromApi maps snake_case to camelCase', () => {
  expect(alignmentFromApi(apiAlignment)).toEqual(appAlignment);
});

test('alignmentFromApi returns undefined for a null column', () => {
  expect(alignmentFromApi(null)).toBeUndefined();
});

test('alignmentToApi round-trips', () => {
  expect(alignmentFromApi(alignmentToApi(appAlignment))).toEqual(appAlignment);
});

test('entryFromApi carries alignment through', () => {
  const entry = entryFromApi(
    {
      id: 9,
      month_number: 3,
      photo_date: '2026-05-01',
      bracket_color_name: null,
      bracket_color_hex: null,
      notes: null,
      appointment_id: null,
      photo_url: null,
      created_at: null,
      alignment: apiAlignment,
    },
    'file:///photos/9.jpg',
  );

  expect(entry.alignment).toEqual(appAlignment);
});

test('entryFromApi leaves alignment undefined when the server sends null', () => {
  const entry = entryFromApi(
    {
      id: 9,
      month_number: 3,
      photo_date: '2026-05-01',
      bracket_color_name: null,
      bracket_color_hex: null,
      notes: null,
      appointment_id: null,
      photo_url: null,
      created_at: null,
      alignment: null,
    },
    undefined,
  );

  expect(entry.alignment).toBeUndefined();
});
```

If `api.test.ts` does not already import `entryFromApi`, add it to the existing import from `@/features/journey/api`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/journey/api.test.ts`
Expected: FAIL — `alignmentFromApi` is not exported.

- [ ] **Step 3: Add the field to the domain type**

In `src/features/journey/types.ts`, add the import and the field:

```ts
import type { FaceAlignment } from '@/features/capture/alignment/types';
```

and inside `JourneyEntry`, after `photo?: EntryPhoto;`:

```ts
  /** Landmarks used to normalize this photo. Absent = never aligned. */
  alignment?: FaceAlignment;
```

- [ ] **Step 4: Write the mappers**

In `src/features/journey/api.ts`, add the import:

```ts
import type { FaceAlignment, Point } from '@/features/capture/alignment/types';
```

Add `alignment: ApiFaceAlignment | null;` to `ApiJourneyEntry`, and:

```ts
export type ApiPoint = { x: number; y: number };

export type ApiFaceAlignment = {
  left_eye: ApiPoint;
  right_eye: ApiPoint;
  nose_base: ApiPoint;
  chin: ApiPoint;
  roll_deg: number;
  yaw_deg: number;
  opening_ratio: number;
  source: FaceAlignment['source'];
  version: number;
};

const point = (p: ApiPoint): Point => ({ x: p.x, y: p.y });

export function alignmentFromApi(raw: ApiFaceAlignment | null): FaceAlignment | undefined {
  if (!raw) return undefined;
  return {
    leftEye: point(raw.left_eye),
    rightEye: point(raw.right_eye),
    noseBase: point(raw.nose_base),
    chin: point(raw.chin),
    rollDeg: raw.roll_deg,
    yawDeg: raw.yaw_deg,
    openingRatio: raw.opening_ratio,
    source: raw.source,
    version: 1,
  };
}

export function alignmentToApi(alignment: FaceAlignment): ApiFaceAlignment {
  return {
    left_eye: point(alignment.leftEye),
    right_eye: point(alignment.rightEye),
    nose_base: point(alignment.noseBase),
    chin: point(alignment.chin),
    roll_deg: alignment.rollDeg,
    yaw_deg: alignment.yawDeg,
    opening_ratio: alignment.openingRatio,
    source: alignment.source,
    version: alignment.version,
  };
}
```

Then in `entryFromApi`, add to the returned object after `photo`:

```ts
    alignment: alignmentFromApi(e.alignment ?? null),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/features/journey/api.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/journey/types.ts src/features/journey/api.ts src/features/journey/api.test.ts
git commit -m "feat: map photo alignment across the API boundary"
```

---

### Task 7: Store mutation for saving alignment

**Files:**
- Modify: `src/features/journey/store.ts`

**Interfaces:**
- Consumes: `alignmentToApi`, `entryFromApi`, `ApiJourneyEntry` (Task 6); `apiRequest` from `src/lib/api/client.ts`.
- Produces: `setEntryAlignment(id: string, alignment: FaceAlignment): Promise<void>`

Follows the existing `updateEntry` shape exactly: API first, then cache. `updateEntry` is left untouched — alignment is not part of the user-editable patch set.

- [ ] **Step 1: Write the implementation**

Add to `src/features/journey/store.ts`, after `updateEntry`:

```ts
/** Server first (source of truth), then the cache row. The photo URI is
 *  preserved from the existing entry — the server response has no local path. */
export async function setEntryAlignment(
  id: string,
  alignment: FaceAlignment,
): Promise<void> {
  const res = await apiRequest<{ data: ApiJourneyEntry }>('PATCH', `/journey-entries/${id}`, {
    body: { alignment: alignmentToApi(alignment) },
  });
  journeyStore.update((entries) =>
    sorted(entries.map((e) => (e.id === id ? entryFromApi(res.data, e.photo?.uri) : e))),
  );
}
```

Extend the existing import from `@/features/journey/api` to include `alignmentToApi`, and add:

```ts
import type { FaceAlignment } from '@/features/capture/alignment/types';
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — confirms the store change broke no existing store tests.

- [ ] **Step 4: Commit**

```bash
git add src/features/journey/store.ts
git commit -m "feat: setEntryAlignment store mutation"
```

---

### Task 8: The aligned photo component

**Files:**
- Create: `src/features/journey/components/aligned-photo.tsx`

**Interfaces:**
- Consumes: `alignmentTransform` (Task 3); `JourneyEntry` with `alignment` (Task 6); `Arch` (Task 2).
- Produces: `<AlignedPhoto entry stageWidth arch />` — fills its parent, which must clip.

The parent supplies the 4:5 box and `overflow: 'hidden'`. When `entry.alignment` is absent or the transform is degenerate, this renders exactly today's `contentFit="cover"`, which is the honest fallback from spec §9.

- [ ] **Step 1: Write the component**

```tsx
// src/features/journey/components/aligned-photo.tsx
import { Image } from 'expo-image';
import { View } from 'react-native';

import { alignmentTransform } from '@/features/capture/alignment/transform';
import type { Arch } from '@/features/capture/alignment/types';
import type { JourneyEntry } from '@/features/journey/types';

type Props = { entry: JourneyEntry; stageWidth: number; arch: Arch };

/** Renders an entry's photo normalized into the canonical frame. Falls back to
 *  plain cover when the photo has no landmarks — never stretches to fake a fit. */
export function AlignedPhoto({ entry, stageWidth, arch }: Props) {
  const photo = entry.photo;
  if (!photo) return null;

  const transform = entry.alignment
    ? alignmentTransform(entry.alignment, { width: photo.width, height: photo.height }, arch)
    : null;

  // tx and ty are both in square units — scale BOTH by stage width, never height.
  const style = transform
    ? {
        transform: [
          { translateX: transform.tx * stageWidth },
          { translateY: transform.ty * stageWidth },
          { rotate: `${transform.rotationRad}rad` },
          { scale: transform.scale },
        ],
      }
    : undefined;

  return (
    <View style={[{ width: '100%', height: '100%' }, style]}>
      <Image
        source={{ uri: photo.uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={120}
      />
    </View>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/journey/components/aligned-photo.tsx
git commit -m "feat: AlignedPhoto renders an entry through its alignment transform"
```

---

### Task 9: Rewrite the Compare screen

**Files:**
- Modify: `src/app/compare.tsx`

**Interfaces:**
- Consumes: `AlignedPhoto` (Task 8); `Arch` (Task 2).
- Produces: nothing consumed by later tasks.

Changes: stage `3/4` → `4/5` (spec §4.2), an Upper/Lower arch toggle (spec §5), rendering through `AlignedPhoto`, and an "add anchors" affordance when either photo lacks landmarks (spec §9). Both months stay in the pickers regardless — no month is ever hidden.

- [ ] **Step 1: Add arch state and the aspect change**

In `CompareScreen`, add alongside the existing state:

```tsx
const [arch, setArch] = useState<Arch>('upper');
```

with `import type { Arch } from '@/features/capture/alignment/types';`.

Change the stage `View`'s `aspectRatio: 3 / 4` to `aspectRatio: 4 / 5`.

- [ ] **Step 2: Render through AlignedPhoto**

Replace the two `<Image>` elements inside the stage. The "after" photo:

```tsx
<AlignedPhoto entry={after} stageWidth={stageWidth} arch={arch} />
```

and inside the clipped `Animated.View`, the "before" photo — note the fixed
`width: stageWidth` wrapper, which preserves today's behaviour of clipping
rather than squashing the underlying image:

```tsx
<View style={{ width: stageWidth, height: '100%' }}>
  <AlignedPhoto entry={before} stageWidth={stageWidth} arch={arch} />
</View>
```

Add `import { AlignedPhoto } from '@/features/journey/components/aligned-photo';` and drop the now-unused `Image` import from `expo-image`.

- [ ] **Step 3: Add the arch toggle**

Directly below the stage's caption text:

```tsx
<View style={{ flexDirection: 'row', gap: Space.sm, justifyContent: 'center' }}>
  <Chip label="Upper" selected={arch === 'upper'} onPress={() => setArch('upper')} />
  <Chip label="Lower" selected={arch === 'lower'} onPress={() => setArch('lower')} />
</View>
```

- [ ] **Step 4: Add the unaligned affordance**

Immediately after the arch toggle:

```tsx
{!before.alignment || !after.alignment ? (
  <Button
    label="Not aligned — add anchors"
    variant="secondary"
    onPress={() => router.push(`/align/${!before.alignment ? before.id : after.id}`)}
  />
) : null}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Verify in the simulator**

Run: `npm run ios`

Check, per the project's screen-verification convention:
- Compare opens; the stage is 4:5 and the wipe still drags.
- Upper/Lower toggle switches without the photos jumping to a wrong position.
- With no aligned photos, the stage looks exactly as it did before this change and the "add anchors" button shows.

- [ ] **Step 7: Commit**

```bash
git add src/app/compare.tsx
git commit -m "feat: compare renders aligned photos with an arch toggle"
```

---

### Task 10: The manual anchor editor

**Files:**
- Create: `src/features/capture/alignment/components/anchor-editor.tsx`
- Create: `src/app/align/[id].tsx`

**Interfaces:**
- Consumes: `FaceAlignment`, `Point` (Task 2); `assessAlignment` (Task 5); `setEntryAlignment` (Task 7); `journeyStore` (existing).
- Produces: the `/align/[id]` route, linked from Compare (Task 9).

Four taps in order: left eye, right eye, nose base, chin. `rollDeg` is computed from the eye line; `yawDeg` is `0` because taps cannot measure head turn — the quality gate in Task 5 already skips the yaw check for `source: 'taps'` for exactly this reason. Tapping happens on the **stored** photo, never a preview, satisfying spec §11.

This task is also where the quality gate earns its place. Roll and "too far" **are** computable from taps, so the four taps are reviewed before saving rather than saved blind: the verdict message is shown, and the user can save anyway or start over. Nothing here blocks — with `source: 'taps'` the only blocking check (yaw) is skipped by design.

- [ ] **Step 1: Write the editor component**

```tsx
// src/features/capture/alignment/components/anchor-editor.tsx
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { FaceAlignment, Point } from '@/features/capture/alignment/types';
import { darkColors, Radii, Space, Type } from '@/theme/tokens';

const STEPS = [
  { key: 'leftEye', label: 'Tap your left eye' },
  { key: 'rightEye', label: 'Tap your right eye' },
  { key: 'noseBase', label: 'Tap the base of your nose' },
  { key: 'chin', label: 'Tap the bottom of your chin' },
] as const;

type Props = { uri: string; onComplete: (alignment: FaceAlignment) => void };

export function AnchorEditor({ uri, onComplete }: Props) {
  const [points, setPoints] = useState<Point[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const step = STEPS[points.length];

  function tap(x: number, y: number) {
    if (!step || size.width === 0) return;
    const next = [...points, { x: x / size.width, y: y / size.height }];
    setPoints(next);
    if (next.length === STEPS.length) onComplete(build(next));
  }

  return (
    <View>
      <Pressable
        onLayout={(e) => setSize(e.nativeEvent.layout)}
        onPress={(e) => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        style={{ borderRadius: Radii.stage, overflow: 'hidden', aspectRatio: 4 / 5 }}
      >
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        {points.map((p, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: p.x * size.width - 8,
              top: p.y * size.height - 8,
              width: 16,
              height: 16,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              backgroundColor: darkColors.accent,
            }}
          />
        ))}
      </Pressable>
      <Text style={[Type.caption, { color: darkColors.accent, textAlign: 'center', marginTop: Space.md }]}>
        {step ? step.label : 'All four placed'}
      </Text>
    </View>
  );
}

function build(points: Point[]): FaceAlignment {
  const [leftEye, rightEye, noseBase, chin] = points;
  const ipd = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  return {
    leftEye,
    rightEye,
    noseBase,
    chin,
    rollDeg: (Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180) / Math.PI,
    yawDeg: 0, // taps cannot measure head turn — quality.ts skips yaw for source 'taps'
    openingRatio: ipd > 0 ? Math.hypot(chin.x - noseBase.x, chin.y - noseBase.y) / ipd : 0,
    source: 'taps',
    version: 1,
  };
}
```

- [ ] **Step 2: Write the route**

```tsx
// src/app/align/[id].tsx
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AnchorEditor } from '@/features/capture/alignment/components/anchor-editor';
import type { FaceAlignment } from '@/features/capture/alignment/types';
import { journeyStore, setEntryAlignment } from '@/features/journey/store';
import { useStoreValue } from '@/lib/store/use-store-value';
import { useAsyncAction } from '@/lib/use-async-action';
import { darkColors, Type } from '@/theme/tokens';

export default function AlignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useStoreValue(journeyStore).find((e) => e.id === String(id));
  const [draft, setDraft] = useState<FaceAlignment | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { run, pending, error } = useAsyncAction(async (alignment: FaceAlignment) => {
    await setEntryAlignment(String(id), alignment);
    router.back();
  });

  const verdict = draft ? assessAlignment(draft) : null;

  if (!entry?.photo) {
    return (
      <Screen dark>
        <EmptyState voice="Nothing to align" body="This month has no photo yet.">
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen dark>
      <Text style={[Type.display, { color: darkColors.textPrimary }]}>Align this photo</Text>
      <Text style={[Type.caption, { color: darkColors.textTertiary }]}>
        Four taps let every month be compared on the same footing.
      </Text>
      <AnchorEditor key={attempt} uri={entry.photo.uri} onComplete={setDraft} />
      {verdict?.message ? (
        <Text style={[Type.caption, { color: darkColors.danger }]}>{verdict.message}</Text>
      ) : null}
      {pending ? (
        <Text style={[Type.caption, { color: darkColors.textTertiary }]}>Saving…</Text>
      ) : null}
      {error ? <Text style={[Type.caption, { color: darkColors.danger }]}>{error}</Text> : null}
      {draft ? (
        <>
          <Button
            label={pending ? 'Saving…' : 'Save alignment'}
            onPress={() => void run(draft)}
            disabled={pending}
          />
          <Button
            label="Start over"
            variant="secondary"
            disabled={pending}
            onPress={() => {
              setDraft(null);
              setAttempt((n) => n + 1);
            }}
          />
        </>
      ) : null}
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
```

Add the imports this uses: `useState` from `react`, and
`import { assessAlignment } from '@/features/capture/alignment/quality';`.

The `key={attempt}` remounts the editor so "Start over" clears the placed points —
`AnchorEditor` holds its own tap state and exposes no reset.

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Verify in the simulator**

Run: `npm run ios`

- Open Compare with an unaligned pair, tap "Not aligned — add anchors".
- Place four points; each leaves a dot and the prompt advances.
- After the fourth, "Save alignment" and "Start over" appear. "Start over" clears the dots and returns to the first prompt.
- Deliberately tap a badly tilted eye line (>15°) and confirm the roll warning appears but "Save alignment" still works — warnings never block.
- Save, then reopen Compare: the affordance is gone once both photos are aligned, and the aligned pair visibly sits in a consistent frame.

- [ ] **Step 5: Commit**

```bash
git add src/features/capture/alignment/components/anchor-editor.tsx src/app/align
git commit -m "feat: manual four-tap anchor editor"
```

---

### Task 11: Static capture guide and AGENTS.md

**Files:**
- Modify: `src/app/camera.tsx`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks.

A fixed framing target on the camera preview (spec §6.1). It needs no detection. `GhostOverlay` stays and keeps its toggle — it remains useful for judging colour and lighting.

- [ ] **Step 1: Add the guide to the camera**

In `src/app/camera.tsx`, immediately after the `<GhostOverlay .../>` line, add:

```tsx
<View pointerEvents="none" style={StyleSheet.absoluteFill}>
  <View
    style={{
      position: 'absolute',
      left: '12%',
      right: '12%',
      top: '30%',
      bottom: '22%',
      borderRadius: 999,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.55)',
      borderStyle: 'dashed',
    }}
  />
</View>
```

Add `StyleSheet` to the existing `react-native` import.

- [ ] **Step 2: Update AGENTS.md**

Under **Structure**, extend the `src/features/` line to name the new module:

```
- `src/features/` — auth, journey, capture (+ `alignment/`: landmark types,
  canonical frame, transform maths, quality gate, anchor editor), profile
  (+ onboarding steps), visits, payments, migration. Each: types + store +
  components.
```

Under **Domain cheatsheet**, add:

```
- Alignment: each entry may carry `alignment` (normalized face landmarks).
  Compare normalizes every photo into a canonical 4:5 frame — nose base for
  the upper arch, chin for the lower, because the mandible swings. Photos
  without alignment fall back to plain `cover`. Yaw is gated at capture, never
  corrected. Source is `taps` today; `mlkit`/`model` are the future producers.
```

- [ ] **Step 3: Verify in the simulator**

Run: `npm run ios`
Open the camera: the dashed guide is visible, sits over the mouth area, and does not block the shutter or the ghost toggle.

- [ ] **Step 4: Run everything**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/camera.tsx AGENTS.md
git commit -m "feat: static capture guide; document the alignment module"
```

---

### Task 12: Spike — select the ML Kit binding

**Files:**
- Create: `docs/superpowers/specs/2026-08-30-mlkit-binding-decision.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a written decision that a follow-up detection plan is built on.

This is a **spike**: the output is an answer, not code. Any prototype built is throwaway and must not be committed to `src/`. Time-box to one working session.

- [ ] **Step 1: Identify candidate packages**

Find the current maintained options for (a) ML Kit face detection on a **still image URI** and (b) camera **frame-processor** face detection, both under Expo SDK 56 / RN 0.85 with the New Architecture and a CNG prebuild. Record for each: package name, last release date, New Architecture support, whether an Expo config plugin exists, and iOS/Android binary size impact.

- [ ] **Step 2: Confirm the landmark set**

Verify which of these the still-image detector actually returns: left/right eye position, nose base, a chin or face-oval point, and per-face `yaw`/`roll` angles. Spec §12 flags that a true chin point may require the heavier *contour* mode.

- [ ] **Step 3: Test against the evidence photos**

Run the candidate detector over the three evidence photos from spec §3 — including photo 3, where the subject wears glasses, and photo 1, which is dim and rolled. Record whether a face is detected in all three and how the returned landmarks compare to the hand-measured values in Task 4's `EVIDENCE` fixture.

- [ ] **Step 4: Write the decision**

Record in the new spec file: the chosen package(s) with version, whether chin comes from contour mode or falls back to `MOUTH_BOTTOM` (and if the latter, the tightened opening threshold per spec §12), measured accuracy against the evidence photos, and the prebuild/config-plugin steps required.

- [ ] **Step 5: Commit the decision only**

```bash
git add docs/superpowers/specs/2026-08-30-mlkit-binding-decision.md
git commit -m "docs: ML Kit binding decision for alignment detection"
```

Discard any prototype code. The detection implementation gets its own plan, written from this decision.

---

## Verification

After Task 11, the whole phase is verifiable:

```bash
npm test && npm run typecheck && npm run lint     # mobile
cd ../braces-journey-be && composer test          # backend
```

Acceptance, in the simulator: two photos aligned via the tap editor sit in a consistent frame under the wipe, the Upper/Lower toggle changes which arch is centred, and an unaligned pair still renders and still offers the anchors affordance.

The evidence-photo regression in Task 4 is the objective check that the maths is right — it must pass without loosened tolerances.
