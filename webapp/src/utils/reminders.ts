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

export function completeReminder(reminder: Reminder, _today: Date): Reminder | null {
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
