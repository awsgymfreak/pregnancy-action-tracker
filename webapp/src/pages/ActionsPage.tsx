import { useState, type FormEvent } from 'react';
import { useActionTypes } from '../context/ActionTypesContext';
import { useEvents } from '../context/EventsContext';

export function ActionsPage() {
  const { actionTypes, addActionType, updateActionType, deleteActionType } = useActionTypes();
  const { events } = useEvents();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(id: string, currentName: string) {
    setEditingId(id);
    setName(currentName);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateActionType(editingId, { name });
      } else {
        await addActionType(name);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save action.');
    }
  }

  async function handleDelete(id: string) {
    const eventCount = events.filter((evt) => evt.actionTypeId === id).length;
    if (eventCount > 0) {
      setError(
        `${eventCount} event(s) use this action — reassign or delete them first before deleting this action.`
      );
      return;
    }
    if (!window.confirm('Delete this action type?')) {
      return;
    }
    try {
      await deleteActionType(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete action.');
    }
  }

  return (
    <div>
      <div className="card">
        {actionTypes.map((item) => (
          <div key={item.id} className="list-row">
            <span className="row-text">{item.name}</span>
            <div className="row-actions">
              <button
                type="button"
                className="link-button edit-link"
                onClick={() => startEdit(item.id, item.name)}
              >
                Edit
              </button>
              <button
                type="button"
                className="link-button delete-link"
                onClick={() => handleDelete(item.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <form className="form card" onSubmit={handleSubmit}>
        <input
          className="text-input"
          placeholder="Action name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="primary-button">
          {editingId ? 'Save Changes' : 'Add Action'}
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
