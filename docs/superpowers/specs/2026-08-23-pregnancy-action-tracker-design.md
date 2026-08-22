# Pregnancy Action Tracker — Design Spec

Date: 2026-08-23

## Overview

An iOS app for the pregnant person to log arbitrary, self-defined "actions"
(events) during pregnancy — e.g. baby movements, contractions — each with a
timestamp (and optionally a duration), and to review them on a filterable
dashboard. Built to eventually ship on the App Store.

## Goals

- Let the user define custom action types (not hardcoded to kicks/contractions)
- Log an event for any action type quickly, with the current time or a
  manually chosen time
- Support both instant events (single timestamp) and duration events
  (start + end), since contractions need a duration and baby movements don't
- Show a dashboard of logged events, filterable by time range (day / month /
  full pregnancy) and by action type
- Keep all data on-device — no accounts, no backend, no data leaves the phone
  unless the user explicitly exports it
- Let the user manually export all their data to a single backup file (and
  import it back), since on-device-only storage has no automatic safety net
  against a lost/reset phone or a reinstall
- Buildable and testable entirely from a Windows machine, with no Mac
  required at any point (including final App Store submission)
- New-to-mobile-dev friendly: minimal moving parts, small dependency surface

## Non-goals (for this MVP)

- Cloud sync / automatic backup — export/import is a manual, user-triggered
  action, not a background sync
- Multi-device support
- Sharing data with a partner or provider
- Live-running stopwatch UI for duration events (start now, come back later
  to stop) — first version uses a single form where both start and end are
  set at once (defaulting to "now", editable). A live timer mode is a
  reasonable fast-follow, not part of this MVP.
- Notes/attachments on events
- Custom colors/icons per action type

## Tech Stack

- **React Native + Expo (managed workflow), TypeScript** — chosen because
  the developer is on Windows with no Mac. Expo's cloud build service
  (EAS Build) produces the iOS binary remotely, and the Expo Go app allows
  live device preview (scan a QR code) during development — no Xcode or
  macOS needed at any stage, including App Store submission (via EAS
  Submit).
- Navigation: Expo Router, tab-based (maps directly to the three-tab
  structure below)
- State: React Context + small custom hooks per data type — no
  Redux/MobX/etc., the data volume and update patterns here don't warrant
  it
- Persistence: plain JSON, read/written via `expo-file-system` to a file in
  the app's document directory — the direct equivalent of the
  Codable-to-JSON-file approach originally spec'd, just in TypeScript
- Testing: Jest for unit tests; manual testing via Expo Go on a physical
  iPhone

## Data Model

```typescript
interface ActionType {
  id: string;              // uuid
  name: string;             // required, trimmed non-empty, max 50 chars, unique (case-insensitive)
  hasDuration: boolean;     // instant tap vs. start/end
  isDefault: boolean;       // true for the two seeded actions; still editable/deletable
}

interface ActionEvent {
  id: string;               // uuid
  actionTypeId: string;
  startDate: string;        // ISO 8601; required, defaults to "now" in the UI, user-editable
  endDate: string | null;   // ISO 8601; required if the action's hasDuration == true; must be >= startDate
}

interface Settings {
  dueDate: string;          // ISO 8601; required; used to compute current pregnancy week
                             // and to bound the "full pregnancy" dashboard filter
}
```

Each of the three types is persisted independently:
`actionTypes.json`, `events.json`, `settings.json`, all in the Documents
directory.

## Validation Rules

- `ActionType.name` — required, trimmed non-empty, max 50 characters, unique
  case-insensitively among existing action types
- `ActionEvent.startDate` — required (always set, never left blank)
- `ActionEvent.endDate` — required when the referenced action type has
  `hasDuration == true`; must be `>= startDate`
- `Settings.dueDate` — required, must be a valid `Date`
- **Import file** — must be valid JSON with the expected top-level shape
  (`actionTypes: ActionType[]`, `events: ActionEvent[]`, `settings:
  Settings`); every entry within it is re-validated against the rules
  above. If the file is malformed or any entry fails validation, the import
  is rejected in full (no partial import) and the user's existing data is
  left untouched — an error message explains what failed.

Validation runs inside each Store's create/update methods and throws a
specific validation error; the UI surfaces failures as inline field errors
(e.g. red helper text under the name field) and disables the save action
until resolved. Validation errors are distinct from I/O errors (see Error
Handling).

## Screens & Navigation

Three-tab layout (Expo Router tab navigator):

1. **Dashboard** (home) — list of logged events, most recent first.
   - Time-range filter: Day / Month / Full Pregnancy (segmented control)
   - Action-type filter: All / specific action type (picker)
   - Header shows current pregnancy week, computed from `Settings.dueDate`
   - "+" button opens the log-event form
2. **Actions** — manage action type definitions: list existing types
   (including the two defaults), add new, edit, delete.
