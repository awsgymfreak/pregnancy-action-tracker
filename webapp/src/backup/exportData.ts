import type { ActionType, ActionEvent, Settings, ExportPayload } from '../models/types';

export function buildExportPayload(
  actionTypes: ActionType[],
  events: ActionEvent[],
  settings: Settings
): ExportPayload {
  return { actionTypes, events, settings };
}

export function downloadExportFile(payload: ExportPayload): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pregnancy-tracker-backup.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
