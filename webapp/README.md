# Pregnancy Tracker (Web)

A browser app with Dashboard, History, Actions, and Settings screens, built with Vite + React + TypeScript. Data is stored locally in the browser via `localStorage`.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Data import/export formats

Settings has two separate import paths — don't confuse them.

### Backup (JSON) — full restore

**Export Data** downloads a `pregnancy-tracker-backup.json` file shaped like:

```json
{
  "actionTypes": [{ "id": "...", "name": "Baby movement", "isDefault": true }],
  "events": [{ "id": "...", "actionTypeId": "...", "startDate": "2026-08-29T06:53:00.000Z", "endDate": null }],
  "settings": { "dueDate": "2026-12-25T00:00:00.000Z" }
}
```

Whether an event has an end time is a per-event choice (set when logging it, or via a start–end
range when importing), not a property of the action type — any action can be logged as a one-off
or with an end time.

**Import Data** picks a file in this exact shape and, after a confirmation prompt, **replaces all
current data** (action types, events, and the due date) — it's a restore, not a merge.

### Import notes — additive, appends events

For pasting cleaned-up notes (e.g. copied out of a phone notes app) as new events, without
touching existing data. Paste text in this strict format, one entry per line:

```
2026-08-29
06:53 Baby movement
07:00 Baby movement
14:20-14:35 Contraction

2026-08-30
06:46 Baby movement
```

Rules:
- A date line (`YYYY-MM-DD`) starts a new day; every entry below it uses that date until the
  next date line.
- Each entry is `HH:MM Action name` (24-hour time — no AM/PM ambiguity).
- To log an end time too, use a start–end range on one line instead:
  `HH:MM-HH:MM Action name`. Any action can optionally have an end time; it's not tied to the
  action type.
- `Action name` must match an existing action type's name exactly (case-insensitive). If it
  doesn't exist yet, the preview offers a "Create" button right there — no need to leave the
  page and go to the Actions tab first.
- Blank lines are ignored.

This format is intentionally strict rather than a fuzzy free-text parser: real notes-app data is
too inconsistent (missing AM/PM, typos, mixed separators) to guess at reliably for health data.
Clean the text into this shape before pasting. The Settings page shows a parsed preview — grouped
by day, with any format errors listed by line number, and any unrecognized action names offered
as one-click "Create" buttons (or "Create all N" if there are several) — before anything is
saved, so you can fix formatting issues and create missing actions without losing your place.
