import { useState, type FormEvent } from 'react';
import { useActionTypes } from '../context/ActionTypesContext';

export function ActionsPage() {
  const { actionTypes, addActionType, updateActionType, deleteActionType } = useActionTypes();
  const [name, setName] = useState('');
  const [hasDuration, setHasDuration] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(id: string, currentName: string, currentHasDuration: boolean) {
    setEditingId(id);
    setName(currentName);
    setHasDuration(currentHasDuration);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setHasDuration(false);
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateActionType(editingId, { name, hasDuration });
      } else {
        await addActionType(name, hasDuration);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save action.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this action type? This does not delete already-logged events.')) {
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
      <div>
        {actionTypes.map((item) => (
          <div key={item.id} className="list-row">
            <span className="row-text">
              {item.name}
              {item.hasDuration ? ' (duration)' : ''}
            </span>
            <div className="row-actions">
              <button
                type="button"
                className="link-button edit-link"
                onClick={() => startEdit(item.id, item.name, item.hasDuration)}
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
      <form className="form" onSubmit={handleSubmit}>
        <input
          className="text-input"
          placeholder="Action name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="switch-row">
          <span>Has duration (start + end)</span>
          <input
            type="checkbox"
            checked={hasDuration}
            onChange={(e) => setHasDuration(e.target.checked)}
          />
        </label>
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