3. **Settings** — set/edit due date; **Export Data** and **Import Data**
   actions (see below).

**Log Event form:** pick an action type, set start time (default: now,
editable), and — only if the chosen action type has a duration — also set
an end time (default: now, editable). Validation runs before save.

## Backup & Restore

- **Export**: combines the current contents of all three stores
  (`actionTypes`, `events`, `settings`) into one JSON file, then opens the
  native OS share sheet (`expo-sharing`) so the user can save it to Files,
  iCloud Drive, email it to themselves, AirDrop it, etc. Fully manual,
  on-demand — no scheduled or background export.
- **Import**: opens a document picker for the user to select a previously
  exported JSON file. The file is validated (see Validation Rules below)
  before anything changes. On success, the user is shown a confirmation
  ("This replaces all current data on this device") before the import
  overwrites all three stores — kept as a full replace rather than a merge,
  since import is expected to happen right after a fresh install onto an
  empty app, and a merge would add complexity (duplicate/ID-conflict
  handling) with little real benefit here.

## Data Flow & Persistence

- Three React Context providers — `ActionTypesProvider`, `EventsProvider`,
  `SettingsProvider` — one per JSON file, each exposing its data plus
  create/update/delete functions via a matching hook (`useActionTypes()`,
  `useEvents()`, `useSettings()`).
- Each provider loads its file once on app start via `expo-file-system`. If
  the file doesn't exist yet (first launch), `ActionTypesProvider` seeds two
  default action types: "Baby movement" (`hasDuration: false`) and
  "Contraction" (`hasDuration: true`).
- Components read state via the hooks; no prop drilling.
- Every mutation (create/edit/delete) validates first, updates the in-memory
  state, then rewrites the entire JSON file to disk. Data volume here
  (hundreds of events at most over a pregnancy) makes whole-file rewrites
  simple and fast enough — no need for incremental writes or a database.

## Error Handling

- **Validation errors** (bad input): inline field errors in the form; save
  disabled until resolved. Never written to disk.
- **File I/O errors** (rare disk read/write failure): the app keeps its last
  known-good in-memory state and shows a non-blocking banner/alert
  ("Couldn't save — try again"). The app never crashes or silently drops
  data.
- **Missing file on first launch**: treated as empty state, not an error
  (see seeding above).

## Testing

- Jest unit tests per data hook: create/edit/delete, each validation rule
  (empty name, duplicate name, end-before-start, missing due date, etc.),
  and load/save round-trip against a mocked file system.
- Jest unit tests for the dashboard's date-filtering logic (day / month /
  full pregnancy grouping, and pregnancy-week calculation from due date) —
  the trickiest pure logic in the app, worth covering directly.
- Jest unit tests for export (produces the expected combined JSON) and
  import (accepts a valid file, rejects a malformed one without touching
  existing data, replaces all three stores on success).
- Manual testing via the Expo Go app on a physical iPhone for the full UI
  flows: log an instant event, log a duration event, edit/delete an action
  type, change due date, apply dashboard filters, export then re-import a
  backup file.

## Deployment & Distribution

Entirely Mac-free, start to finish. **Not published to the public App
Store for now** — distributed via TestFlight instead.

- **Local development**: run `npx expo start` on the Windows machine, then
  scan the printed QR code with the Expo Go app (free, from the App Store)
  on a personal iPhone. Live reload, no build step, no Xcode. Expo Go
  supports everything this app needs (no native modules outside Expo's
  managed set).
- **Production installs on personal phones (chosen approach: TestFlight)**:
  - Requires an Apple Developer Program account ($99/year) — needed for
    code signing regardless of distribution method, since there's no Mac
    available for the free-tier 7-day Xcode install workflow.
  - Build the iOS binary in the cloud with EAS Build, then upload it to
    App Store Connect with EAS Submit — both run from the command line on
    Windows, no Xcode involved.
  - Add testers (self, family) as internal testers in App Store Connect by
    email. They install the free TestFlight app once, accept the invite,
    and get the app through it — no public listing, no App Store review
    for internal testers.
  - **Each build expires 90 days after upload.** Before that, re-run the
    same EAS Build + Submit commands to upload a fresh build, which resets
    the clock. As long as it's installed as an *update* (not reinstalled
    from scratch after deletion), local data persists across this —
    see Backup & Restore above for the safety net if a build lapses and
    the app gets removed before renewal.
- **Public App Store release (later, if ever)**: same EAS Submit flow,
  just targeting a public listing instead of internal TestFlight testers —
  icon, screenshots, description, privacy policy URL, full Apple review.
  Because all data stays on-device with no accounts and nothing transmitted
  off the phone (aside from an explicit user-triggered export), the App
  Store privacy questionnaire and review are about as simple as they get
  for a health-adjacent app.
