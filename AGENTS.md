# BracesJourney

Photo-first braces journey tracker. One ritual: after every bracket change,
capture a ghost-aligned photo of your teeth, tag the bracket colour, add a
note. The Journey tab plays the months back as a flipbook and compares any
two months with a slider. Everything is stored on-device.

Spec: `docs/superpowers/specs/2026-08-28-braces-journey-redesign-design.md`

## How to add a feature (the recipe)

1. Define types in `src/features/<name>/types.ts`.
2. Create a store: `createJsonStore<T>('name.json', initial)` in
   `src/features/<name>/store.ts`. Export plain mutation functions
   (`addX`, `updateX`, `deleteX`) beside it.
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
  reason here.
- Tests: `npm test`. Pure logic (stores, `journey/logic`, `lib/`) is
  unit-tested; screens are verified in the iOS simulator.

## Structure

- `src/lib/` — store factory, dates, currency. `src/theme/` — tokens + hook.
- `src/components/` — shared primitives (screen, card, button, chip, rows…).
- `src/features/` — journey, capture, profile (+ onboarding steps), visits,
  payments. Each: types + store + components.
- `src/app/` — expo-router routes: `(tabs)/` (Journey, Capture, More),
  camera, review, player, compare, import-photos, entry/[id], visits/*,
  payments, settings, onboarding.

## Domain cheatsheet

- `JourneyEntry` = one month: photo + bracket colour + note (+ visit link).
  `monthNumber` counts treatment months from `profile.treatmentStartDate`
  (`suggestedMonthNumber` — mid-journey installs start at the right month).
- Due logic (`dueState`): due when the latest completed visit has no photo
  after it, or 30+ days since the last photo.
- Photo files: `<documentDirectory>/photos/`, owned by journey entries;
  deleting an entry deletes its file.

## Maintenance rule

Update this file after each completed feature or structural change.
