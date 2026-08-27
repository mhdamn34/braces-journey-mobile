# BracesJourney v3 — Redesign & Restructure

**Date:** 2026-08-28
**Status:** Approved design, pending implementation plan

## 1. What this is

A ground-up rebuild of BracesJourney as a fresh Expo project in this repo. The app becomes a photo-first braces journey tracker built around one ritual: after each monthly bracket change, capture a photo of your teeth lined up against a ghost of last month's photo, tag the bracket colour, add a note — then watch your teeth move through an interactive flipbook player and a before/after comparison slider.

### Goals

1. **Maintainable structure** — every feature follows one identical recipe (types + store + components + route), so adding anything new is mechanical and requires no deep understanding of the codebase.
2. **A working core flow** — captured photos actually drive the journey timeline (today they are saved to disk but never shown; the gallery renders hardcoded mock data).
3. **Modern, honest design** — no emoji-as-icons, no fake AI analysis, no gradient hero cards. Light + dark themes, serif display voice, one terracotta accent.

### Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Core interactive feature | Flipbook timeline scrubber + before/after slider |
| Fake AI layer (scores, smile map, verification) | Cut entirely; replaced by capture ghost overlay + user notes |
| App shape | Photo-first, 3 tabs: Journey / Capture / More |
| Backend | Local-only, sync-ready (repository pattern; no server) |
| Domain model | Linked entries: visit + bracket colour + photo + note = one journey entry |
| Execution strategy | Fresh Expo project scaffolded in this same repo (wipe `src/`, keep assets & git history) |
| Home layout | "Theater": photo stage + filmstrip scrubber + journey log on one screen; tapping the stage opens a full-bleed player |
| Capture tab behaviour | Launcher screen first (month status + checklist), camera one tap away |
| Visual direction | Mix: Soft Studio (light mode) + Darkroom (dark mode) + serif display type, terracotta accent |
| Notifications | Cut from v1; the Capture tab's due state is the nudge |

## 2. Project structure

```
src/
  lib/
    store/
      create-json-store.ts     ← generic file-backed store factory (the heart)
      use-store-value.ts       ← React binding via useSyncExternalStore
    format-currency.ts         ← RM formatting (ported)
    dates.ts                   ← ISO date helpers (ported subset)
  theme/
    tokens.ts                  ← colors (light+dark), type scale, spacing, radii
    use-theme.ts               ← resolves system light/dark to a token set
  components/                  ← shared UI primitives, one per file, <150 lines
    screen.tsx  card.tsx  button.tsx  chip.tsx  list-row.tsx
    empty-state.tsx  color-dot.tsx  section-voice.tsx  symbol.tsx
  features/
    journey/
      types.ts                 ← JourneyEntry, BracketColor, EntryPhoto
      store.ts                 ← entries store (createJsonStore)
      logic.ts                 ← month numbering, due state, labels
      bracket-colors.ts        ← 8 preset colours
      components/              ← PhotoStage, Filmstrip, EntryRow, DuePrompt
    capture/
      photo-files.ts           ← save/delete photo files under documentDirectory/photos/
      components/              ← GhostOverlay, CameraControls, ColorSwatchPicker
    visits/
      types.ts  store.ts  components/
    payments/
      types.ts  store.ts  components/
    profile/
      types.ts  store.ts
  app/                         ← routes only; thin composition of feature parts
    _layout.tsx                ← root stack, theme + fonts, splash
    (tabs)/_layout.tsx         ← Journey / Capture / More
    (tabs)/index.tsx           ← Journey (home)
    (tabs)/capture.tsx         ← Capture launcher
    (tabs)/more.tsx            ← More
    player.tsx                 ← full-bleed flipbook player (modal)
    compare.tsx                ← before/after slider
    camera.tsx                 ← camera + ghost overlay (full-screen)
    review.tsx                 ← review & save captured photo
    entry/[id].tsx             ← journey entry detail/edit
    visits/index.tsx  visits/new.tsx  visits/[id].tsx
    payments.tsx
    settings.tsx
assets/images/                 ← existing logo kept for icon/splash
```

**The feature recipe (documented at the top of the rewritten AGENTS.md):**
to add a feature — 1) define types in `features/<name>/types.ts`, 2) create a store with `createJsonStore`, 3) build components that read it via `useStoreValue`, 4) add a thin route file. Nothing else to learn.

