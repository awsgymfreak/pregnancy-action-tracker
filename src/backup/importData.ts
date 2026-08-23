import { ActionType, ActionEvent, Settings, ExportPayload } from '../models/types';
import {
  ValidationError,
  validateActionTypeName,
  validateActionEventDates,
  validateDueDate,
} from '../validation/validators';

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
  const events = data.events as ActionEvent[];
  events.forEach((evt) => {
    const actionType = actionTypesById.get(evt.actionTypeId);
    if (!actionType) {
      throw new ValidationError('Backup file references an unknown action type.');
    }
    validateActionEventDates(evt.startDate, evt.endDate, actionType.hasDuration);
  });

  const settings = data.settings as Settings;
  validateDueDate(settings.dueDate);

  return { actionTypes, events, settings };
}
