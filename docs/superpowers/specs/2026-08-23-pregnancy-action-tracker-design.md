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
- New-to-iOS-dev friendly: minimal moving parts, no frameworks beyond
  Swift/SwiftUI/Foundation

## Non-goals (for this MVP)

- Cloud sync / multi-device support
- Sharing data with a partner or provider
- Live-running stopwatch UI for duration events (start now, come back later
  to stop) — first version uses a single form where both start and end are
  set at once (defaulting to "now", editable). A live timer mode is a
  reasonable fast-follow, not part of this MVP.
- Notes/attachments on events
- Custom colors/icons per action type

## Tech Stack

- SwiftUI, Swift, Foundation only — no SwiftData/CoreData/third-party
  dependencies
- Deployment target: iOS 17+ (reasonable modern baseline for a new app in
  2026; easy to lower later if needed since nothing here requires 17
  specifically)
- Persistence: plain `Codable` structs serialized to JSON files in the app's
  Documents directory via `FileManager`

## Data Model

```swift
struct ActionType: Codable, Identifiable {
    let id: UUID
    var name: String        // required, trimmed non-empty, max 50 chars, unique (case-insensitive)
    var hasDuration: Bool   // instant tap vs. start/end
    var isDefault: Bool     // true for the two seeded actions; still editable/deletable
}

struct ActionEvent: Codable, Identifiable {
    let id: UUID
    var actionTypeId: UUID
    var startDate: Date     // required, defaults to "now" in the UI, user-editable
    var endDate: Date?      // required if the action's hasDuration == true; must be >= startDate
}

struct Settings: Codable {
    var dueDate: Date       // required; used to compute current pregnancy week
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

Validation runs inside each Store's create/update methods and throws a
specific validation error; the UI surfaces failures as inline field errors
(e.g. red helper text under the name field) and disables the save action
until resolved. Validation errors are distinct from I/O errors (see Error
Handling).

## Screens & Navigation

Three-tab `TabView`:

1. **Dashboard** (home) — list of logged events, most recent first.
   - Time-range filter: Day / Month / Full Pregnancy (segmented control)
   - Action-type filter: All / specific action type (picker)
   - Header shows current pregnancy week, computed from `Settings.dueDate`
   - "+" button opens the log-event form
2. **Actions** — manage action type definitions: list existing types
   (including the two defaults), add new, edit, delete.
3. **Settings** — set/edit due date.

**Log Event form:** pick an action type, set start time (default: now,
editable), and — only if the chosen action type has a duration — also set
an end time (default: now, editable). Validation runs before save.

## Data Flow & Persistence

- `ActionTypeStore`, `EventStore`, `SettingsStore` are `@Observable` classes,
  one per JSON file.
- Each Store loads its file once at app launch. If the file doesn't exist
  yet (first launch), `ActionTypeStore` seeds two default action types:
  "Baby movement" (`hasDuration = false`) and "Contraction"
  (`hasDuration = true`).
- Views read directly from a Store's published array via SwiftUI.
- Every mutation (create/edit/delete) validates first, updates the
  in-memory array, then rewrites the entire JSON file to disk synchronously.
  Data volume here (hundreds of events at most over a pregnancy) makes
  whole-file rewrites simple and fast enough — no need for incremental
  writes or a database.

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

- Unit tests per Store: create/edit/delete, each validation rule (empty
  name, duplicate name, end-before-start, missing due date, etc.), and
  load/save round-trip against a temp directory.
- Unit tests for the dashboard's date-filtering logic (day / month / full
  pregnancy grouping, and pregnancy-week calculation from due date) — the
  trickiest pure logic in the app, worth covering directly.
- Manual testing in the iOS Simulator for the full UI flows: log an instant
  event, log a duration event, edit/delete an action type, change due date,
  apply dashboard filters.

## Deployment & Distribution

- **Local development installs**: requires a Mac with Xcode. Run directly on
  a personal iPhone via USB/Wi-Fi using a free Apple ID (personal team).
  Free-tier builds expire after 7 days and need reinstalling — normal during
  active development.
- **App Store release**: requires enrolling in the Apple Developer Program
  ($99/year), then submitting via App Store Connect (icon, screenshots,
  description, privacy policy URL, review). Because all data stays
  on-device with no accounts and nothing transmitted off the phone, the App
  Store privacy questionnaire and review are about as simple as they get for
  a health-adjacent app.
