import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ActionType, ActionEvent, Settings, ExportPayload } from '../models/types';

export function buildExportPayload(
  actionTypes: ActionType[],
  events: ActionEvent[],
  settings: Settings
): ExportPayload {
  return { actionTypes, events, settings };
}

export async function exportToFile(payload: ExportPayload): Promise<void> {
  const path = `${FileSystem.cacheDirectory}pregnancy-tracker-backup.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
  await Sharing.shareAsync(path);
}
