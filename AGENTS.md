# BracesJourney

Mobile braces tracking application for users to manage their orthodontic journey including appointments, progress photos, braces colours, and payment tracking.

---

# Project Overview

BracesJourney is a mobile-first application built using React Native and Laravel API.

The application allows users to:
- Track orthodontist appointments
- Upload monthly braces progress photos
- Record braces colours
- Monitor treatment payments
- Track pain/progress notes
- Receive reminders

---

# Tech Stack

## Mobile App
- React Native
- Expo
- NativeWind (TailwindCSS for React Native)
- React Navigation
- React Query
- Axios
- React Hook Form

## Backend API
- Laravel
- Laravel Sanctum / JWT
- MySQL
- REST API architecture

## Storage
- Cloudflare R2 / AWS S3 (After finished development)
- Local storage for development

---

# Project Structure

## Mobile

```text
mobile/
 ├── src/
 │    ├── screens/
 │    ├── components/
 │    ├── navigation/
 │    ├── hooks/
 │    ├── services/
 │    ├── api/
 │    ├── store/
 │    ├── utils/
 │    ├── constants/
 │    ├── features/
 │    │    ├── appointments/
 │    │    ├── capture/
 │    │    ├── dashboard/
 │    │    ├── more/
 │    │    ├── payments/
 │    │    └── progress-gallery/
 │    └── types/
 └── assets/
```

---

# Current Implementation Notes

Last updated: 2026-06-17

## Visual Direction (v2)
- Brighter, friendlier mobile-first redesign focused on iPhone sized screens.
- Soft gradient background, brand-tinted card surfaces, and rounded "pill" chips.
- Bigger hero cards (gradient backgrounds) at the top of every tab.
- 28pt display type for hero titles; 22pt for card titles; 14pt for secondary copy.
- Spacing scale (4pt grid) and Radii tokens live in `src/constants/theme.ts`.
- Soft tints for brand colors are exposed under `Tints` in the theme.

## Design System Tokens (`src/constants/theme.ts`)
- `Colors` — light + dark semantic text/background tokens.
- `BrandColors` — navy / teal / blue / pink / green.
- `Tints` — soft tints per brand color (used for hero cards, pills, tracks).
- `Radii` — `xs/sm/md/lg/xl/pill` corner tokens.
- `Spacing` — `half/one/two/three/four/five/six` 4pt scale.
- `FontSizes` — `caption/small/body/title/display/hero`.
- `Shadows` — `card/soft/hero/pink` brand-tinted shadow presets.

## Shared UI Surface (`src/components/main-screen.tsx`)
- Exports `MainScreen`, `ScreenHeader`, `GreetingHeader`, `HeroCard`, `Card`,
  `CardList`, `StatCard`, `StatGrid`, `SectionHeading`, `Pill`, `ProgressRing`,
  `ProgressBar`, `ActionTile`, `ActionGrid`.
- All five tabs use `MainScreen` so they share a consistent scrollable shell
  with a tinted background, header, and consistent vertical rhythm.

## Mobile Navigation
- The app is focused on `npm run ios` / Expo iOS development.
- Main tabs are defined in `src/constants/main-tabs.ts`.
- Current tabs:
  - Home
  - Visits
  - Photos
  - Pay
  - More
- Tab bar uses a tinted background and selected tab uses a teal pill
  indicator. Labels are short and clear.
- **Routing architecture:**
  - Root `src/app/_layout.tsx` — `Stack` navigator (headerShown: false)
  - `src/app/(tabs)/_layout.tsx` — delegates to `AppTabs` (NativeTabs on iOS, web Tabs on web)
  - Tab screens live in `src/app/(tabs)/` (index, appointments, progress-gallery, payments, more)
  - Detail/modal screens live at root level as Stack siblings:
    - `src/app/appointments/new.tsx` and `src/app/appointments/[id].tsx` (with their own Stack `_layout.tsx`)
    - `src/app/capture-photo.tsx`, `src/app/compare-photos.tsx`, `src/app/photo-review.tsx`
    - `src/app/journey-timeline.tsx`
  - `router.push('/appointments/new')` from a tab pushes onto the root Stack above the tabs.


## Branding
- Logo asset: `assets/images/braces-journey-logo.png`
- Reusable logo component: `src/components/brand-logo.tsx`
- App icon and splash image are configured in `app.json` using the BracesJourney logo.

## Currency
- Default currency is Malaysian Ringgit.
- Use `src/utils/format-currency.ts` for RM formatting.
- Do not hardcode `$` values in UI files.