Rules that keep it maintainable:

- Route files compose feature components; they contain no business logic and no direct file-system access.
- Only stores and `photo-files.ts` touch persistence. Swapping local JSON for an API later touches one file per feature.
- No barrel god-files. Each component is its own file under 150 lines.
- No new dependencies beyond the list in §8 without a reason written in AGENTS.md.

## 3. Data layer

### Store factory

```ts
type JsonStore<T> = {
  get(): T;
  set(next: T): void;
  update(fn: (current: T) => T): void;
  subscribe(listener: () => void): () => void;
  whenReady(): Promise<void>;   // resolves after hydration from disk
};

function createJsonStore<T>(fileName: string, initial: T): JsonStore<T>;
function useStoreValue<T>(store: JsonStore<T>): T;
```

Behaviour: the store starts with `initial`, hydrates asynchronously from `<documentDirectory>/<fileName>` on creation, notifies subscribers on every change, and persists with a debounced write (~300 ms). Corrupt or missing files fall back to `initial`. This is the pattern the old appointments store proved, extracted once and reused by all four stores (journey, visits, payments, profile).

### Domain model

```ts
type BracketColor = { name: string; hex: string };

type EntryPhoto = {
  uri: string;          // file:// under documentDirectory/photos/
  width: number;
  height: number;
  capturedAt: string;   // ISO datetime
};

type JourneyEntry = {
  id: string;
  monthNumber: number;  // 1-based sequence: 1, 2, 3…
  date: string;         // ISO date of the entry
  photo?: EntryPhoto;
  bracketColor?: BracketColor;
  note?: string;
  appointmentId?: string; // optional link to the visit that started this month
};

type Visit = {
  id: string;
  title: string;
  date: string;         // ISO date
  time: string;         // HH:MM
  location: string;
  notes?: string;
  status: 'upcoming' | 'completed' | 'missed';
};

type PaymentRecord = {
  id: string;
  date: string;
  amount: number;       // RM
  method?: 'cash' | 'qrpay' | 'card';
  note?: string;
};
type PaymentsState = { planTotal: number; records: PaymentRecord[] };

type Profile = {
  name: string;
  clinicName: string;
  treatmentStartDate: string; // ISO date
  plannedMonths: number;      // e.g. 24
};
```

Initial profile values: empty name and clinic, `treatmentStartDate` = today, `plannedMonths` = 24. Journey shows its "Set up your journey" card while name is empty.

The journey entry **is** the record: photo files live on disk, but the entry in `journey.json` is the single source of truth. The old separate photo index JSON is gone. Deleting an entry deletes its photo file.

### Journey logic (`features/journey/logic.ts`, pure functions, unit-tested)

- `nextMonthNumber(entries)` — max monthNumber + 1, or 1.
- `dueState(entries, visits, today)` returns `'first' | 'due' | 'done'`:
  - `'first'` — no entries yet.
  - `'due'` — the most recent **completed** visit has no entry photo captured after it, **or** 30+ days have passed since the last photo.
  - `'done'` — otherwise.
- `monthLabel(entry)` — "Month 7 · August".

## 4. Screens & flows

### Journey — `(tabs)/index.tsx` (home)

Theater layout, top to bottom:

1. **Header** — serif italic "Month N", "of M · <Month Year>" beneath, and the **selected entry's** bracket-colour chip on the right (header, chip, and stage all follow the filmstrip selection). N = the selected entry (defaults to latest); M = `profile.plannedMonths`.
2. **Photo stage** — large rounded photo of the selected entry with a date chip. Tap → `/player`.
3. **Filmstrip scrubber** — terracotta play button + one thumbnail per entry; tapping a thumbnail changes the stage; the active thumbnail gets an accent outline. Play button opens `/player` in autoplay.
4. **Due prompt** — slim banner shown only when `dueState` is `'due'`: "Month N is due — capture now" → `/camera`.
5. **"The story so far"** (serif voice) — journey log, newest first: thumbnail, month label, colour dot, note preview. Tap → `/entry/[id]`. A "Compare" text button sits in the section header → `/compare`.

**Empty state (0 entries):** serif welcome line, one paragraph explaining the ritual, primary button "Capture Month 1" → `/camera`. If the profile still has default values, a small "Set up your journey" card links to `/settings` first.

