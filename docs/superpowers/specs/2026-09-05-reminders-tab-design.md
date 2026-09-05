# Reminders Tab (Webapp)

## Purpose

Add a Reminders tab to the webapp so the user can track appointments
and tasks (e.g. "monthly appointment with midwife", "medical test
appointment", "book a test") and be nudged about them, plus be nudged
if they haven't logged any event in a while.

## Scope

- **Webapp only** — no changes to the native Expo app (`app/`, `src/`).
- **New "Reminders" tab**: list of reminders, add/edit/delete, each
  with a title, a date, and an optional recurrence (repeat every N
  days).
- **Two global settings** (in the existing Settings page): a lead-time
  ("remind me N days before", default 3) applied to every reminder,
  and an inactivity threshold ("nudge me if I haven't logged anything
  in N days", off by default).
- **A global banner** shown on every page when something is due:
  upcoming/overdue reminders, and the inactivity nudge if applicable.
  Each reminder in the banner has a dismiss (✕, snooze until tomorrow)
  and a complete (✔️) action; the inactivity nudge only gets ✕.

## Non-goals

- **No true push notifications.** This is a static site on GitHub
  Pages with no backend — there is nothing that can wake the browser
  and deliver a notification while the app/tab is fully closed. What's
  built here is an **in-app banner shown when the app is opened**
  (computed from current data on render), not a background-delivered
  OS notification. This was an explicit tradeoff decision, not an
  oversight — see the brainstorming discussion this spec came out of.
- No completion history/audit log — completing or dismissing a
  reminder just mutates its state going forward; there's no record of
  past completions.
- No recurring-reminder calendar-month awareness (e.g. "same day next
  month") — recurrence is a plain "every N days" interval, which
  sidesteps calendar edge cases (Jan 31 -> Feb 31 doesn't exist) at
  the cost of not being calendar-month-exact. A user wanting "monthly"
  picks an interval like 30 (or 28) days.
- No changes to existing data (`ActionType`, `ActionEvent`) or their
  storage/export/import formats.

## Data model

New in `webapp/src/models/types.ts`:

```ts
export interface Reminder {
  id: string;
  title: string;
  date: string; // ISO date — the next (or only) occurrence
  recurrenceDays: number | null; // null = one-off; N = repeats every N days
  dismissedUntil: string | null; // ISO date; hidden from the banner until this passes
  notes?: string;
}
```

`Settings` gets two new **optional** fields (additive — see Storage
impact below):

```ts
export interface Settings {
  dueDate: string;
  reminderLeadTimeDays?: number;    // default 3 when absent
  inactivityThresholdDays?: number; // undefined/absent = feature off
}
```

Inactivity-nudge dismissal is not part of `Settings` (it's UI
dismissal state, not a setting) — stored as its own small localStorage
value, `pregnancy-tracker:inactivity-dismissed-until` (an ISO date
string).

## Storage impact (existing data)

- **New key**: `pregnancy-tracker:reminders` (a `Reminder[]`, same
  read/write pattern as `pregnancy-tracker:action-types` /
  `pregnancy-tracker:events`). Purely additive — no existing key is
  touched.
- **New key**: `pregnancy-tracker:inactivity-dismissed-until`. Purely
  additive.
- **Existing key `pregnancy-tracker:settings` gains two optional
  fields.** This is the one change that touches already-stored data's
  *shape*. It is backward compatible by construction: existing stored
  `Settings` objects simply won't have `reminderLeadTimeDays` /
  `inactivityThresholdDays`, and all reads must treat them as
  optional (`settings.reminderLeadTimeDays ?? 3`,
  `settings.inactivityThresholdDays` left `undefined` meaning "off").
  No migration, no rewrite of existing stored settings is needed or
  performed. This was explicitly flagged to and confirmed by the user
  during design, per this repo's local-storage-safety rule
  (`AGENTS.md`).

## Business logic

New `webapp/src/utils/reminders.ts` (pure functions, no React,
mirroring the existing `historyFilter.ts` / `dateBuckets.ts` style):

```ts
function isReminderDue(reminder: Reminder, today: Date, leadTimeDays: number): boolean {
  const dueThreshold = new Date(reminder.date).getTime() - leadTimeDays * MS_PER_DAY;
  if (today.getTime() < dueThreshold) return false;
  if (reminder.dismissedUntil && today < new Date(reminder.dismissedUntil)) return false;
  return true;
}

function dismissReminder(reminder: Reminder, today: Date): Reminder {
  // snooze until tomorrow — same behavior for one-off and recurring
  return { ...reminder, dismissedUntil: addDays(today, 1) };
}

function completeReminder(reminder: Reminder, today: Date): Reminder | null {
  if (reminder.recurrenceDays === null) return null; // caller deletes it
  return {
    ...reminder,
    date: addDays(new Date(reminder.date), reminder.recurrenceDays),
    dismissedUntil: null,
  };
}
```

Inactivity check (not a `Reminder`, computed directly from
`EventsContext` + `SettingsContext` + the dismissal localStorage
value):

```
daysSinceLastEvent = today - max(events.map(e => e.startDate))
isInactivityDue = settings.inactivityThresholdDays is set
  AND daysSinceLastEvent >= settings.inactivityThresholdDays
  AND (no dismissedUntil stored, or today >= that date)
```

If there are no events at all yet, the inactivity nudge does not fire
(nothing to measure "since" — avoids nagging a brand-new user before
they've logged anything).

## Components / files

- `webapp/src/context/RemindersContext.tsx` — `RemindersProvider` +
  `useReminders()`, same Context+localStorage shape as
  `ActionTypesContext.tsx` (list, `addReminder`, `updateReminder`,
  `deleteReminder`, `replaceAll`).
- `webapp/src/utils/reminders.ts` — logic above.
- `webapp/src/pages/RemindersPage.tsx` — new tab page. List of
  reminders (soonest-due first — sorted by `date`), each row shows
  title/date/recurrence with Edit/Delete (same list+form pattern as
  `ActionsPage.tsx`). Form fields: title, date, recurrence (blank =
  one-off, or a number of days).
- `webapp/src/components/ReminderBanner.tsx` — mounted in `App.tsx`
  above `<Routes>` (visible on every tab). Recomputed on render from
  `reminders` + `events` + `settings` (no polling/timers — the
  in-app-on-open model means "on render" is the check point). Renders
  nothing when nothing is due. Each due reminder row: title, ✕
  (dismiss/snooze) and ✔️ (complete) buttons. Inactivity row (if due):
  message + ✕ only. Links through to the Reminders tab.
- `webapp/src/pages/SettingsPage.tsx` — two new number inputs: lead
  time (pre-filled `3` when unset) and inactivity threshold (blank =
  off).
- `webapp/src/components/NavBar.tsx` — new "Reminders" entry (bell
  icon, matching the existing inline-SVG icon convention) routed at
  `/reminders`.
- `webapp/src/App.tsx` — new `RemindersProvider` in the provider tree
  (same nesting level as `EventsProvider`), new `/reminders` route,
  `<ReminderBanner />` mounted above `<Routes>`.

## Error handling

Matches existing patterns in this codebase: malformed/missing
`localStorage` data for the new keys is treated as empty state (no
reminders / no inactivity dismissal), not an error, same as the
existing contexts. Reminder form validation (non-empty title, valid
date, positive integer recurrence if set) follows the same
`try/catch` + inline `error` text pattern used in `ActionsPage.tsx`
and `SettingsPage.tsx`.

## Testing

No test infrastructure currently exists in `webapp/` (confirmed during
earlier work — no vitest/jest config, no test files). Verification for
this feature will be manual build + code-level reasoning (as has been
done for prior webapp changes in this repo), unless the user asks to
set up a test runner as a prerequisite.
