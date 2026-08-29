# API Consumption — Design

Rework the v3 app from fully on-device to server-backed, consuming the Laravel
`/api/mobile/v1` surface in `braces-journey-be`.

**Governing principle:** the mobile app is the product and the authoritative
domain. Wherever the app and the API disagree, the backend changes to fit the
app — never the reverse. The backend changes this requires are specified in
`braces-journey-be/docs/superpowers/specs/2026-08-29-mobile-alignment-design.md`
(the "alignment wave") and must land before mobile work consumes them.

## Decisions (agreed 2026-08-29)

- **Offline model**: cache reads, online writes. Browsing (journey, flipbook,
  compare, lists) works offline from a local cache; creating/editing/deleting
  requires connectivity and shows real loading and error states. No offline
  write queue.
- **Existing local data**: one-time upload migration on first sign-in.
- **Migration conflicts (D5, alternate chosen)**: full migration runs only
  into an empty server account. If the account already has server data, the
  app offers a manual merge limited to journey entries — a screen listing
  local months absent on the server for the user to select and upload.
  Profile, visits, and payments are never merged; server wins for those.
- **Contract fixes (D1–D4)**: visit `type` nullable, `qrpay` payment method +
  nullable `method`, `braces_type` exposed on profile in the app's vocabulary,
  photo-less journey entries allowed (quota counts photos only). All
  backend-side; see the alignment spec.

## Architecture

### The store seam

Each feature keeps its store module and the synchronous `JsonStore<T>`
contract (`get/set/update/subscribe/whenReady`). `createJsonStore` is
replaced per feature by an API-backed store that:

- hydrates synchronously from a local cache file (same JSON files as today,
  now serving as cache) so `get()` never blocks and screens render instantly;
- refreshes from the API on app launch and foreground focus (`GET`, all
  pages — journey/visits paginate at 50 and due-state logic needs full
  collections), writing the fresh result to memory + cache;
- performs writes API-first: `POST/PATCH/DELETE` awaits the server, and only
  on success updates memory + cache. Failures surface where the user acted
  (inline in the form, keeping their input) with the existing
  `SaveErrorBanner` generalized into an API-error channel for background
  refresh failures.

`whenReady()` becomes real: it resolves after the first successful refresh
(or immediately when offline with a non-empty cache).

### Auth

- Token: Laravel Sanctum bearer token, stored in `expo-secure-store`
  (new dependency — reason to be recorded in AGENTS.md). `device_name` sent
  as the device model name.
- Gate: the `(tabs)/_layout.tsx` redirect changes from `profile.onboardedAt`
  to "no token → `/welcome`". `onboardedAt` keeps gating the onboarding
  pager for freshly registered accounts.
- New screens: `welcome` (sign in / create account), `sign-in`,
  `create-account`. Register chains into the existing onboarding pager,
  whose final step now performs `PUT profile` (name, clinic, start date,
  planned months, braces type); the optional photo import then posts
  entries through the normal API path.
- Logout (from More): `POST auth/logout`, clear token + caches, return to
  welcome.

### API client

One hand-rolled fetch wrapper in `src/lib/api/` (no axios, no react-query —
the store pattern already owns caching):

- Base URL from `process.env.EXPO_PUBLIC_API_URL`, set per EAS build profile
  in `eas.json`; development defaults to the Herd URL
  `https://braces-journey-be.test`. (Android emulator cannot resolve `.test`
  — document `10.0.2.2` / LAN-IP override in the dev setup notes.)
- JSON and multipart requests, `Authorization: Bearer`, typed error result
  `{ status, code, message, fieldErrors }` from the API's
  `{ message, code }` / 422 shapes. 401 anywhere → clear token, route to
  welcome.
- **Boundary normalization**: all dates cross the boundary as the app's
  `YYYY-MM-DD` strings (the client splits ISO datetimes), amounts as plain
  numbers, IDs as opaque strings (server integers stringified).

### Entity mapping (app ↔ API)

