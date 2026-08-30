import { useRef, useState, type ChangeEvent } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useActionTypes } from '../context/ActionTypesContext';
import { useEvents } from '../context/EventsContext';
import { buildExportPayload, downloadExportFile } from '../backup/exportData';
import { readFileAsJson, validateImportPayload } from '../backup/importData';

export function SettingsPage() {
  const { settings, updateDueDate, replaceAll: replaceSettings } = useSettings();
  const { actionTypes, replaceAll: replaceActionTypes } = useActionTypes();
  const { events, replaceAll: replaceEvents } = useEvents();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    if (!settings) {
      setError('Set a due date before exporting.');
      return;
    }
    setError(null);
    const payload = buildExportPayload(actionTypes, events, settings);
    downloadExportFile(payload);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      return;
    }
    try {
      const raw = await readFileAsJson(file);
      const payload = validateImportPayload(raw);
      setError(null);
      const confirmed = window.confirm('Replace all current data with this backup?');
      if (!confirmed) {
        return;
      }
      await replaceActionTypes(payload.actionTypes);
      await replaceEvents(payload.events);
      await replaceSettings(payload.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read backup file.');
    }
  }

  return (
    <div className="form">
      <p className="field-label">Due date</p>
      <input
        className="text-input"
        type="date"
        value={settings ? settings.dueDate.slice(0, 10) : ''}
        onChange={async (e) => {
          if (!e.target.value) return;
          try {
            await updateDueDate(new Date(e.target.value).toISOString());
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save.');
          }
        }}
      />

      {error && <p className="error-text">{error}</p>}

      <button className="primary-button" onClick={handleExport}>
        Export Data
      </button>
      <button className="primary-button" onClick={handleImportClick}>
        Import Data
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
