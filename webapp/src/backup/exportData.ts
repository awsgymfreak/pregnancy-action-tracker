import type { ActionType, ActionEvent, Settings, ExportPayload } from '../models/types';

export function buildExportPayload(
  actionTypes: ActionType[],
  events: ActionEvent[],
  settings: Settings
): ExportPayload {
  return { actionTypes, events, settings };
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadExportFile(payload: ExportPayload): void {
  downloadTextFile('pregnancy-tracker-backup.json', JSON.stringify(payload, null, 2), 'application/json');
}
