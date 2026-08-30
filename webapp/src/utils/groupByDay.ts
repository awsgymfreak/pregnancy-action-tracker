import type { ActionEvent } from '../models/types';

export interface DayGroup {
  label: string;
  events: ActionEvent[];
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabel(date: Date, today: Date): string {
  if (isSameLocalDay(date, today)) {
    return 'Today';
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) {
    return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Groups events (must already be sorted most-recent-first) by the viewer's
// local calendar day. This is intentionally local-time, unlike
// dateBuckets.ts's UTC bucketing — that one exists for deterministic
// dashboard-chart parity with the mobile app, while these headers are pure
// display and should match what the viewer actually sees on their clock.
export function groupEventsByDay(
  events: ActionEvent[],
  referenceDate: Date = new Date()
): DayGroup[] {
  const groups: DayGroup[] = [];
  events.forEach((evt) => {
    const start = new Date(evt.startDate);
    const last = groups[groups.length - 1];
    if (last && isSameLocalDay(new Date(last.events[0].startDate), start)) {
      last.events.push(evt);
    } else {
      groups.push({ label: dayLabel(start, referenceDate), events: [evt] });
    }
  });
  return groups;
}
