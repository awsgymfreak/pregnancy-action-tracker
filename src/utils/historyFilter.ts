import { ActionEvent } from '../models/types';

export type HistoryRange = 'day' | 'week' | 'all';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function filterEventsByRange(
  events: ActionEvent[],
  range: HistoryRange,
  referenceDate: Date = new Date()
): ActionEvent[] {
  if (range === 'all') {
    return events;
  }
  const days = range === 'day' ? 1 : 7;
  const cutoff = new Date(referenceDate.getTime() - days * MS_PER_DAY);
  return events.filter((evt) => new Date(evt.startDate) >= cutoff);
}

export function filterEventsByActionType(
  events: ActionEvent[],
  actionTypeId: string | null
): ActionEvent[] {
  if (actionTypeId === null) {
    return events;
  }
  return events.filter((evt) => evt.actionTypeId === actionTypeId);
}

export function sortEventsMostRecentFirst(events: ActionEvent[]): ActionEvent[] {
  return [...events].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
}
