# Reminders Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Reminders tab to the webapp — appointments/tasks with optional every-N-days recurrence, plus a global inactivity nudge — surfaced via an in-app banner (not real push notifications, which aren't feasible on this backend-less static site).

**Architecture:** Follows this codebase's existing Context+localStorage pattern exactly (mirrors `ActionTypesContext`/`EventsContext`): a new `RemindersContext` for CRUD, a pure-function `utils/reminders.ts` module for due/dismiss/complete/inactivity logic (no React), a `RemindersPage` list+form page (mirrors `ActionsPage`), and a `ReminderBanner` component mounted once in `App.tsx` so it's visible on every route without remounting on navigation.

**Tech Stack:** React + TypeScript + Vite, React Router (HashRouter), plain `localStorage` (no new dependencies).

**Spec:** `docs/superpowers/specs/2026-09-05-reminders-tab-design.md`

## Global Constraints

- **Webapp only** (`webapp/`) — no changes to the native app (already removed from this repo entirely).
- **No push notifications** — the banner is computed on render from current data; there is no background delivery, no Notification permission prompt, no service worker changes.
- **Dates are plain `YYYY-MM-DD` calendar-date strings, never full ISO datetimes with a `Z` suffix.** `new Date("2026-09-10")` (a date-only ISO string) is parsed as **UTC midnight** by JavaScript, and computing a local calendar day from that instant can land on the wrong day for non-UTC timezones — this exact bug was already hit and fixed twice in this repo (dashboard bucketing and pregnancy week/day, both UTC-vs-local mistakes). `Reminder.date`, `Reminder.dismissedUntil`, and the inactivity-dismissal value are all `YYYY-MM-DD` strings, parsed only via the `parseLocalDate` helper defined in Task 2 (never via a bare `new Date(dateOnlyString)`).
- **Settings storage change is additive and must stay backward-compatible**: `reminderLeadTimeDays`/`inactivityThresholdDays` are optional fields on the existing `Settings` object (localStorage key `pregnancy-tracker:settings`). Existing stored settings without these fields must keep working — always read them with a fallback (`settings.reminderLeadTimeDays ?? 3`), never assume they're present. This was confirmed with the user during design per this repo's local-storage-safety rule (`AGENTS.md`).
- **No test runner exists in `webapp/`** (no vitest/jest, confirmed in the spec). Verification is: (a) a throwaway Node `.mjs` script (not committed) mirroring pure-logic code to sanity-check it before writing the real `.ts` file, for logic-heavy tasks, and (b) `npm run build` + `npm run lint` for every task, which this project treats as its correctness gate for UI/wiring code.
- **`webapp/src/index.css` is one flat stylesheet** organized by `/* ---------- Section ---------- */` comments — add new rules under a new comment header near the bottom, following that convention; don't introduce a CSS-in-JS or per-component stylesheet approach.

---

### Task 1: Data model additions

**Files:**
- Modify: `webapp/src/models/types.ts`

**Interfaces:**
- Produces: `Reminder` interface (`id`, `title`, `date`, `recurrenceDays`, `dismissedUntil`), and `Settings.reminderLeadTimeDays?: number` / `Settings.inactivityThresholdDays?: number`, consumed by every later task.

- [ ] **Step 1: Add the `Reminder` interface and extend `Settings`**

Open `webapp/src/models/types.ts`. It currently contains:

```ts
export interface ActionType {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface ActionEvent {
  id: string;
  actionTypeId: string;
  startDate: string; // ISO 8601
  endDate: string | null; // ISO 8601 — whether this event has an end time is decided per-event at logging time, not by the action type
}

export interface Settings {
  dueDate: string; // ISO 8601
}

export interface ExportPayload {
  actionTypes: ActionType[];
  events: ActionEvent[];
  settings: Settings;
}
```

Replace the `Settings` interface and add `Reminder` right after it, so the file reads:

```ts
export interface ActionType {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface ActionEvent {
  id: string;
  actionTypeId: string;
  startDate: string; // ISO 8601
  endDate: string | null; // ISO 8601 — whether this event has an end time is decided per-event at logging time, not by the action type
}

export interface Settings {
  dueDate: string; // ISO 8601
  reminderLeadTimeDays?: number; // default 3 when absent — see utils/reminders.ts
  inactivityThresholdDays?: number; // absent = inactivity nudge is off
}

export interface Reminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD, local calendar date — never a full ISO datetime, see Global Constraints
  recurrenceDays: number | null; // null = one-off; N = repeats every N days
  dismissedUntil: string | null; // YYYY-MM-DD; hidden from the banner until this date passes
  notes?: string; // in the data model per spec; not yet exposed in RemindersPage's UI in this plan
}

export interface ExportPayload {
  actionTypes: ActionType[];
  events: ActionEvent[];
  settings: Settings;
}
```