### Player — `/player` (modal, full-bleed)

The immersive mode borrowed from the Darkroom concept: photo edge-to-edge on charcoal, month + colour chips floating on top, a scrub bar with month tick labels at the bottom, play/pause button. Play advances one frame per ~400 ms with a light haptic tick per frame. Horizontal drag on the scrub bar moves through months. All entry photos are preloaded (`expo-image`) so scrubbing is instant. Close button top-right.

### Compare — `/compare`

Before/after slider: two month pickers (defaults: first vs latest), the two photos stacked with a draggable vertical divider (gesture-handler + reanimated clip). Month chips label each side. Reachable from Journey's log header and from the player.

### Capture tab — `(tabs)/capture.tsx` (launcher)

- Title + subtitle showing `dueState`: "Month 8 · due — visit on Aug 25 done" / "Month 7 captured ✓".
- Card "This month's photo": status line + primary button "Open camera" → `/camera`. When done, shows the captured photo thumbnail → `/entry/[id]`.
- Card "Quick checklist": same spot & lighting, line up the ghost, big smile teeth together.

### Camera — `/camera` (full-screen)

- `CameraView` (expo-camera), front camera default, flip button.
- **Ghost overlay**: the previous entry's photo rendered absolutely over the preview at 45% opacity with a "Line up with <Month>'s photo" hint. Toggle button (on by default). Hidden entirely for the first capture.
- Preview mirroring and captured-photo mirroring must match so the saved photo aligns with what the user framed (verify `CameraView.mirror` behaviour on device during implementation).
- Permission gate: friendly explainer + "Allow camera" button; if denied at the OS level, a button that opens system Settings.
- Shutter → `takePictureAsync` → `/review` with the temp URI.

### Review — `/review`

- Photo preview with "Retake" chip (back to camera).
- Bracket colour picker: 8 preset swatches (pink, blue, teal, purple, orange, silver, green, black), single-select, optional.
- Note field (one-line placeholder: "wire tightened, a bit sore").
- Primary button "Save Month N": moves the photo from cache into `documentDirectory/photos/` via `photo-files.ts`, creates the `JourneyEntry`, links `appointmentId` when the most recent completed visit has no entry after it (the same condition that makes a month "due"), then navigates back to Journey, which defaults to the latest month — the one just saved.
- "Discard" (confirm dialog) → deletes temp file, back to Capture tab.

### Entry detail — `/entry/[id]`

Full photo, month label, date, editable colour + note, delete button (confirm; removes entry + photo file).

### More — `(tabs)/more.tsx`

Small profile header (name, clinic, "Month N of M"), then three list rows: **Visits**, **Payments**, **Settings**.

- **Visits** (`/visits`, `/visits/new`, `/visits/[id]`): same capabilities as today, rebuilt on the store factory. The 4-step 708-line wizard becomes one scrollable form (title chips, date, time, location, notes). Visit detail keeps the status row (upcoming/completed/missed) and delete. **Marking a visit completed shows a prompt: "Changed brackets? Capture Month N" → `/camera`** — this closes the loop between visits and photos.
- **Payments** (`/payments`): editable plan total, paid/remaining summary with a progress bar, list of payment records, "Add payment" inline form (amount, date, method). All amounts in RM via `format-currency`.
- **Settings** (`/settings`): edit profile fields (name, clinic, treatment start date, planned months).

## 5. Design system

### Principles (the anti-slop rules)

- One accent colour; the user's monthly bracket colours provide the rest of the colour story.
- SF Symbols via `expo-symbols` for icons (text fallback on non-iOS). Never emoji as icons.
- No gradient hero cards, no decorative pills, no fake data, no motivational filler.
- Serif italic for the big moments only (month headings, section voices, empty states); system sans for everything functional.
- Hairline borders in light mode; flat elevated surfaces in dark mode. No heavy shadows.

### Colour tokens (`theme/tokens.ts`)

| Token | Light (Soft Studio) | Dark (Darkroom) |
|---|---|---|
| bg | `#FAFAF8` | `#141417` |
| surface | `#FFFFFF` | `#1E1E23` |
| border | `#EDEDE9` | `#2A2A31` |
| textPrimary | `#1A1A1E` | `#F2F2F5` |
| textSecondary | `#6E6E76` | `#9A9AA4` |
| textTertiary | `#A0A0A8` | `#6E6E78` |
| accent (terracotta) | `#B0563F` | `#DD7A58` |
| onAccent | `#FFFFFF` | `#23120B` |
| danger | `#C24A4A` | `#E07070` |

