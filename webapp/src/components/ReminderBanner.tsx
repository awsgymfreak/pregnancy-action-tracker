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
