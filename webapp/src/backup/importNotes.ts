import type { ActionType } from '../models/types';

export interface ParsedNoteEvent {
  line: number;
  date: string; // YYYY-MM-DD
  actionTypeId: string;
  actionName: string;
  startDate: string; // ISO
  endDate: string | null; // ISO
}

export interface ParseNotesResult {
  events: ParsedNoteEvent[];
  errors: string[];
}

const DATE_LINE = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_LINE = /^(\d{1,2}:\d{2})(?:-(\d{1,2}:\d{2}))?\s+(.+)$/;

function toIsoLocal(date: string, time: string): string {
  const [hour, minute] = time.split(':');
  const hh = hour.padStart(2, '0');
  const iso = new Date(`${date}T${hh}:${minute}:00`).toISOString();
  if (Number.isNaN(new Date(iso).getTime())) {
    throw new Error('invalid');
  }
  return iso;
}

// Strict "cleaned notes" format, agreed with the user rather than fuzzy-
// parsing arbitrary free text (which was too ambiguous — no AM/PM, typo'd
// action names, inconsistent separators):
//
//   YYYY-MM-DD
//   HH:MM Action name
//   HH:MM-HH:MM Action name    (optional end time — any action can have one)
//
// A blank line or the next date header starts a new day. Action names must
// match an existing action type's name exactly (case-insensitive).
export function parseNotesText(text: string, actionTypes: ActionType[]): ParseNotesResult {
  const byName = new Map(actionTypes.map((t) => [t.name.trim().toLowerCase(), t]));
  const events: ParsedNoteEvent[] = [];
  const errors: string[] = [];
  let currentDate: string | null = null;

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    const lineNumber = index + 1;
    if (line.length === 0) {
      return;
    }

    if (DATE_LINE.test(line)) {
      currentDate = line;
      return;
    }

    if (!currentDate) {
      errors.push(`Line ${lineNumber}: no date header (YYYY-MM-DD) set before this entry.`);
      return;
    }

    const match = line.match(EVENT_LINE);
    if (!match) {
      errors.push(`Line ${lineNumber}: could not parse "${line}" — expected "HH:MM Action name".`);
      return;
    }

    const [, startTime, endTime, rawActionName] = match;
    const actionName = rawActionName.trim();
    const actionType = byName.get(actionName.toLowerCase());
    if (!actionType) {
      errors.push(
        `Line ${lineNumber}: unknown action "${actionName}" — add it in the Actions tab first, or fix the name.`
      );
      return;
    }

    try {
      const startDate = toIsoLocal(currentDate, startTime);
      const endDate = endTime ? toIsoLocal(currentDate, endTime) : null;

      events.push({
        line: lineNumber,
        date: currentDate,
        actionTypeId: actionType.id,
        actionName: actionType.name,
        startDate,
        endDate,
      });
    } catch {
      errors.push(`Line ${lineNumber}: invalid date/time in "${line}".`);
    }
  });

  return { events, errors };
}