| App | API | Rule |
|---|---|---|
| `JourneyEntry.date` | `photo_date` | rename only |
| `JourneyEntry.note` | `notes` | rename only |
| `JourneyEntry.bracketColor {name,hex}` | `bracket_color_name/_hex` | split/join |
| `JourneyEntry.photo.uri` | `photo_url` (authenticated) | see Photos |
| `JourneyEntry.appointmentId` | `appointment_id` | server visit id |
| `Visit.date` + `Visit.time` | `appointment_date` datetime | join on write, split on read |
| `Visit.location` | `clinic_name` | rename only |
| `Visit.status` `upcoming` | `status` `scheduled` | map both ways; `completed`/`missed` match; `cancelled` never sent |
| `Visit.title` | `title` | as-is; `type` never sent (nullable, D1) |
| `PaymentRecord.date` | `paid_at` | rename only |
| `PaymentRecord.method` | `method` (incl. `qrpay`, nullable) | as-is (D2) |
| `PaymentsState.planTotal` | `PUT payments/plan-total` / summary `plan_total` | singleton field |
| `Profile.bracesType` | `braces_type` (app vocabulary) | as-is (D3) |
| `Profile.treatmentStartDate`, `plannedMonths` | `treatment_start_date`, `planned_months` | rename only |
| `Profile.onboardedAt` | — | stays device-local |

`EntryPhoto.width/height/capturedAt` stay device-local for cached photos;
they are display hints, not synced state.

### Photos

- Upload: multipart `photo` on entry create (and on the alignment wave's
  attach endpoint for adding a photo to a note-only month). Client resizes
  to a sane long edge (~2000px, JPEG) via `expo-image-manipulator` (new
  dependency — reason in AGENTS.md) before upload; the server caps at 10 MB.
- Read: `photo_url` points at the authenticated streaming endpoint. The
  store downloads each photo once into the existing
  `documentDirectory/photos/` cache (keyed by entry id) and screens keep
  rendering local `file://` URIs — the flipbook, ghost overlay, and compare
  stay offline-capable and need no auth-header plumbing in `expo-image`.
- Quota: a 403 `photo_quota_exceeded` on upload gets a dedicated message in
  the capture/import flows (free plan: 24 photos).

### Screen-level changes

- Loading/error states appear only where writes happen (review save, visit
  form, payment form, settings, onboarding, import) plus a lightweight
  refresh indicator on list screens. Reads never spin — cache-first.
- `entry/[id].tsx` note save moves from save-on-unmount to an explicit Save
  action (async writes can't ride unmount).
- `import-photos` becomes a sequential upload with per-item progress and
  partial-failure retry (it currently loops synchronously up to 24 items).
- Dashboard endpoint: not consumed. The app keeps computing `dueState`
  locally over the cached collections (same rule, no extra request).

## One-time migration (existing v3 users)

Trigger: after sign-in, when local stores contain data.

1. `GET journey-entries` (page 1) + `GET visits` + `GET payments` to decide:
   server empty → full migration; server non-empty → journey-months merge
   offer only (D5 alternate).
2. Full migration order: `PUT profile` → `POST visits` (building a
   local-id → server-id map) → `POST journey-entries` (multipart, photo when
   present, `appointment_id` remapped) → `POST payments` +
   `PUT payments/plan-total`.
3. Progress UI per item; a `migration.json` scratch file tracks per-item
   status so a killed app or failed item resumes instead of restarting.
   A 422 unique-month conflict counts as already-uploaded.
4. On completion the local files are replaced by the server-refreshed cache
   (server ids everywhere) and `migration.json` is deleted.

## Testing

jest-expo, as today. The API client gets unit tests against a mocked
`fetch` (request shapes, error normalization, date/amount boundary rules).
API-backed stores get tests for hydrate/refresh/write-first semantics and
failure paths. Migration gets unit tests over the id-remap and resume logic.
Existing screen tests keep passing with stores mocked at the same seam.
Keep `metro.config.js`'s test `blockList` in mind for any test files under
`src/app/`.

## New dependencies (AGENTS.md entries required)

- `expo-secure-store` — token storage.
- `expo-image-manipulator` — client-side photo resize before upload.

## Out of scope

Offline write queue/sync protocol, push notifications, premium
purchase/upgrade flow, dashboard endpoint consumption, photo thumbnails,
daily logs / emergency issues / care guides (later backend phases).