## Scalable Frontend Structure
- Shared app screen shell/cards: `src/components/main-screen.tsx`
- Shared branded screen background: `src/components/app-background.tsx`
- Dashboard feature files:
  - `src/features/dashboard/types.ts`
  - `src/features/dashboard/data/dashboard.ts`
  - `src/features/dashboard/components/`
- Appointments feature files:
  - `src/features/appointments/types.ts`
  - `src/features/appointments/data/appointments.ts`
  - `src/features/appointments/components/`
- Payments feature data:
  - `src/features/payments/data/payments.ts`
  - `src/features/payments/components/`
  - `src/features/payments/types.ts`
- Progress gallery feature files:
  - `src/features/progress-gallery/types.ts`
  - `src/features/progress-gallery/data/progress-gallery.ts`
  - `src/features/progress-gallery/components/`
- Capture feature files (live progress photos):
  - `src/features/capture/types.ts`
  - `src/features/capture/data/capture.ts`
  - `src/features/capture/services/photo-verification.ts`
  - `src/features/capture/services/photo-storage.ts`
  - `src/features/capture/components/`
- More/Profile feature files:
  - `src/features/more/types.ts`
  - `src/features/more/data/more.ts`
  - `src/features/more/components/`

## Tab-by-Tab UX

### Home (`src/app/index.tsx`)
- Simplified for quick scanning — designed to fit on a single iPhone screen
  with no long scrolling.
- Greeting header (name, date, avatar).
- Treatment-progress hero card (progress ring + next visit + months bar).
- Three "today" glance tiles (next visit, comfort, next bill).
- Quick-action tiles (log comfort, photo, color, pay).
- Today's reminders list (max 2 cards).
- Removed in this pass: treatment-progress bar chart, today's check-in
  stat grid, and the motivational tip card.

### Visits (`src/app/appointments.tsx`)
- Single-screen list. No inline date strip, time picker or confirm card.
- Next visit hero card (tap → `/appointments/[id]`).
- `+ N upcoming` pill when more than one is queued.
- Section heading with `+ Add` shortcut to `/appointments/new`.
- Vertical chronological list of every visit (newest date first).
- Floating `+ New appointment` pill FAB at the bottom always visible.
- Empty state when the user has not added any appointments yet.

### Visits — Detail (`src/app/appointments/[id].tsx`)
- Hero summary card for a single appointment (title, date, time, location).
- Quick status pill row (Mark upcoming / Mark completed / Mark missed).
- Notes panel with optional extra reminders.
- Destructive `Delete visit` action at the bottom.

### Visits — New (`src/app/appointments/new.tsx`)
- Multi-step wizard powered by `AddAppointmentForm` (4 steps):
  1. **Visit type** — pick a preset chip or type your own title.
  2. **Date & time** — key-in `YYYY-MM-DD` + `HH:MM` (or tap quick picks).
  3. **Location & notes** — defaults to `Ortho Care Clinic`.
  4. **Review** — read-only summary before saving.
- Persists via `addAppointment()` which writes to the local store
  (persisted to `appointments.json` via `expo-file-system`) and triggers subscribers
  so all screens (including Home and More next-visit widgets) update dynamically in real time.

### Visits — Data layer (`src/features/appointments/data/appointments.ts`)
- Local JSON store backed by an initial seed list, persisted via FileSystem.
- Helpers: `listAppointments`, `getNextAppointment`, `getAppointment`,
  `addAppointment`, `updateAppointment`, `deleteAppointment`,
  `subscribeAppointments`, plus the `appointmentTypeOptions` /
  `appointmentTimeOptions` constants used by the wizard.

### Visits — Date helpers (`src/features/appointments/utils/format-appointment-date.ts`)
- Pure helpers shared by every screen + form: `formatAppointmentDate`,
  `formatAppointmentShort`, `relativeDayLabel`, `parseIsoDate`,
  `todayIso`, `todayPlusIso`, `formatTimeInput`.

### Photos (`src/app/progress-gallery.tsx`)
- Hero with "latest photo" snapshot, confidence pill, and CTAs
  (`📷 Take photo` → `/capture-photo`, `↔️ Compare` → `/compare-photos`).
- Bottom "📷 Capture today's photo" CTA card for easy access.
- "This month's analysis" with progress bars for alignment / spacing / smile arc.
- Cartoon smile map centerpiece (visual tracking of tooth position).
- Vertical photo log (date, score, thumbnail).
- Capture checklist (same angle, after appointments).
- Hero CTAs route to the live capture flow.

