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
