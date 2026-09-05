import type { ActionType, ActionEvent } from '../models/types';
import { downloadTextFile } from './exportData';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toLocalTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

// Inverse of importNotes.ts's parseNotesText: produces the same
// "YYYY-MM-DD" / "HH:MM Action name" text grammar, in local time, so a
// round trip through Import notes reproduces the same events. Events whose
// action type was deleted have no name to print and are skipped here (they
// remain in the JSON backup export, which has no such limitation).
export function exportNotesText(actionTypes: ActionType[], events: ActionEvent[]): string {
  const actionTypeById = new Map(actionTypes.map((t) => [t.id, t]));
  const sorted = events
    .filter((evt) => actionTypeById.has(evt.actionTypeId))
    .slice()
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const days: { date: string; lines: string[] }[] = [];
  let currentDate: string | null = null;
  let currentLines: string[] = [];

  sorted.forEach((evt) => {
    const start = new Date(evt.startDate);
    const dateKey = toLocalDateKey(start);
    const name = actionTypeById.get(evt.actionTypeId)!.name;
    const timeLabel = evt.endDate
      ? `${toLocalTime(start)}-${toLocalTime(new Date(evt.endDate))}`
      : toLocalTime(start);

    if (dateKey !== currentDate) {
      if (currentDate !== null) {
        days.push({ date: currentDate, lines: currentLines });
      }
      currentDate = dateKey;
      currentLines = [];
    }
    currentLines.push(`${timeLabel} ${name}`);
  });
  if (currentDate !== null) {
    days.push({ date: currentDate, lines: currentLines });
  }

  return days.map((day) => [day.date, ...day.lines].join('\n')).join('\n\n');
}

export function downloadNotesExportFile(actionTypes: ActionType[], events: ActionEvent[]): void {
  downloadTextFile('pregnancy-tracker-notes.txt', exportNotesText(actionTypes, events), 'text/plain');
}
