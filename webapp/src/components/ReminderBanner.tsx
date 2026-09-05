import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReminders } from '../context/RemindersContext';
import { useEvents } from '../context/EventsContext';
import { useSettings } from '../context/SettingsContext';
import { readJson, writeJson } from '../storage/localStorage';
import {
  isReminderDue,
  dismissReminder,
  completeReminder,
  getDaysSinceLastEvent,
  isInactivityDue,
  formatLocalDate,
  addDaysToDateOnly,
  parseLocalDate,
} from '../utils/reminders';
import type { Reminder } from '../models/types';

const INACTIVITY_DISMISS_KEY = 'pregnancy-tracker:inactivity-dismissed-until';

function readInactivityDismissedUntil(): string | null {
  return readJson<string>(INACTIVITY_DISMISS_KEY);
}

function formatReminderDate(dateOnly: string): string {
  return parseLocalDate(dateOnly).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ReminderBanner() {
  const { reminders, updateReminder, deleteReminder } = useReminders();
  const { events } = useEvents();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [inactivityDismissedUntil, setInactivityDismissedUntil] = useState<string | null>(
    readInactivityDismissedUntil
  );
  const [error, setError] = useState<string | null>(null);

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

  async function handleDismiss(reminder: Reminder) {
    try {
      await updateReminder(reminder.id, dismissReminder(reminder, today));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not dismiss reminder.');
    }
  }

  async function handleComplete(reminder: Reminder) {
    try {
      const next = completeReminder(reminder, today);
      if (next === null) {
        await deleteReminder(reminder.id);
      } else {
        await updateReminder(reminder.id, next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete reminder.');
    }
  }

  function handleDismissInactivity() {
    const tomorrow = addDaysToDateOnly(formatLocalDate(today), 1);
    try {
      writeJson(INACTIVITY_DISMISS_KEY, tomorrow);
      setInactivityDismissedUntil(tomorrow);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    }
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
          <span className="reminder-banner-text">
            {reminder.title}
            <span className="reminder-banner-date"> · Due {formatReminderDate(reminder.date)}</span>
          </span>
          <div className="reminder-banner-actions">
            <button
              type="button"
              className="reminder-banner-button"
              aria-label="Complete"
              onClick={(e) => {
                e.stopPropagation();
                handleComplete(reminder);
              }}
              onKeyDown={(e) => e.stopPropagation()}
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
              onKeyDown={(e) => e.stopPropagation()}
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
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
