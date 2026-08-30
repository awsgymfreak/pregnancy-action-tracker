import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ActionEvent } from '../models/types';
import { useActionTypes } from '../context/ActionTypesContext';
import { useEvents } from '../context/EventsContext';

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function mostRecentActionTypeId(events: ActionEvent[]): string | null {
  if (events.length === 0) {
    return null;
  }
  return events.reduce((latest, evt) =>
    new Date(evt.startDate).getTime() > new Date(latest.startDate).getTime() ? evt : latest
  ).actionTypeId;
}

export function LogEventPage() {
  const { actionTypes } = useActionTypes();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const navigate = useNavigate();
  const { eventId } = useParams();

  const existingEvent = useMemo(
    () => (eventId ? (events.find((e) => e.id === eventId) ?? null) : null),
    [events, eventId]
  );
  const isEditing = Boolean(eventId);
  const notFound = isEditing && !existingEvent;

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(() => {
    if (existingEvent) {
      return existingEvent.actionTypeId;
    }
    const lastUsedId = mostRecentActionTypeId(events);
    if (lastUsedId && actionTypes.some((t) => t.id === lastUsedId)) {
      return lastUsedId;
    }
    return actionTypes[0]?.id ?? null;
  });
  const [startDate, setStartDate] = useState(() =>
    existingEvent ? new Date(existingEvent.startDate) : new Date()
  );
  const [hasEndTime, setHasEndTime] = useState(() => Boolean(existingEvent?.endDate));
  const [endDate, setEndDate] = useState(() =>
    existingEvent?.endDate ? new Date(existingEvent.endDate) : new Date()
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!selectedTypeId) {
      setError('Choose an action.');
      return;
    }
    const input = {
      actionTypeId: selectedTypeId,
      startDate: startDate.toISOString(),
      endDate: hasEndTime ? endDate.toISOString() : null,
    };
    try {
      if (isEditing && eventId) {
        await updateEvent(eventId, input);
      } else {
        await addEvent(input);
      }
      navigate('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save event.');
    }
  }

  async function handleDelete() {
    if (!eventId) {
      return;
    }
    if (!window.confirm('Delete this logged event?')) {
      return;
    }
    try {
      await deleteEvent(eventId);
      navigate('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete event.');
    }
  }

  if (notFound) {
    return (
      <div className="card">
        <p className="week-header-muted">This event no longer exists.</p>
        <button className="primary-button" style={{ marginTop: 16 }} onClick={() => navigate('/history')}>
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="week-header">{isEditing ? 'Edit Event' : 'Log Event'}</p>

      <p className="field-label">Action</p>
      <select
        className="select-pill"
        style={{ width: '100%' }}
        aria-label="Action"
        value={selectedTypeId ?? ''}
        onChange={(e) => setSelectedTypeId(e.target.value || null)}
      >
        {actionTypes.length === 0 && <option value="">No actions yet</option>}
        {actionTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
      </select>

      <p className="field-label">Start time</p>
      <input
        className="text-input"
        type="datetime-local"
        value={toLocalInputValue(startDate)}
        onChange={(e) => e.target.value && setStartDate(new Date(e.target.value))}
      />

      <label className="switch-row" style={{ marginTop: 16 }}>
        <span>Add an end time</span>
        <input
          type="checkbox"
          checked={hasEndTime}
          onChange={(e) => setHasEndTime(e.target.checked)}
        />
      </label>

      {hasEndTime && (
        <>
          <p className="field-label">End time</p>
          <input
            className="text-input"
            type="datetime-local"
            value={toLocalInputValue(endDate)}
            onChange={(e) => e.target.value && setEndDate(new Date(e.target.value))}
          />
        </>
      )}

      {error && <p className="error-text">{error}</p>}

      <button className="primary-button" style={{ marginTop: 16 }} onClick={handleSave}>
        {isEditing ? 'Save Changes' : 'Save'}
      </button>

      {isEditing && (
        <button
          type="button"
          className="link-button delete-link"
          style={{ marginTop: 12, textAlign: 'center', width: '100%' }}
          onClick={handleDelete}
        >
          Delete event
        </button>
      )}
    </div>
  );
}
