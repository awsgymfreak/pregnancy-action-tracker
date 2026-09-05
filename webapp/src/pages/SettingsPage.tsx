import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useActionTypes } from '../context/ActionTypesContext';
import { useEvents } from '../context/EventsContext';
import { buildExportPayload, downloadExportFile } from '../backup/exportData';
import { downloadNotesExportFile } from '../backup/exportNotes';
import { readFileAsJson, validateImportPayload } from '../backup/importData';
import { parseNotesText, readFileAsText, type ParseNotesResult } from '../backup/importNotes';

function formatPreviewTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function SettingsPage() {
  const { settings, updateDueDate, replaceAll: replaceSettings } = useSettings();
  const { actionTypes, addActionType, addActionTypes, replaceAll: replaceActionTypes } =
    useActionTypes();
  const { events, addEvents, replaceAll: replaceEvents } = useEvents();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notesFileInputRef = useRef<HTMLInputElement>(null);

  const [notesText, setNotesText] = useState('');
  const [notesPreview, setNotesPreview] = useState<ParseNotesResult | null>(null);
  const [notesImportedCount, setNotesImportedCount] = useState<number | null>(null);

  const notesGroups = useMemo(() => {
    if (!notesPreview) {
      return [];
    }
    const groups: { date: string; events: typeof notesPreview.events }[] = [];
    notesPreview.events.forEach((evt) => {
      const last = groups[groups.length - 1];
      if (last && last.date === evt.date) {
        last.events.push(evt);
      } else {
        groups.push({ date: evt.date, events: [evt] });
      }
    });
    return groups;
  }, [notesPreview]);

  function handlePreviewNotes() {
    setNotesImportedCount(null);
    setNotesPreview(parseNotesText(notesText, actionTypes));
  }

  async function handleCreateMissingAction(name: string) {
    try {
      const newType = await addActionType(name);
      setNotesPreview((prev) => (prev ? parseNotesText(notesText, [...actionTypes, newType]) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create action.');
    }
  }

  async function handleCreateAllMissingActions() {
    if (!notesPreview || notesPreview.missingActionNames.length === 0) {
      return;
    }
    try {
      const newTypes = await addActionTypes(notesPreview.missingActionNames);
      setNotesPreview(parseNotesText(notesText, [...actionTypes, ...newTypes]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create actions.');
    }
  }

  async function handleConfirmNotesImport() {
    if (!notesPreview || notesPreview.errors.length > 0 || notesPreview.events.length === 0) {
      return;
    }
    try {
      await addEvents(
        notesPreview.events.map((evt) => ({
          actionTypeId: evt.actionTypeId,
          startDate: evt.startDate,
          endDate: evt.endDate,
        }))
      );
      setNotesImportedCount(notesPreview.events.length);
      setNotesText('');
      setNotesPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import notes.');
    }
  }

  function handleExport() {
    if (!settings) {
      setError('Set a due date before exporting.');
      return;
    }
    setError(null);
    try {
      const payload = buildExportPayload(actionTypes, events, settings);
      downloadExportFile(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export backup.');
    }
  }

  function handleExportNotes() {
    setError(null);
    try {
      downloadNotesExportFile(actionTypes, events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export notes.');
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleNotesFileClick() {
    notesFileInputRef.current?.click();
  }

  async function handleNotesFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('Please choose a .txt file.');
      return;
    }
    try {
      const text = await readFileAsText(file);
      setError(null);
      setNotesText(text);
      setNotesImportedCount(null);
      setNotesPreview(parseNotesText(text, actionTypes));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read notes file.');
    }
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
    <div>
      <div className="form card">
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
        <button className="primary-button" onClick={handleExportNotes}>
          Export as Notes
        </button>
        <button className="primary-button" onClick={handleImportClick}>
          Import Data
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="form card">
        <p className="field-label">Import notes</p>
        <p className="week-header-muted">
          Paste cleaned-up notes in this format, one entry per line:
          <br />
          <code>
            2026-08-29
            <br />
            06:53 Baby movement
            <br />
            14:20-14:35 Contraction
          </code>
          <br />
          Action names must match an existing action exactly (case-insensitive) — if one doesn't
          exist yet, the preview lets you create it without leaving this page. Any line can
          optionally use a start-end range instead of a single time, to log an end time too.
        </p>
        <textarea
          className="textarea"
          placeholder={'2026-08-29\n06:53 Baby movement'}
          value={notesText}
          onChange={(e) => {
            setNotesText(e.target.value);
            setNotesPreview(null);
            setNotesImportedCount(null);
          }}
        />
        <button className="primary-button" onClick={handlePreviewNotes} disabled={!notesText.trim()}>
          Preview
        </button>
        <button className="primary-button" onClick={handleNotesFileClick}>
          Import from file
        </button>
        <input
          ref={notesFileInputRef}
          type="file"
          accept=".txt,text/plain"
          style={{ display: 'none' }}
          onChange={handleNotesFileChange}
        />

        {notesImportedCount !== null && (
          <p className="week-header-muted">Imported {notesImportedCount} event(s).</p>
        )}

        {notesPreview && notesPreview.errors.length > 0 && (
          <div className="error-list">
            {notesPreview.errors.map((message) => (
              <p className="error-text" key={message}>
                {message}
              </p>
            ))}
          </div>
        )}

        {notesPreview && notesPreview.missingActionNames.length > 0 && (
          <div className="card" style={{ background: 'var(--color-accent-soft)' }}>
            <p className="field-label" style={{ marginTop: 0 }}>
              {notesPreview.missingActionNames.length === 1
                ? "1 action doesn't exist yet"
                : `${notesPreview.missingActionNames.length} actions don't exist yet`}
            </p>
            {notesPreview.missingActionNames.map((name) => (
              <div key={name} className="list-row">
                <span className="row-text">{name}</span>
                <button
                  type="button"
                  className="link-button edit-link"
                  onClick={() => handleCreateMissingAction(name)}
                >
                  Create
                </button>
              </div>
            ))}
            {notesPreview.missingActionNames.length > 1 && (
              <button className="primary-button" style={{ marginTop: 12 }} onClick={handleCreateAllMissingActions}>
                Create all {notesPreview.missingActionNames.length}
              </button>
            )}
          </div>
        )}

        {notesPreview && notesPreview.errors.length === 0 && notesPreview.events.length > 0 && (
          <>
            {notesGroups.map((group) => (
              <div className="day-group" key={group.date}>
                <p className="day-group-header">{group.date}</p>
                {group.events.map((evt) => (
                  <div key={evt.line} className="event-card event-card-static">
                    <div className="event-body">
                      <span className="event-name">{evt.actionName}</span>
                      <span className="event-time">
                        {formatPreviewTime(evt.startDate)}
                        {evt.endDate ? ` – ${formatPreviewTime(evt.endDate)}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <button className="primary-button" onClick={handleConfirmNotesImport}>
              Import {notesPreview.events.length} event(s)
            </button>
          </>
        )}

        {notesPreview &&
          notesPreview.errors.length === 0 &&
          notesPreview.events.length === 0 &&
          notesPreview.missingActionNames.length === 0 && (
          <p className="week-header-muted">No events found in the pasted text.</p>
        )}
      </div>

      <p className="week-header-muted" style={{ textAlign: 'center' }}>
        {import.meta.env.VITE_APP_VERSION ?? 'dev'}
      </p>
    </div>
  );
}
