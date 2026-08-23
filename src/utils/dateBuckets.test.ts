import { bucketEvents, buildStackData } from './dateBuckets';
import { ActionEvent, ActionType } from '../models/types';

const movement: ActionType = { id: 'movement', name: 'Baby movement', hasDuration: false, isDefault: true };
const contraction: ActionType = { id: 'contraction', name: 'Contraction', hasDuration: true, isDefault: true };

function event(overrides: Partial<ActionEvent>): ActionEvent {
  return {
    id: overrides.id ?? 'event-id',
    actionTypeId: overrides.actionTypeId ?? movement.id,
    startDate: overrides.startDate ?? '2026-08-23T09:15:00.000Z',
    endDate: overrides.endDate ?? null,
  };
}

describe('bucketEvents — day range', () => {
  const referenceDate = new Date('2026-08-23T00:00:00.000Z');

  it('buckets an event into its hour', () => {
    const buckets = bucketEvents(
      [event({ startDate: '2026-08-23T09:15:00.000Z' })],
      'day',
      referenceDate,
      null
    );
    expect(buckets).toHaveLength(24);
    expect(buckets[9].countsByActionType[movement.id]).toBe(1);
    expect(buckets[8].countsByActionType[movement.id]).toBeUndefined();
  });

  it('excludes events from a different day', () => {
    const buckets = bucketEvents(
      [event({ startDate: '2026-08-22T09:15:00.000Z' })],
      'day',
      referenceDate,
      null
    );
    expect(buckets.every((b) => Object.keys(b.countsByActionType).length === 0)).toBe(true);
  });

  it('counts different action types separately in the same hour', () => {
    const buckets = bucketEvents(
      [
        event({ id: '1', actionTypeId: movement.id, startDate: '2026-08-23T09:10:00.000Z' }),
        event({
          id: '2',
          actionTypeId: contraction.id,
          startDate: '2026-08-23T09:20:00.000Z',
          endDate: '2026-08-23T09:21:00.000Z',
        }),
      ],
      'day',
      referenceDate,
      null
    );
    expect(buckets[9].countsByActionType[movement.id]).toBe(1);
    expect(buckets[9].countsByActionType[contraction.id]).toBe(1);
  });
});

describe('bucketEvents — month range', () => {
  const referenceDate = new Date('2026-08-01T00:00:00.000Z');

  it('buckets an event into its day of month', () => {
    const buckets = bucketEvents(
      [event({ startDate: '2026-08-15T09:15:00.000Z' })],
      'month',
      referenceDate,
      null
    );
    expect(buckets).toHaveLength(31);
    expect(buckets[14].countsByActionType[movement.id]).toBe(1);
  });

  it('excludes events from a different month', () => {
    const buckets = bucketEvents(
      [event({ startDate: '2026-09-15T09:15:00.000Z' })],
      'month',
      referenceDate,
      null
    );
    expect(buckets.every((b) => Object.keys(b.countsByActionType).length === 0)).toBe(true);
  });
});

describe('bucketEvents — pregnancy range', () => {
  const dueDateIso = '2026-12-01T00:00:00.000Z';

  it('returns 40 empty-capable weekly buckets', () => {
    const buckets = bucketEvents([], 'pregnancy', new Date(), dueDateIso);
    expect(buckets).toHaveLength(40);
    expect(buckets[0].label).toBe('Week 1');
  });

  it('buckets an event at pregnancy start into week 1', () => {
    const pregnancyStart = new Date(dueDateIso);
    pregnancyStart.setDate(pregnancyStart.getDate() - 280);
    const buckets = bucketEvents(
      [event({ startDate: pregnancyStart.toISOString() })],
      'pregnancy',
      new Date(),
      dueDateIso
    );
    expect(buckets[0].countsByActionType[movement.id]).toBe(1);
  });

  it('buckets an event 7 days after pregnancy start into week 2', () => {
    const day7 = new Date(dueDateIso);
    day7.setDate(day7.getDate() - 280 + 7);
    const buckets = bucketEvents(
      [event({ startDate: day7.toISOString() })],
      'pregnancy',
      new Date(),
      dueDateIso
    );
    expect(buckets[1].countsByActionType[movement.id]).toBe(1);
  });

  it('returns an empty array when there is no due date', () => {
    const buckets = bucketEvents([event({})], 'pregnancy', new Date(), null);
    expect(buckets).toEqual([]);
  });
});

describe('buildStackData', () => {
  it('creates one stack segment per action type with a nonzero count', () => {
    const buckets = [
      {
        label: '09:00',
        countsByActionType: { [movement.id]: 2, [contraction.id]: 1 },
      },
    ];
    const colors = { [movement.id]: '#111111', [contraction.id]: '#222222' };
    const result = buildStackData(buckets, [movement, contraction], colors);

    expect(result).toEqual([
      {
        label: '09:00',
        stacks: [
          { value: 2, color: '#111111' },
          { value: 1, color: '#222222' },
        ],
      },
    ]);
  });

  it('omits action types with zero count in that bucket', () => {
    const buckets = [{ label: '09:00', countsByActionType: { [movement.id]: 2 } }];
    const colors = { [movement.id]: '#111111', [contraction.id]: '#222222' };
    const result = buildStackData(buckets, [movement, contraction], colors);

    expect(result[0].stacks).toEqual([{ value: 2, color: '#111111' }]);
  });
});
