import {
  filterEventsByRange,
  filterEventsByActionType,
  sortEventsMostRecentFirst,
} from './historyFilter';
import { ActionEvent } from '../models/types';

function event(id: string, startDate: string, actionTypeId = 'type-a'): ActionEvent {
  return { id, actionTypeId, startDate, endDate: null };
}

describe('filterEventsByRange', () => {
  const referenceDate = new Date('2026-08-23T12:00:00.000Z');

  it('"day" keeps events within the last 24 hours', () => {
    const events = [
      event('recent', '2026-08-23T10:00:00.000Z'),
      event('old', '2026-08-21T10:00:00.000Z'),
    ];
    const result = filterEventsByRange(events, 'day', referenceDate);
    expect(result.map((e) => e.id)).toEqual(['recent']);
  });

  it('"week" keeps events within the last 7 days', () => {
    const events = [
      event('recent', '2026-08-20T10:00:00.000Z'),
      event('old', '2026-08-01T10:00:00.000Z'),
    ];
    const result = filterEventsByRange(events, 'week', referenceDate);
    expect(result.map((e) => e.id)).toEqual(['recent']);
  });

  it('"all" keeps every event', () => {
    const events = [event('a', '2020-01-01T00:00:00.000Z'), event('b', '2026-08-23T00:00:00.000Z')];
    const result = filterEventsByRange(events, 'all', referenceDate);
    expect(result).toHaveLength(2);
  });
});

describe('filterEventsByActionType', () => {
  it('keeps only events matching the given action type id', () => {
    const events = [event('a', '2026-01-01T00:00:00.000Z', 'type-a'), event('b', '2026-01-01T00:00:00.000Z', 'type-b')];
    const result = filterEventsByActionType(events, 'type-a');
    expect(result.map((e) => e.id)).toEqual(['a']);
  });

  it('returns all events when actionTypeId is null', () => {
    const events = [event('a', '2026-01-01T00:00:00.000Z', 'type-a'), event('b', '2026-01-01T00:00:00.000Z', 'type-b')];
    expect(filterEventsByActionType(events, null)).toHaveLength(2);
  });
});

describe('sortEventsMostRecentFirst', () => {
  it('orders events with the newest startDate first', () => {
    const events = [
      event('older', '2026-01-01T00:00:00.000Z'),
      event('newer', '2026-06-01T00:00:00.000Z'),
    ];
    const result = sortEventsMostRecentFirst(events);
    expect(result.map((e) => e.id)).toEqual(['newer', 'older']);
  });

  it('does not mutate the input array', () => {
    const events = [event('a', '2026-01-01T00:00:00.000Z'), event('b', '2026-06-01T00:00:00.000Z')];
    const original = [...events];
    sortEventsMostRecentFirst(events);
    expect(events).toEqual(original);
  });
});