Theme follows the system appearance (`useColorScheme`); no in-app toggle in v1.

### Typography

- **Display serif** — bundled italic serif via expo-font (`@expo-google-fonts` — Instrument Serif italic as the default candidate, Fraunces as runner-up; final pick shown to the user in the simulator during implementation; Georgia is the fallback stack).
  - display 30, title 20, voice 15 (section lines like "The story so far").
- **System sans** — body 15, label 13 semibold, caption 12, micro 11 uppercase +0.6 tracking.

### Other tokens

- Spacing: 4-pt scale (4/8/12/16/20/24/32).
- Radii: 6 (thumbnails), 12 (cards), 18 (photo stage), 999 (chips/buttons).
- Bracket colour presets (`features/journey/bracket-colors.ts`): pink `#E05C8A`, blue `#5C8AE0`, teal `#3FAE9D`, purple `#9B6EE0`, orange `#E0A35C`, silver `#C0C0CC`, green `#5CA85C`, black `#3A3A40`.

## 6. Edge cases & error handling

- **0 entries** — Journey shows the empty state; filmstrip, play, compare, and due-banner hidden. Capture tab reads "Month 1 · not started".
- **1 entry** — stage + log render; player opens but scrubbing is a no-op; Compare is hidden until 2 photos exist; camera shows no ghost.
- **Camera permission denied** — explainer gate with Allow / Open Settings; the app never dead-ends.
- **File-system write failure** — store keeps the in-memory state, retries the debounced write, and surfaces a non-blocking "couldn't save" toast if it keeps failing.
- **Corrupt JSON on hydrate** — fall back to `initial`; never crash on launch.
- **Entry deletion** — confirm dialog; removes the photo file and the entry atomically (entry first, then best-effort file delete).
- **Photo file missing at render** (e.g. after an OS cleanup) — `expo-image` fallback placeholder, entry remains editable/deletable.

## 7. Testing

- **Unit (jest-expo, TDD):** `create-json-store` (hydrate, update, subscribe, debounce, corrupt-file fallback — expo-file-system mocked), `journey/logic` (month numbering, due state including the visit-linkage rule), `format-currency`, `dates`.
- **Component (@testing-library/react-native), selectively:** review screen save wiring (colour + note land on the entry), Journey empty→populated switch.
- **Manual in iOS simulator:** camera flow (simulator fake camera), player scrub/play, compare slider, light/dark themes. No snapshot tests.

## 8. Tech stack & scaffold

Fresh `create-expo-app` (latest SDK, expo-router template) **in this repo**, on a new git branch:

- **Wipe:** `src/`, `ios/`, `android/` (regenerated by prebuild), old configs superseded by the new scaffold.
- **Keep:** git history, `assets/images/` logo (icon + splash), LICENSE, `.gitignore`, app identity in `app.json` (name "BracesJourney", same slug + bundle identifiers so device installs replace the old app).
- **Port (rewritten, with tests):** `format-currency`, the date-helper subset, visit-form option constants.
- **Delete concepts:** fake analysis/verification, cartoon smile map, dashboard mock data, photo index JSON, 4-step wizard, NativeWind/React Query/Axios mentions in docs (never actually installed).

Dependencies: `expo-router`, `expo-camera`, `expo-file-system`, `expo-image`, `expo-font` + serif font package, `expo-haptics`, `expo-symbols`, `expo-splash-screen`, `expo-status-bar`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`. Dev: `typescript`, `eslint-config-expo`, `jest-expo`, `@testing-library/react-native`.

`AGENTS.md` is rewritten from scratch: the feature recipe first, then structure, tokens, store contract, and the maintenance rule. The stale Laravel/NativeWind/`mobile/` sections are removed.

## 9. Out of scope (v1)

- Backend/API, sync, accounts (structure is ready; nothing built).
- Push notifications and reminders.
- Any computed photo analysis (scores, alignment detection).
- Android polish (iOS-first; Android must build but is best-effort).
- Data migration from the old app's on-device files.
- Pain-level tracking as a structured field (the note covers it).