### Pay (`src/app/payments.tsx`)
- Balance hero (total, paid, remaining).
- Progress bar with milestones.
- Method selection cards (Cash, QRPay, Credit Card).
- Upcoming/installment timeline.
- Confirmation card with pay CTA.

### More (`src/app/more.tsx`)
- Profile summary card (avatar, name, clinic, treatment stage).
- Stat tiles (months, photos, pain level).
- Hero with next visit + treatment stage.
- Shortcut grid (Profile, Reminders, Timeline, Colors, Storage).
- Reminder settings list.
- Settings list (Storage, Notifications, Sign out).

### Journey Timeline (`src/app/journey-timeline.tsx`)
- Linked from the More tab.
- Hero summary (months in + total updates).
- Vertical timeline with brand-colored dots and tag pills.
- Color history swatches.
- Monthly check-in tip card.

## Photo Capture Flow

The live photo-capture experience is wired through three new routes plus
a self-contained `capture` feature module.

### Routes
- `/capture-photo` (`src/app/capture-photo.tsx`)
  - Full-screen `<CameraView>` from `expo-camera` (front camera default).
  - Animated smile guide overlay that tints green when the photo is ready
    and pink when it is not.
  - Permission gate with friendly copy + a single "Allow camera" CTA.
  - `CaptureControls` at the bottom (flip, capture button, recent thumbnail).
- `/photo-review` (`src/app/photo-review.tsx`)
  - Shows the just-taken photo, its analysis score, and a tip card.
  - Three actions: **Retake** (back to camera), **Discard**, **Save**.
  - On save, persists the photo via `savePhoto` and pops back to the gallery.
- `/compare-photos` (`src/app/compare-photos.tsx`)
  - Side-by-side "before / after" picker built on the static photo log.
  - Score delta and tone-coded analysis highlights.
  - CTA card linking back to `/capture-photo` for a fresh photo.

### Feature module — `src/features/capture/`
- `types.ts` — `CapturedPhoto`, `CaptureIssue`, `CaptureHint`, `VerificationResult`.
- `services/photo-verification.ts` — calls the (mock) verification API and
  returns a `VerificationResult` with a friendly hint list.
- `services/photo-storage.ts` — copies temp captures into
  `<documentDirectory>/progress-photos/`, maintains a JSON index.
  Exposes `savePhoto`, `listPhotos`, `deletePhoto`, `updatePhoto`.
- `data/capture.ts` — static capture-tips, today's challenge, monthly goals.
- `components/`
  - `SmileGuideOverlay` — animated teal arc + position arrow.
  - `CaptureControls` — flip / capture / thumbnail row.
  - `AnalysisResultCard` — score, accept/reject, hint list.
  - `PhotoComparison` — before/after picker with score delta.

### Camera permission wiring
- `app.json` declares the `expo-camera` plugin and adds the iOS
  `NSCameraUsageDescription` / `NSPhotoLibraryAddUsageDescription` strings
  plus the Android `android.permission.CAMERA` entry.
- The iOS simulator's fake camera (`Camera` → `FaceTime HD`) is supported —
  the verification step will still report a "low_confidence" hint so the
  coaching UI can be reviewed without a real device.

### Entry points
- The Photos tab hero has `📷 Take photo` and `↔️ Compare` pills that
  `router.push` into the capture flow.
- A bottom-of-screen teal CTA on the Photos tab re-prompts the user
  to capture today's photo.
- The `PhotoLogCard` thumbnail in the photo log is a `Pressable` that
  opens the comparison view in a future iteration.

## Appointment Status Colors
- Upcoming → blue
- Completed → teal
- Missed → pink

## Payment Method Colors
- Cash → teal
- QRPay → pink
- Credit Card → blue

## Progress Gallery Direction
- The progress gallery now models photo logs with analysis scores and a cartoon smile map.
- Live photos are persisted to the on-device store via the `capture` feature
  module and can be loaded into the gallery in a future iteration by calling
  `listPhotos()` and merging with the static `photoLogs` scaffold.

## Splash / Animated Icon
- `src/components/animated-icon.tsx` runs once on app start.
- A teal overlay keyframes in to brand background, then logo zooms in.
- The screen index route is `src/app/index.tsx` (the app loads directly into
  the Home tab).

## Maintenance Rule
- Update this `AGENTS.md` after each completed feature or structural change so future agents can continue quickly.
