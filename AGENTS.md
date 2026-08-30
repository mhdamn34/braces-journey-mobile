# BracesJourney

Photo-first braces journey tracker. One ritual: after every bracket change,
capture a ghost-aligned photo of your teeth, tag the bracket colour, add a
note. The Journey tab plays the months back as a flipbook and compares any
two months with a slider. Data lives on the braces-journey-be API
(server-authoritative); reads come from per-feature JSON caches that keep the
app browsable offline, writes require a connection.

Spec: `docs/superpowers/specs/2026-08-28-braces-journey-redesign-design.md`

## How to add a feature (the recipe)

1. Define types in `src/features/<name>/types.ts`.
2. Create a store: `createApiStore<T>('name.json', initial, fetchRemote)` in
   `src/features/<name>/store.ts`, with an `api.ts` beside it for mappers
   (snake_case ↔ camelCase, ISO datetimes split at the boundary). Export
   async mutation functions that call the API first, then update the cache.
3. Build components in `src/features/<name>/components/`, reading state with
   `useStoreValue(store)`.
4. Add a thin route file in `src/app/` that composes them.

That's it. Only stores and `src/features/capture/photo-files.ts` touch
persistence. Route files contain composition and navigation only.

## Rules

- All colours/type/spacing come from `src/theme/tokens.ts`. No hex values in
  screens (exceptions: bracket swatches, chrome over photos/camera).
- Camera, review, player, and compare always render dark (`darkColors`).
  Everything else follows the system scheme via `useTheme()`.
- Icons via `src/components/symbol.tsx` (SF Symbols + fallback). Never emoji.
- Currency via `src/lib/format-currency.ts` (RM). Dates via `src/lib/dates.ts`
  (ISO `YYYY-MM-DD` everywhere).
- Serif (`Type.display/title/voice`) for headings and section voices only;
  system sans for everything functional.
- Components ≤ ~150 lines, one per file. New dependencies need a written
  reason here:
  - `expo-secure-store` — Sanctum API token storage; Keychain/Keystore, never a JSON file.
  - `expo-image-manipulator` — resize/compress photos before multipart upload (server caps at 10 MB).
- API calls only via `src/lib/api/client.ts` (`apiRequest`); dates cross the
  boundary as `YYYY-MM-DD` (+ `HH:MM` for visit times) — screens never see
  ISO datetimes.
- Write actions in screens go through `useAsyncAction` — pending label +
  danger-caption error, input preserved on failure.
- Tests: `npm test`. Pure logic (stores, `journey/logic`, `lib/`) is
  unit-tested; screens are verified in the iOS simulator.

## Structure

- `src/lib/` — store factories, dates, currency, and `src/lib/api/` (client,
  token, pagination). `src/theme/` — tokens + hook.
- `src/components/` — shared primitives (screen, card, button, chip, rows…).
- `src/features/` — auth, journey, capture (+ `alignment/`: landmark types,
  canonical frame, transform maths, quality gate, anchor editor), profile
  (+ onboarding steps), visits, payments, migration. Each: types + store +
  components. Landmarks are produced **on the server** (braces-journey-be runs
  MediaPipe in a queued job); the app produces them only through the four-tap
  editor, and reads `alignmentStatus` to tell "still detecting" from "detection
  failed". The app has no face-detection dependency of its own.
- `src/app/` — expo-router routes: `welcome`, `sign-in`, `create-account`,
  `(tabs)/` (Journey, Capture, More), camera, review, player, compare,
  import-photos, entry/[id], align/[id], visits/*, payments, settings,
  onboarding, `migrate`, `merge-months`.

## Domain cheatsheet

- `JourneyEntry` = one month: photo + bracket colour + note (+ visit link).
  `monthNumber` counts treatment months from `profile.treatmentStartDate`
  (`suggestedMonthNumber` — mid-journey installs start at the right month).
- Due logic (`dueState`): due when the latest completed visit has no photo
  after it, or 30+ days since the last photo.
- Photo files: `<documentDirectory>/photos/`, owned by journey entries;
  deleting an entry deletes its file.
- Auth: Sanctum bearer token in expo-secure-store; token gate in
  `(tabs)/_layout` ahead of the onboarding gate. Photo cache:
  `<documentDirectory>/photos/<entryId>.<ext>`, server ids.
- Alignment: each entry may carry `alignment` (normalized face landmarks).
  Compare normalizes every photo into a canonical 4:5 frame — nose base for
  the upper arch, chin for the lower, because the mandible swings. Photos
  without alignment fall back to plain `cover`. Yaw and pitch are
  out-of-plane: gated or warned at capture, never corrected. Source is `taps`
  today; `mlkit`/`model` are the future producers.
  Spec: `docs/superpowers/specs/2026-08-30-tooth-movement-comparison-design.md`

## Maintenance rule

Update this file after each completed feature or structural change.
