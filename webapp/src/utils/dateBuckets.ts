import type { ActionEvent, ActionType } from '../models/types';

export type DashboardRange = 'day' | 'week' | 'month' | 'pregnancy';

export interface BucketCount {
  label: string;
  countsByActionType: Record<string, number>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Day/hour bucketing uses the viewer's local time, not UTC: this dashboard
// shows "today" and "this month" for the person looking at it, so an event
// logged at 11pm local should land in today's bucket (and that hour),
// regardless of what UTC date/hour it converts to.
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function addToBucket(bucket: BucketCount, actionTypeId: string) {
  bucket.countsByActionType[actionTypeId] = (bucket.countsByActionType[actionTypeId] ?? 0) + 1;
}

function bucketByHour(events: ActionEvent[], referenceDate: Date): BucketCount[] {
  const dayStart = startOfDay(referenceDate);
  const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY);
  const buckets: BucketCount[] = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, '0')}:00`,
    countsByActionType: {},
  }));

  events.forEach((evt) => {
    const start = new Date(evt.startDate);
    if (start >= dayStart && start < dayEnd) {
      addToBucket(buckets[start.getHours()], evt.actionTypeId);
    }
  });

  return buckets;
}

function bucketByLast7Days(events: ActionEvent[], referenceDate: Date): BucketCount[] {
  const todayStart = startOfDay(referenceDate);
  const windowStart = new Date(todayStart.getTime() - 6 * MS_PER_DAY);
  const windowEnd = new Date(todayStart.getTime() + MS_PER_DAY);
  const buckets: BucketCount[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(windowStart.getTime() + i * MS_PER_DAY);
    return { label: day.toLocaleDateString(undefined, { weekday: 'short' }), countsByActionType: {} };
  });

  events.forEach((evt) => {
    const start = new Date(evt.startDate);
    if (start >= windowStart && start < windowEnd) {
      const dayIndex = Math.floor((startOfDay(start).getTime() - windowStart.getTime()) / MS_PER_DAY);
      addToBucket(buckets[dayIndex], evt.actionTypeId);
    }
  });

  return buckets;
}

function bucketByDay(events: ActionEvent[], referenceDate: Date): BucketCount[] {
  const monthStart = startOfMonth(referenceDate);
  const totalDays = daysInMonth(referenceDate);
  const buckets: BucketCount[] = Array.from({ length: totalDays }, (_, i) => ({
    label: String(i + 1),
    countsByActionType: {},
  }));

  events.forEach((evt) => {
    const start = new Date(evt.startDate);
    if (
      start.getFullYear() === monthStart.getFullYear() &&
      start.getMonth() === monthStart.getMonth()
    ) {
      addToBucket(buckets[start.getDate() - 1], evt.actionTypeId);
    }
  });

  return buckets;
}

function bucketByWeek(events: ActionEvent[], dueDateIso: string | null): BucketCount[] {
  if (!dueDateIso) {
    return [];
  }
  const dueDate = new Date(dueDateIso);
  const pregnancyStart = new Date(dueDate.getTime() - 280 * MS_PER_DAY);
  const buckets: BucketCount[] = Array.from({ length: 40 }, (_, i) => ({
    label: `Week ${i + 1}`,
    countsByActionType: {},
  }));

  events.forEach((evt) => {
    const start = new Date(evt.startDate);
    const daysSinceStart = Math.floor((start.getTime() - pregnancyStart.getTime()) / MS_PER_DAY);
    const weekIndex = Math.floor(daysSinceStart / 7);
    if (weekIndex >= 0 && weekIndex < 40) {
      addToBucket(buckets[weekIndex], evt.actionTypeId);
    }
  });

  return buckets;
}

export function bucketEvents(
  events: ActionEvent[],
  range: DashboardRange,
  referenceDate: Date,
  dueDateIso: string | null
): BucketCount[] {
  if (range === 'day') {
    return bucketByHour(events, referenceDate);
  }
  if (range === 'week') {
    return bucketByLast7Days(events, referenceDate);
  }
  if (range === 'month') {
    return bucketByDay(events, referenceDate);
  }
  return bucketByWeek(events, dueDateIso);
}

export interface ChartStackSegment {
  value: number;
  color: string;
}

export interface ChartStackItem {
  label: string;
  stacks: ChartStackSegment[];
}

export function buildStackData(
  buckets: BucketCount[],
  actionTypes: ActionType[],
  colorsByActionTypeId: Record<string, string>
): ChartStackItem[] {
  return buckets.map((bucket) => {
    const stacks = actionTypes
      .filter((type) => (bucket.countsByActionType[type.id] ?? 0) > 0)
      .map((type) => ({
        value: bucket.countsByActionType[type.id],
        color: colorsByActionTypeId[type.id],
      }));
    return {
      label: bucket.label,
      stacks,
    };
  });
}
