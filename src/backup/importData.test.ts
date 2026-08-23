import { validateImportPayload } from './importData';
import { ValidationError } from '../validation/validators';

const validActionType = { id: 'a1', name: 'Baby movement', hasDuration: false, isDefault: true };
const validDurationType = { id: 'a2', name: 'Contraction', hasDuration: true, isDefault: true };

const validPayload = {
  actionTypes: [validActionType, validDurationType],
  events: [
    { id: 'e1', actionTypeId: 'a1', startDate: '2026-08-23T09:00:00.000Z', endDate: null },
    {
      id: 'e2',
      actionTypeId: 'a2',
      startDate: '2026-08-23T09:00:00.000Z',
      endDate: '2026-08-23T09:05:00.000Z',
    },
  ],
  settings: { dueDate: '2026-12-01T00:00:00.000Z' },
};

describe('validateImportPayload', () => {
  it('accepts a valid payload and returns it', () => {
    expect(validateImportPayload(validPayload)).toEqual(validPayload);
  });

  it('rejects non-object input', () => {
    expect(() => validateImportPayload('not json')).toThrow(ValidationError);
    expect(() => validateImportPayload(null)).toThrow(ValidationError);
  });

  it('rejects a payload missing required top-level keys', () => {
    expect(() => validateImportPayload({ actionTypes: [] })).toThrow(ValidationError);
  });

  it('rejects duplicate action type names within the payload', () => {
    const payload = {
      ...validPayload,
      actionTypes: [validActionType, { ...validDurationType, name: 'Baby movement' }],
    };
    expect(() => validateImportPayload(payload)).toThrow(ValidationError);
  });

  it('drops an event referencing an unknown action type rather than rejecting the whole import', () => {
    const orphanEvent = {
      id: 'e3',
      actionTypeId: 'missing',
      startDate: '2026-08-23T09:00:00.000Z',
      endDate: null,
    };
    const payload = {
      ...validPayload,
      events: [orphanEvent],
    };
    const result = validateImportPayload(payload);
    expect(result.events).toEqual([]);
  });

  it('keeps other valid events when dropping only the event with an unknown action type', () => {
    const orphanEvent = {
      id: 'e3',
      actionTypeId: 'missing',
      startDate: '2026-08-23T09:00:00.000Z',
      endDate: null,
    };
    const payload = {
      ...validPayload,
      events: [...validPayload.events, orphanEvent],
    };
    const result = validateImportPayload(payload);
    expect(result.events).toEqual(validPayload.events);
    expect(result.events.find((e) => e.id === 'e3')).toBeUndefined();
  });

  it('rejects a duration-type event missing its end date', () => {
    const payload = {
      ...validPayload,
      events: [{ id: 'e4', actionTypeId: 'a2', startDate: '2026-08-23T09:00:00.000Z', endDate: null }],
    };
    expect(() => validateImportPayload(payload)).toThrow(ValidationError);
  });

  it('rejects an invalid due date', () => {
    const payload = { ...validPayload, settings: { dueDate: 'not-a-date' } };
    expect(() => validateImportPayload(payload)).toThrow(ValidationError);
  });
});
