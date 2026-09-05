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
