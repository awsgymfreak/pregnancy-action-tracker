# Standalone Web App (Pregnancy Tracker)

## Purpose

Recreate the existing Expo pregnancy tracker's features as a standalone
browser web app, living in its own folder (`webapp/`) at the repo root,
independent of the Expo/React Native project. No code sharing with the
existing app; the two projects happen to live in the same git repo.

## Scope

Recreate these screens/features, matching the existing app's behavior:

- **Dashboard** — stacked bar chart of events by action type, bucketed
  by day (hourly)/month (daily)/pregnancy (weekly), with an action-type
  filter and a "Week N" header derived from the due date.
- **History** — filterable (day/week/all, by action type) list of
  logged events, most recent first, with a way to log a new event
  (action type, start time, end time if the action type has a duration).
- **Actions** — CRUD for custom action types (name, has-duration flag).
- **Settings** — due date picker; export all data (action types,
  events, settings) as a downloadable JSON file; import a JSON file to
  replace all data (with a confirmation prompt).

## Non-goals

- No sharing of code, data, or runtime between this web app and the
  Expo app. Export/import files are JSON-compatible between the two,
  but that's incidental (same shape), not a live sync.
- No backend/server component — everything is client-side, persisted
  in `localStorage`.
- No automated tests for this initial build (explicitly deferred by
  request).

## Architecture

- **Location**: `webapp/` folder at repo root. Own `package.json`,
  `node_modules`, `tsconfig.json` — fully independent Node project.
- **Stack**: Vite + React + TypeScript.
- **Routing**: React Router, with routes mirroring the Expo app's tabs:
  `/` (Dashboard), `/history`, `/actions`, `/settings`, `/log-event`.
- **State**: React Context providers (`ActionTypesContext`,
  `EventsContext`, `SettingsContext`) mirroring the Expo app's
  provider shape (`actionTypes`/`events`/`settings` + mutator
  functions), backed by `localStorage` instead of
  `expo-file-system` JSON files.
- **Data model**: same shape as `src/models/types.ts` in the Expo app —
  `ActionType`, `ActionEvent`, `Settings`, `ExportPayload` — duplicated
  into `webapp/src/models/types.ts` since there's no shared package.
- **Business logic**: port these pure-TS modules from the Expo app
  nearly unchanged (no React Native dependency in the originals):
  `dateBuckets.ts`, `pregnancyWeek.ts`, `historyFilter.ts`, `colors.ts`,
  `validators.ts`, and the import-payload validation logic from
  `backup/importData.ts`.
- **Charting**: `recharts` for the stacked bar chart (replacing
  `react-native-gifted-charts`).
- **Export**: build the same JSON payload shape, trigger a browser
  download via an `<a download>` blob URL.
- **Import**: `<input type="file">` + `FileReader`, validate payload
  shape, then replace all three contexts' state (with a confirm
  dialog, matching the Expo app's "replace all data" warning).

## Error handling

- Import validation failures surface an inline error message (no
  crash), matching the Expo Settings screen's `try/catch` +
  `setError` pattern.
- Malformed/missing `localStorage` data is treated as empty state
  (first run), not an error.

## Testing

Explicitly skipped for this initial build per request. Can be added
later by porting the existing `*.test.ts` suites for the ported
business-logic modules.
