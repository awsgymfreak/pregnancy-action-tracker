# Pregnancy Tracker

A browser app for tracking a pregnancy day-to-day: log timed events (movements, contractions, custom actions you define), see them on a dashboard chart and a filterable history, and set reminders for appointments and tasks. Built with Vite + React + TypeScript, deployed to GitHub Pages. All data is stored locally in the browser via `localStorage` — there is no backend and nothing is sent over the network.

The app lives entirely in `webapp/`.

## Tabs

- **Dashboard** — a stacked bar chart of logged events over a selectable range (today by hour, last 7 days, last 2 weeks, this month by day, or the whole pregnancy by week), filterable by action type, plus a "Week N, Day D" header derived from your due date.
- **History** — a day-grouped, collapsible list of every logged event (today's day expands by default), filterable by range and action type, with a floating button to log a new event.
- **Actions** — manage the custom action types you log events against (e.g. "Baby movement", "Contraction", or anything you add). An action type with logged events against it can't be renamed or deleted — only unused ones can.
- **Reminders** — one-off or recurring (every week / every month / a custom number of days) reminders for appointments and tasks. A banner shown on every tab surfaces anything due, with options to dismiss it for the day or mark it complete.
- **Settings** — your due date; a lead-time setting for how many days ahead reminders should show; an inactivity nudge that reminds you if you haven't logged anything in a while; export/import (see below); and the app's version number.

## Reminders and the due-nudge banner

Reminders are **not** real push notifications — this is a static site with no backend, so there is nothing that can deliver a notification while the app is closed. Instead, the banner is computed fresh every time you open the app: it checks which reminders are due (based on your lead-time setting) and whether you've gone too long without logging anything (based on your inactivity-nudge setting), and shows them right there. Dismissing a due item snoozes it until tomorrow; completing a one-off reminder removes it, and completing a recurring one advances it to its next occurrence.

## Development

```bash
cd webapp
npm install
npm run dev
```

## Build

```bash
cd webapp
npm run build
```

There is no automated test suite in this project — verification is `npm run build` (TypeScript) and `npm run lint` (oxlint).

## Deployment

The webapp deploys to GitHub Pages via `.github/workflows/deploy-webapp.yml`, triggered by pushing a `v*.*.*` tag (not on every push to `main`). The same workflow can be manually re-run against an older tag to roll back. Every commit that fixes an issue or ships a feature gets its own release tag.

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
or with an end time. Reminders are not included in this backup.

**Import Data** picks a file in this exact shape and, after a confirmation prompt, **replaces all
current data** (action types, events, and the due date) — it's a restore, not a merge.

### Notes — additive, appends events

For pasting cleaned-up notes (e.g. copied out of a phone notes app) as new events, without
touching existing data, or for importing a `.txt` file in the same format (via **Export as Notes** /
**Import from file**). Text in this strict format, one entry per line:

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
Clean the text into this shape before pasting or exporting. The Settings page shows a parsed preview — grouped
by day, with any format errors listed by line number, and any unrecognized action names offered
as one-click "Create" buttons (or "Create all N" if there are several) — before anything is
saved, so you can fix formatting issues and create missing actions without losing your place.
