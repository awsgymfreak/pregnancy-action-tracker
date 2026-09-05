import { useMemo, useState, type FormEvent } from 'react';
import { useReminders } from '../context/RemindersContext';
import { parseLocalDate, sortRemindersByDate } from '../utils/reminders';
import type { Reminder } from '../models/types';

type RecurrenceMode = 'once' | 'week' | 'month' | 'custom';

const RECURRENCE_PRESET_DAYS: Record<'week' | 'month', number> = { week: 7, month: 30 };

function recurrenceModeFor(recurrenceDays: number | null): RecurrenceMode {
  if (recurrenceDays === null) {
    return 'once';
  }
  if (recurrenceDays === RECURRENCE_PRESET_DAYS.week) {
    return 'week';
  }
  if (recurrenceDays === RECURRENCE_PRESET_DAYS.month) {
    return 'month';
  }
  return 'custom';
}

function formatReminderDate(dateOnly: string): string {
  return parseLocalDate(dateOnly).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRecurrence(recurrenceDays: number | null): string {
  switch (recurrenceModeFor(recurrenceDays)) {
    case 'once':
      return '';
    case 'week':
      return ' · weekly';
    case 'month':
      return ' · monthly';
    default:
      return ` · every ${recurrenceDays}d`;
  }
}

export function RemindersPage() {
  const { reminders, addReminder, updateReminder, deleteReminder } = useReminders();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('once');
  const [recurrenceDays, setRecurrenceDays] = useState('3');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedReminders = useMemo(() => sortRemindersByDate(reminders), [reminders]);

  function startEdit(reminder: Reminder) {
    setEditingId(reminder.id);
    setTitle(reminder.title);
    setDate(reminder.date);
    const mode = recurrenceModeFor(reminder.recurrenceDays);
    setRecurrenceMode(mode);
    setRecurrenceDays(mode === 'custom' ? String(reminder.recurrenceDays) : '3');
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDate('');
    setRecurrenceMode('once');
    setRecurrenceDays('3');
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsedRecurrence =
      recurrenceMode === 'once'
        ? null
        : recurrenceMode === 'custom'
          ? Number(recurrenceDays)
          : RECURRENCE_PRESET_DAYS[recurrenceMode];
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
                {formatRecurrence(reminder.recurrenceDays)}
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
        <p className="field-label">Repeat</p>
        <select
          className="select-pill"
          style={{ width: '100%' }}
          aria-label="Repeat"
          value={recurrenceMode}
          onChange={(e) => setRecurrenceMode(e.target.value as RecurrenceMode)}
        >
          <option value="once">One-off</option>
          <option value="week">Every week</option>
          <option value="month">Every month</option>
          <option value="custom">Custom (days)</option>
        </select>

        {recurrenceMode === 'custom' && (
          <>
            <p className="field-label">Repeat every N days</p>
            <input
              className="text-input"
              type="number"
              min="1"
              value={recurrenceDays}
              onChange={(e) => setRecurrenceDays(e.target.value)}
            />
          </>
        )}
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
