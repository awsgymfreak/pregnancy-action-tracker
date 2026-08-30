import { ActionEvent, ActionType } from '../models/types';

export type DashboardRange = 'day' | 'month' | 'pregnancy';

export interface BucketCount {
  label: string;
  countsByActionType: Record<string, number>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// All bucketing is done in UTC. ActionEvent.startDate/endDate and reference
// dates are ISO 8601 UTC strings ("Z" suffix); using local-time Date methods
// (getHours/getDate/etc.) here would shift bucket boundaries by the host
// machine's timezone offset and make "day"/"hour" assignment nondeterministic
// across environments. UTC accessors keep bucketing identical everywhere.
function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function daysInMonth(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
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
      addToBucket(buckets[start.getUTCHours()], evt.actionTypeId);
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
      start.getUTCFullYear() === monthStart.getUTCFullYear() &&
      start.getUTCMonth() === monthStart.getUTCMonth()
    ) {
      addToBucket(buckets[start.getUTCDate() - 1], evt.actionTypeId);
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
    // react-native-gifted-charts reads stacks[0] unconditionally, so an empty
    // array (a bucket with no events) crashes the chart. A zero-value,
    // invisible segment keeps the bucket rendered without showing a bar.
    return {
      label: bucket.label,
      stacks: stacks.length > 0 ? stacks : [{ value: 0, color: 'transparent' }],
    };
  });
}
