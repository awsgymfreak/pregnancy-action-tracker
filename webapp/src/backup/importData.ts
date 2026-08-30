import type { ActionType, ActionEvent, Settings, ExportPayload } from '../models/types';
import {
  ValidationError,
  validateActionTypeName,
  validateActionEventDates,
  validateDueDate,
} from '../validation/validators';

export function readFileAsJson(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error('Could not read backup file.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read backup file.'));
    reader.readAsText(file);
  });
}

export function validateImportPayload(raw: unknown): ExportPayload {
  if (typeof raw !== 'object' || raw === null) {
    throw new ValidationError('Backup file is not valid JSON.');
  }

  const data = raw as Partial<ExportPayload>;
  if (
    !Array.isArray(data.actionTypes) ||
    !Array.isArray(data.events) ||
    typeof data.settings !== 'object' ||
    data.settings === null
  ) {
    throw new ValidationError('Backup file is missing required data.');
  }

  const actionTypes = data.actionTypes as ActionType[];
  const seenNames: string[] = [];
  actionTypes.forEach((type) => {
    validateActionTypeName(type.name, seenNames);
    seenNames.push(type.name);
  });

  const actionTypesById = new Map(actionTypes.map((t) => [t.id, t]));
  const rawEvents = data.events as ActionEvent[];
  const events = rawEvents.filter((evt) => {
    const actionType = actionTypesById.get(evt.actionTypeId);
    if (!actionType) {
      // The action type was deleted after this event was logged (deleting an
      // action type intentionally leaves its logged events in place). Drop
      // the orphaned event rather than rejecting the entire import, so a
      // user's own legitimate backup file stays importable.
      return false;
    }
    validateActionEventDates(evt.startDate, evt.endDate, actionType.hasDuration);
    return true;
  });

  const settings = data.settings as Settings;
  validateDueDate(settings.dueDate);

  return { actionTypes, events, settings };
}
