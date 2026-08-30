import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActionTypes } from '../context/ActionTypesContext';
import { useEvents } from '../context/EventsContext';

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function LogEventPage() {
  const { actionTypes } = useActionTypes();
  const { addEvent } = useEvents();
  const navigate = useNavigate();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(actionTypes[0]?.id ?? null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const selectedType = actionTypes.find((t) => t.id === selectedTypeId) ?? null;

  async function handleSave() {
    if (!selectedType) {
      setError('Choose an action.');
      return;
    }
    try {
      await addEvent(
        {
          actionTypeId: selectedType.id,
          startDate: startDate.toISOString(),
          endDate: selectedType.hasDuration ? endDate.toISOString() : null,
        },
        selectedType
      );
      navigate('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save event.');
    }
  }

  return (
    <div>
      <p className="field-label">Action</p>
      {actionTypes.map((type) => (
        <div
          key={type.id}
          className={
            selectedTypeId === type.id ? 'option-row option-row-selected' : 'option-row'
          }
          onClick={() => setSelectedTypeId(type.id)}
        >
          {type.name}
        </div>
      ))}

      <p className="field-label">Start time</p>
      <input
        className="text-input"
        type="datetime-local"
        value={toLocalInputValue(startDate)}
        onChange={(e) => e.target.value && setStartDate(new Date(e.target.value))}
      />

      {selectedType?.hasDuration && (
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
        Save
      </button>
    </div>
  );
}