(Note: reminders are intentionally **not** part of `ExportPayload` — out of scope per the spec's Non-goals.)

- [ ] **Step 2: Verify it compiles**

Run: `cd webapp && npm run build`
Expected: builds successfully, no TypeScript errors (nothing references the new types yet, so this only checks the syntax is valid).

- [ ] **Step 3: Commit**

```bash
git add webapp/src/models/types.ts
git commit -m "Add Reminder type and reminder settings fields"
```

---

### Task 2: Reminder business logic (`utils/reminders.ts`)

**Files:**
- Create: `webapp/src/utils/reminders.ts`

**Interfaces:**
- Consumes: `Reminder` (Task 1).
- Produces: `parseLocalDate(dateOnly: string): Date`, `formatLocalDate(date: Date): string`, `addDaysToDateOnly(dateOnly: string, days: number): string`, `isReminderDue(reminder: Reminder, today: Date, leadTimeDays: number): boolean`, `dismissReminder(reminder: Reminder, today: Date): Reminder`, `completeReminder(reminder: Reminder, today: Date): Reminder | null`, `sortRemindersByDate(reminders: Reminder[]): Reminder[]`, `getDaysSinceLastEvent(lastEventIso: string | null, today: Date): number | null`, `isInactivityDue(daysSinceLastEvent: number | null, thresholdDays: number | undefined, dismissedUntilDateOnly: string | null, today: Date): boolean` — all consumed by Tasks 3, 5, 6.

- [ ] **Step 1: Write a throwaway verification script and confirm the logic by hand first**

This project has no test runner, so verify pure logic with a plain Node script before writing the real TypeScript file (same approach used for every date-math fix already made in this repo). Create `webapp/verify-reminders.mjs` (temporary — deleted in Step 4, never committed):

```js
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseLocalDate(dateOnly) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function addDaysToDateOnly(dateOnly, days) {
  const d = parseLocalDate(dateOnly);
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}
function isReminderDue(reminder, today, leadTimeDays) {
  const dueDay = parseLocalDate(reminder.date);
  const dueThreshold = new Date(dueDay.getTime() - leadTimeDays * MS_PER_DAY);
  const todayStart = startOfDay(today);
  if (todayStart < dueThreshold) return false;
  if (reminder.dismissedUntil && todayStart < parseLocalDate(reminder.dismissedUntil)) return false;
  return true;
}
function dismissReminder(reminder, today) {
  return { ...reminder, dismissedUntil: addDaysToDateOnly(formatLocalDate(today), 1) };
}
function completeReminder(reminder, today) {
  if (reminder.recurrenceDays === null) return null;
  return { ...reminder, date: addDaysToDateOnly(reminder.date, reminder.recurrenceDays), dismissedUntil: null };
}
function getDaysSinceLastEvent(lastEventIso, today) {
  if (lastEventIso === null) return null;
  const last = startOfDay(new Date(lastEventIso));
  const todayStart = startOfDay(today);
  return Math.floor((todayStart.getTime() - last.getTime()) / MS_PER_DAY);
}
function isInactivityDue(daysSinceLastEvent, thresholdDays, dismissedUntilDateOnly, today) {
  if (thresholdDays === undefined || daysSinceLastEvent === null) return false;
  if (daysSinceLastEvent < thresholdDays) return false;
  if (dismissedUntilDateOnly && startOfDay(today) < parseLocalDate(dismissedUntilDateOnly)) return false;
  return true;
}

// --- checks ---
const today = new Date(2026, 8, 10); // Sep 10, 2026 (local)

// 1. Lead time: reminder on Sep 13, lead time 3 -> due from Sep 10 onward
const r1 = { id: '1', title: 'Test', date: '2026-09-13', recurrenceDays: null, dismissedUntil: null };
console.log('due at exactly lead-time boundary (expect true):', isReminderDue(r1, today, 3));
console.log('due one day before boundary (expect false):', isReminderDue(r1, new Date(2026, 8, 9), 3));

// 2. Dismiss snoozes until tomorrow regardless of recurrence
const dismissed = dismissReminder(r1, today);
console.log('dismissedUntil is tomorrow (expect 2026-09-11):', dismissed.dismissedUntil);
console.log('still due today after dismiss (expect false):', isReminderDue(dismissed, today, 3));
console.log('due again tomorrow (expect true):', isReminderDue(dismissed, new Date(2026, 8, 11), 3));

// 3. Complete: one-off returns null (caller deletes), recurring advances by recurrenceDays
console.log('complete one-off (expect null):', completeReminder(r1, today));
const recurring = { id: '2', title: 'Midwife', date: '2026-09-10', recurrenceDays: 30, dismissedUntil: null };
const completed = completeReminder(recurring, today);
console.log('recurring next date (expect 2026-10-10):', completed.date, 'dismissedUntil (expect null):', completed.dismissedUntil);

// 4. Inactivity: threshold 3 days, last event 4 days ago -> due
console.log('inactivity due at 4 days, threshold 3 (expect true):', isInactivityDue(4, 3, null, today));
console.log('inactivity not due at 2 days, threshold 3 (expect false):', isInactivityDue(2, 3, null, today));
console.log('inactivity off when threshold undefined (expect false):', isInactivityDue(10, undefined, null, today));
console.log('getDaysSinceLastEvent for an event 4 days ago (expect 4):', getDaysSinceLastEvent(new Date(2026, 8, 6, 15, 30).toISOString(), today));
```

- [ ] **Step 2: Run it and confirm every line matches its "(expect ...)" comment**

Run: `cd webapp && node verify-reminders.mjs`
Expected output (each line's actual value must match its expected value):
```
due at exactly lead-time boundary (expect true): true
due one day before boundary (expect false): false
dismissedUntil is tomorrow (expect 2026-09-11): 2026-09-11
still due today after dismiss (expect false): false
due again tomorrow (expect true): true
complete one-off (expect null): null
recurring next date (expect 2026-10-10): 2026-10-10 dismissedUntil (expect null): null
inactivity due at 4 days, threshold 3 (expect true): true
inactivity not due at 2 days, threshold 3 (expect false): false
inactivity off when threshold undefined (expect false): false
getDaysSinceLastEvent for an event 4 days ago (expect 4): 4
```
If anything doesn't match, fix the function definitions in the script and re-run before moving on — don't carry a wrong formula into the real file.

- [ ] **Step 3: Write the real `webapp/src/utils/reminders.ts`**, using the now-verified logic, with proper types and exports:

```ts
import type { Reminder } from '../models/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseLocalDate(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const d = parseLocalDate(dateOnly);
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export function isReminderDue(reminder: Reminder, today: Date, leadTimeDays: number): boolean {
  const dueDay = parseLocalDate(reminder.date);
  const dueThreshold = new Date(dueDay.getTime() - leadTimeDays * MS_PER_DAY);
  const todayStart = startOfDay(today);
  if (todayStart < dueThreshold) {
    return false;
  }
  if (reminder.dismissedUntil && todayStart < parseLocalDate(reminder.dismissedUntil)) {
    return false;
  }
  return true;
}

export function dismissReminder(reminder: Reminder, today: Date): Reminder {
  return { ...reminder, dismissedUntil: addDaysToDateOnly(formatLocalDate(today), 1) };
}

export function completeReminder(reminder: Reminder, today: Date): Reminder | null {
  if (reminder.recurrenceDays === null) {
    return null;
  }
  return {
    ...reminder,
    date: addDaysToDateOnly(reminder.date, reminder.recurrenceDays),
    dismissedUntil: null,
  };
}

export function sortRemindersByDate(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  );
}

export function getDaysSinceLastEvent(lastEventIso: string | null, today: Date): number | null {
  if (lastEventIso === null) {
    return null;
  }
  const last = startOfDay(new Date(lastEventIso));
  const todayStart = startOfDay(today);
  return Math.floor((todayStart.getTime() - last.getTime()) / MS_PER_DAY);
}

export function isInactivityDue(
  daysSinceLastEvent: number | null,
  thresholdDays: number | undefined,
  dismissedUntilDateOnly: string | null,
  today: Date
): boolean {
  if (thresholdDays === undefined || daysSinceLastEvent === null) {
    return false;
  }
  if (daysSinceLastEvent < thresholdDays) {
    return false;
  }
  if (dismissedUntilDateOnly && startOfDay(today) < parseLocalDate(dismissedUntilDateOnly)) {
    return false;
  }
  return true;
}
```

- [ ] **Step 4: Delete the throwaway script and verify the build**

```bash
cd webapp && rm verify-reminders.mjs && npm run build && npm run lint
```
Expected: build succeeds, lint shows only the 4 pre-existing `only-export-components` warnings (from the existing Context files) and nothing new.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/utils/reminders.ts
git commit -m "Add reminder due/dismiss/complete/inactivity logic"
```

---

### Task 3: `RemindersContext` (CRUD + storage)

**Files:**
- Create: `webapp/src/context/RemindersContext.tsx`

**Interfaces:**
- Consumes: `Reminder` (Task 1), `readJson`/`writeJson` from `webapp/src/storage/localStorage.ts` (existing).
- Produces: `RemindersProvider` component and `useReminders()` hook returning `{ reminders: Reminder[], addReminder(input: { title: string; date: string; recurrenceDays: number | null }): Promise<Reminder>, updateReminder(id: string, updates: Partial<Omit<Reminder, 'id'>>): Promise<void>, deleteReminder(id: string): Promise<void> }` — consumed by Tasks 5, 6, 7.

- [ ] **Step 1: Create `webapp/src/context/RemindersContext.tsx`**

This mirrors `webapp/src/context/ActionTypesContext.tsx`'s exact shape (read that file first if anything below is unclear — same `persist()` optimistic-update-with-rollback pattern, same localStorage read/write helpers).

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Reminder } from '../models/types';
import { readJson, writeJson } from '../storage/localStorage';

const STORAGE_KEY = 'pregnancy-tracker:reminders';

interface ReminderInput {
  title: string;
  date: string;
  recurrenceDays: number | null;
}

interface RemindersContextValue {
  reminders: Reminder[];
  addReminder: (input: ReminderInput) => Promise<Reminder>;
  updateReminder: (id: string, updates: Partial<Omit<Reminder, 'id'>>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
}

const RemindersContext = createContext<RemindersContextValue | undefined>(undefined);

function loadInitial(): Reminder[] {
  return readJson<Reminder[]>(STORAGE_KEY) ?? [];
}

function validateReminder(input: { title: string; date: string; recurrenceDays: number | null }) {
  const title = input.title.trim();
  if (title.length === 0) {
    throw new Error('Title is required.');
  }
  if (!input.date || Number.isNaN(Date.parse(input.date))) {
    throw new Error('A valid date is required.');
  }
  if (
    input.recurrenceDays !== null &&
    (!Number.isInteger(input.recurrenceDays) || input.recurrenceDays <= 0)
  ) {
    throw new Error('Recurrence must be a positive whole number of days.');
  }
  return { title, date: input.date, recurrenceDays: input.recurrenceDays };
}

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>(loadInitial);

  async function persist(next: Reminder[]) {
    const previous = reminders;
    setReminders(next);
    try {
      writeJson(STORAGE_KEY, next);
    } catch {
      setReminders(previous);
      throw new Error("Couldn't save — try again.");
    }
  }

  async function addReminder(input: ReminderInput) {
    const validated = validateReminder(input);
    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      title: validated.title,
      date: validated.date,
      recurrenceDays: validated.recurrenceDays,
      dismissedUntil: null,
    };
    await persist([...reminders, newReminder]);
    return newReminder;
  }

  async function updateReminder(id: string, updates: Partial<Omit<Reminder, 'id'>>) {
    const existing = reminders.find((r) => r.id === id);
    if (!existing) {
      throw new Error('Reminder not found.');
    }
    const merged = { ...existing, ...updates };
    if (updates.title !== undefined || updates.date !== undefined || updates.recurrenceDays !== undefined) {
      validateReminder(merged);
    }
    const next = reminders.map((r) => (r.id === id ? merged : r));
    await persist(next);
  }

  async function deleteReminder(id: string) {
    await persist(reminders.filter((r) => r.id !== id));
  }

  return (
    <RemindersContext.Provider value={{ reminders, addReminder, updateReminder, deleteReminder }}>
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  const ctx = useContext(RemindersContext);
  if (!ctx) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return ctx;
}
```

(No `replaceAll` here, unlike the other contexts — reminders aren't part of the JSON backup import/export in this iteration, per the spec's Non-goals, so there'd be nothing to call it. Don't add it speculatively.)

- [ ] **Step 2: Verify it compiles**

Run: `cd webapp && npm run build && npm run lint`
Expected: build succeeds; lint shows the same 4 pre-existing warnings plus one new `only-export-components` warning for this file (same pattern as `HistoryFilterContext.tsx`/`SettingsContext.tsx`/etc. — expected, not a regression).

- [ ] **Step 3: Commit**

```bash
git add webapp/src/context/RemindersContext.tsx
git commit -m "Add RemindersContext (CRUD, localStorage-backed)"
```

---

### Task 4: Settings support for reminder config

**Files:**
- Modify: `webapp/src/context/SettingsContext.tsx`
- Modify: `webapp/src/pages/SettingsPage.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `useSettings().updateReminderSettings(updates: { reminderLeadTimeDays?: number; inactivityThresholdDays?: number }): Promise<void>`, consumed by Task 6 indirectly (via `settings.reminderLeadTimeDays`/`settings.inactivityThresholdDays`, already on the `Settings` type from Task 1).

- [ ] **Step 1: Fix a real bug in `updateDueDate` before adding new settings fields**

`webapp/src/context/SettingsContext.tsx` currently has:

```ts
  async function updateDueDate(dueDate: string) {
    validateDueDate(dueDate);
    await persist({ dueDate });
  }
```

This **replaces the entire settings object with only `{ dueDate }`**. Once `reminderLeadTimeDays`/`inactivityThresholdDays` exist, changing the due date later would silently wipe them out — a real data-loss bug this feature would introduce if left as-is. Fix it to merge:

```ts
  async function updateDueDate(dueDate: string) {
    validateDueDate(dueDate);
    await persist({ ...settings, dueDate });
  }
```

(`{ ...settings, dueDate }` is safe even when `settings` is `null` on first run — spreading `null` into an object literal produces `{}`, no error.)

- [ ] **Step 2: Add `updateReminderSettings` and update the interface**

In the same file, change:

```ts
interface SettingsContextValue {
  settings: Settings | null;
  updateDueDate: (dueDate: string) => Promise<void>;
  replaceAll: (settings: Settings) => Promise<void>;
}
```

to:

```ts
interface SettingsContextValue {
  settings: Settings | null;
  updateDueDate: (dueDate: string) => Promise<void>;
  updateReminderSettings: (updates: {
    reminderLeadTimeDays?: number;
    inactivityThresholdDays?: number;
  }) => Promise<void>;
  replaceAll: (settings: Settings) => Promise<void>;
}
```

Add the function (place it after `updateDueDate`):

```ts
  async function updateReminderSettings(updates: {
    reminderLeadTimeDays?: number;
    inactivityThresholdDays?: number;
  }) {
    if (!settings) {
      throw new Error('Set a due date first.');
    }
    await persist({ ...settings, ...updates });
  }
```

And add it to the provider's context value:

```tsx
  return (
    <SettingsContext.Provider value={{ settings, updateDueDate, updateReminderSettings, replaceAll }}>
      {children}
    </SettingsContext.Provider>
  );
```

- [ ] **Step 3: Add the two settings inputs to `SettingsPage.tsx`**

In `webapp/src/pages/SettingsPage.tsx`, change the destructuring line:

```ts
  const { settings, updateDueDate, replaceAll: replaceSettings } = useSettings();
```

to:

```ts
  const { settings, updateDueDate, updateReminderSettings, replaceAll: replaceSettings } = useSettings();
```

Then, right after the existing due-date `<input>` block and before `{error && <p className="error-text">{error}</p>}`, add:

```tsx
        <p className="field-label">Remind me N days before a reminder is due</p>
        <input
          className="text-input"
          type="number"
          min="0"
          disabled={!settings}
          value={settings?.reminderLeadTimeDays ?? 3}
          onChange={async (e) => {
            const value = Number(e.target.value);
            if (Number.isNaN(value) || value < 0) {
              return;
            }
            try {
              await updateReminderSettings({ reminderLeadTimeDays: value });
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not save.');
            }
          }}
        />

        <p className="field-label">Nudge me if I haven't logged anything in N days</p>
        <input
          className="text-input"
          type="number"
          min="1"
          placeholder="Off"
          disabled={!settings}
          value={settings?.inactivityThresholdDays ?? ''}
          onChange={async (e) => {
            const raw = e.target.value;
            try {
              if (raw.trim() === '') {
                await updateReminderSettings({ inactivityThresholdDays: undefined });
                return;
              }
              const value = Number(raw);
              if (Number.isNaN(value) || value < 1) {
                return;
              }
              await updateReminderSettings({ inactivityThresholdDays: value });
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not save.');
            }
          }}
        />
```

- [ ] **Step 4: Verify**

Run: `cd webapp && npm run build && npm run lint`
Expected: build succeeds, lint output unchanged from Task 3 (no new warnings — `SettingsPage.tsx` isn't a context file, so it doesn't get the `only-export-components` warning).

- [ ] **Step 5: Commit**

```bash
git add webapp/src/context/SettingsContext.tsx webapp/src/pages/SettingsPage.tsx
git commit -m "Add reminder lead-time and inactivity-threshold settings"
```

---

### Task 5: `RemindersPage` (list + form)

**Files:**
- Create: `webapp/src/pages/RemindersPage.tsx`

**Interfaces:**
- Consumes: `useReminders()` (Task 3), `sortRemindersByDate` (Task 2).
- Produces: `RemindersPage` component, consumed by Task 7's route.

- [ ] **Step 1: Create `webapp/src/pages/RemindersPage.tsx`**

This mirrors `webapp/src/pages/ActionsPage.tsx`'s list+form structure and reuses its existing CSS classes (`list-row`, `row-text`, `row-text-muted`, `row-actions`, `link-button`, `form card`, `text-input`, `field-label`, `primary-button`, `cancel-link`, `error-text`) — no new CSS needed for this page.

```tsx
import { useMemo, useState, type FormEvent } from 'react';
import { useReminders } from '../context/RemindersContext';
import { sortRemindersByDate } from '../utils/reminders';
import type { Reminder } from '../models/types';

function formatReminderDate(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function RemindersPage() {
  const { reminders, addReminder, updateReminder, deleteReminder } = useReminders();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [recurrenceDays, setRecurrenceDays] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedReminders = useMemo(() => sortRemindersByDate(reminders), [reminders]);

  function startEdit(reminder: Reminder) {
    setEditingId(reminder.id);
    setTitle(reminder.title);
    setDate(reminder.date);
    setRecurrenceDays(reminder.recurrenceDays === null ? '' : String(reminder.recurrenceDays));
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDate('');
    setRecurrenceDays('');
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedRecurrence = recurrenceDays.trim();
    const parsedRecurrence = trimmedRecurrence === '' ? null : Number(trimmedRecurrence);
    try {
      const input = { title, date, recurrenceDays: parsedRecurrence };
      if (editingId) {
        await updateReminder(editingId, input);
      } else {
        await addReminder(input);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save reminder.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this reminder?')) {
      return;
    }
    try {
      await deleteReminder(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete reminder.');
    }
  }

  return (
    <div>
      <div className="card">
        {sortedReminders.length === 0 && <p className="week-header-muted">No reminders yet.</p>}
        {sortedReminders.map((reminder) => (
          <div key={reminder.id} className="list-row">
            <div className="event-body">
              <span className="row-text">{reminder.title}</span>
              <span className="row-text-muted">
                {formatReminderDate(reminder.date)}
                {reminder.recurrenceDays !== null ? ` · every ${reminder.recurrenceDays}d` : ''}
              </span>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="link-button edit-link"
                onClick={() => startEdit(reminder)}
              >
                Edit
              </button>
              <button
                type="button"
                className="link-button delete-link"
                onClick={() => handleDelete(reminder.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <form className="form card" onSubmit={handleSubmit}>
        <p className="field-label">Title</p>
        <input
          className="text-input"
          placeholder="e.g. Midwife appointment"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="field-label">Date</p>
        <input
          className="text-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <p className="field-label">Repeat every N days (optional)</p>
        <input
          className="text-input"
          type="number"
          min="1"
          placeholder="Leave blank for one-off"
          value={recurrenceDays}
          onChange={(e) => setRecurrenceDays(e.target.value)}
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="primary-button">
          {editingId ? 'Save Changes' : 'Add Reminder'}
        </button>
        {editingId && (
          <button type="button" className="cancel-link" onClick={resetForm}>
            Cancel edit
          </button>
        )}
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `cd webapp && npm run build && npm run lint`
Expected: build succeeds (note: this file isn't reachable from any route yet, so `RemindersPage` itself is unused until Task 7 — that's fine, `noUnusedLocals`/`noUnusedParameters` in `tsconfig.app.json` only flag unused *locals inside a file*, not unused exported components). No new lint warnings.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/pages/RemindersPage.tsx
git commit -m "Add RemindersPage (list + add/edit form)"
```

---

### Task 6: `ReminderBanner` (global due-reminders banner)

**Files:**
- Create: `webapp/src/components/ReminderBanner.tsx`
- Modify: `webapp/src/index.css`

**Interfaces:**
- Consumes: `useReminders()` (Task 3), `useEvents()` (existing), `useSettings()` (Task 4), `isReminderDue`/`dismissReminder`/`completeReminder`/`getDaysSinceLastEvent`/`isInactivityDue`/`formatLocalDate`/`addDaysToDateOnly` (Task 2).
- Produces: `ReminderBanner` component, consumed by Task 7 (mounted in `App.tsx`).

- [ ] **Step 1: Create `webapp/src/components/ReminderBanner.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReminders } from '../context/RemindersContext';
import { useEvents } from '../context/EventsContext';
import { useSettings } from '../context/SettingsContext';
import {
  isReminderDue,
  dismissReminder,
  completeReminder,
  getDaysSinceLastEvent,
  isInactivityDue,
  formatLocalDate,
  addDaysToDateOnly,
} from '../utils/reminders';
import type { Reminder } from '../models/types';

const INACTIVITY_DISMISS_KEY = 'pregnancy-tracker:inactivity-dismissed-until';

function readInactivityDismissedUntil(): string | null {
  return window.localStorage.getItem(INACTIVITY_DISMISS_KEY);
}

export function ReminderBanner() {
  const { reminders, updateReminder, deleteReminder } = useReminders();
  const { events } = useEvents();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [inactivityDismissedUntil, setInactivityDismissedUntil] = useState<string | null>(
    readInactivityDismissedUntil
  );

  const today = new Date();
  const leadTimeDays = settings?.reminderLeadTimeDays ?? 3;

  // Plain const, not useMemo: `today` is a fresh Date every render anyway, so
  // this recomputes each render regardless — matching the "check on open"
  // design (no stale caching of which reminders are due).
  const dueReminders = reminders.filter((r) => isReminderDue(r, today, leadTimeDays));

  const lastEventIso = useMemo(() => {
    if (events.length === 0) {
      return null;
    }
    return events.reduce((latest, evt) => (evt.startDate > latest ? evt.startDate : latest), events[0].startDate);
  }, [events]);

  const daysSinceLastEvent = getDaysSinceLastEvent(lastEventIso, today);
  const inactivityDue = isInactivityDue(
    daysSinceLastEvent,
    settings?.inactivityThresholdDays,
    inactivityDismissedUntil,
    today
  );

  function handleDismiss(reminder: Reminder) {
    updateReminder(reminder.id, dismissReminder(reminder, today));
  }

  function handleComplete(reminder: Reminder) {
    const next = completeReminder(reminder, today);
    if (next === null) {
      deleteReminder(reminder.id);
    } else {
      updateReminder(reminder.id, next);
    }
  }

  function handleDismissInactivity() {
    const tomorrow = addDaysToDateOnly(formatLocalDate(today), 1);
    window.localStorage.setItem(INACTIVITY_DISMISS_KEY, tomorrow);
    setInactivityDismissedUntil(tomorrow);
  }

  if (dueReminders.length === 0 && !inactivityDue) {
    return null;
  }

  return (
    <div className="reminder-banner">
      {dueReminders.map((reminder) => (
        <div
          key={reminder.id}
          className="reminder-banner-row"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/reminders')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/reminders');
            }
          }}
        >
          <span className="reminder-banner-text">{reminder.title}</span>
          <div className="reminder-banner-actions">
            <button
              type="button"
              className="reminder-banner-button"
              aria-label="Complete"
              onClick={(e) => {
                e.stopPropagation();
                handleComplete(reminder);
              }}
            >
              ✔️
            </button>
            <button
              type="button"
              className="reminder-banner-button"
              aria-label="Dismiss"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(reminder);
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      {inactivityDue && (
        <div className="reminder-banner-row">
          <span className="reminder-banner-text">
            No events logged in {daysSinceLastEvent} day{daysSinceLastEvent === 1 ? '' : 's'}
          </span>
          <div className="reminder-banner-actions">
            <button
              type="button"
              className="reminder-banner-button"
              aria-label="Dismiss"
              onClick={handleDismissInactivity}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add banner CSS**

In `webapp/src/index.css`, add this new section — placing it right before the existing `/* ---------- History: day groups + event cards ---------- */` header is fine:

```css
/* ---------- Reminder banner ---------- */

.reminder-banner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--color-accent-soft);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  margin-bottom: 16px;
}

.reminder-banner-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
}

.reminder-banner-text {
  font-size: 14px;
  font-weight: 600;
}

.reminder-banner-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.reminder-banner-button {
  background: none;
  border: none;
  font-size: 16px;
  line-height: 1;
  padding: 4px;
  cursor: pointer;
}
```

- [ ] **Step 3: Verify**

Run: `cd webapp && npm run build && npm run lint`
Expected: build succeeds (this file isn't mounted anywhere yet — that's Task 7). No new lint warnings.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/ReminderBanner.tsx webapp/src/index.css
git commit -m "Add ReminderBanner component"
```

---

### Task 7: Navigation and app wiring

**Files:**
- Modify: `webapp/src/components/NavBar.tsx`
- Modify: `webapp/src/App.tsx`

**Interfaces:**
- Consumes: `RemindersProvider`/`useReminders` (Task 3), `RemindersPage` (Task 5), `ReminderBanner` (Task 6).
- Produces: nothing further — this is the final integration task.

- [ ] **Step 1: Add a Reminders nav entry**

In `webapp/src/components/NavBar.tsx`, add a bell icon function (matching the existing inline-SVG convention — place it after `ActionsIcon` and before `SettingsIcon`):

```tsx
function RemindersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
```

Then add an entry to the `LINKS` array, between the Actions and Settings entries:

```ts
const LINKS: { to: string; label: string; end: boolean; icon: ReactNode }[] = [
  { to: '/', label: 'Dashboard', end: true, icon: <DashboardIcon /> },
  { to: '/history', label: 'History', end: false, icon: <HistoryIcon /> },
  { to: '/actions', label: 'Actions', end: false, icon: <ActionsIcon /> },
  { to: '/reminders', label: 'Reminders', end: false, icon: <RemindersIcon /> },
  { to: '/settings', label: 'Settings', end: false, icon: <SettingsIcon /> },
];
```

- [ ] **Step 2: Wire `RemindersProvider`, the route, and the banner into `App.tsx`**

`webapp/src/App.tsx` currently reads:

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionTypesProvider } from './context/ActionTypesContext';
import { EventsProvider } from './context/EventsContext';
import { SettingsProvider } from './context/SettingsContext';
import { HistoryFilterProvider } from './context/HistoryFilterContext';
import { NavBar } from './components/NavBar';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { ActionsPage } from './pages/ActionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LogEventPage } from './pages/LogEventPage';

export default function App() {
  return (
    <SettingsProvider>
      <ActionTypesProvider>
        <EventsProvider>
          <HistoryFilterProvider>
            <HashRouter>
              <main className="page-content">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/actions" element={<ActionsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/log-event" element={<LogEventPage />} />
                  <Route path="/log-event/:eventId" element={<LogEventPage />} />
                </Routes>
              </main>
              <NavBar />
            </HashRouter>
          </HistoryFilterProvider>
        </EventsProvider>
      </ActionTypesProvider>
    </SettingsProvider>
  );
}
```

Replace it with:

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionTypesProvider } from './context/ActionTypesContext';
import { EventsProvider } from './context/EventsContext';
import { SettingsProvider } from './context/SettingsContext';
import { HistoryFilterProvider } from './context/HistoryFilterContext';
import { RemindersProvider } from './context/RemindersContext';
import { NavBar } from './components/NavBar';
import { ReminderBanner } from './components/ReminderBanner';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { ActionsPage } from './pages/ActionsPage';
import { RemindersPage } from './pages/RemindersPage';
import { SettingsPage } from './pages/SettingsPage';
import { LogEventPage } from './pages/LogEventPage';

export default function App() {
  return (
    <SettingsProvider>
      <ActionTypesProvider>
        <EventsProvider>
          <RemindersProvider>
            <HistoryFilterProvider>
              <HashRouter>
                <main className="page-content">
                  <ReminderBanner />
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/actions" element={<ActionsPage />} />
                    <Route path="/reminders" element={<RemindersPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/log-event" element={<LogEventPage />} />
                    <Route path="/log-event/:eventId" element={<LogEventPage />} />
                  </Routes>
                </main>
                <NavBar />
              </HashRouter>
            </HistoryFilterProvider>
          </RemindersProvider>
        </EventsProvider>
      </ActionTypesProvider>
    </SettingsProvider>
  );
}
```

`<ReminderBanner />` is placed as a sibling of `<Routes>` inside the same `<main className="page-content">`, not inside any individual page — since `<main>` doesn't remount on route changes (only whichever `<Route>` matched does), this keeps the banner visible and continuously mounted across every tab, inheriting `.page-content`'s existing padding/max-width for free — no fixed positioning or extra safe-area handling needed.

- [ ] **Step 3: Verify**

Run: `cd webapp && npm run build && npm run lint`
Expected: build succeeds, no new lint warnings.

Also run a quick dev-server smoke check that the new route serves (mirrors how earlier work in this repo verified new routes without a browser):

```bash
cd webapp && (npm run dev > /tmp/reminders_dev.log 2>&1 &) && sleep 1 && for i in 1 2 3 4 5; do curl -sf http://localhost:5173/pregnancy-action-tracker/ >/dev/null && echo UP && break; sleep 1; done
curl -sf http://localhost:5173/pregnancy-action-tracker/src/pages/RemindersPage.tsx | grep -o "Add Reminder"
curl -sf http://localhost:5173/pregnancy-action-tracker/src/components/NavBar.tsx | grep -o "Reminders"
lsof -ti:5173 -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
```
Expected: `UP`, then `Add Reminder` and `Reminders` each print once, confirming the new page and nav link are present in the served source.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/NavBar.tsx webapp/src/App.tsx
git commit -m "Wire Reminders tab and banner into navigation and App"
```

---

## After implementation

Per this repo's `AGENTS.md` rule, every issue/feature fix that's pushed to `main` needs a corresponding `v*.*.*` release tag. This plan doesn't push or tag on its own — after all 7 tasks are committed, push to `main` and create the next minor version tag (bump the minor version, since this is a new feature), then verify the tagged deploy workflow run succeeds (build ✓ deploy ✓ release ✓), the same way every other feature in this repo has been shipped.
