import {
  ValidationError,
  validateActionTypeName,
  validateActionEventDates,
  validateDueDate,
} from './validators';

describe('validateActionTypeName', () => {
  it('trims and returns a valid name', () => {
    expect(validateActionTypeName('  Headache  ', [])).toBe('Headache');
  });

  it('rejects an empty name', () => {
    expect(() => validateActionTypeName('   ', [])).toThrow(ValidationError);
  });

  it('rejects a name over 50 characters', () => {
    const tooLong = 'a'.repeat(51);
    expect(() => validateActionTypeName(tooLong, [])).toThrow(ValidationError);
  });

  it('rejects a case-insensitive duplicate', () => {
    expect(() => validateActionTypeName('baby movement', ['Baby movement'])).toThrow(
      ValidationError
    );
  });

  it('allows a name that does not collide', () => {
    expect(validateActionTypeName('Headache', ['Baby movement'])).toBe('Headache');
  });
});

describe('validateActionEventDates', () => {
  it('requires a start date', () => {
    expect(() => validateActionEventDates('', null, false)).toThrow(ValidationError);
    expect(() => validateActionEventDates('not-a-date', null, false)).toThrow(ValidationError);
  });

  it('does not require an end date when hasDuration is false', () => {
    expect(() => validateActionEventDates('2026-08-23T10:00:00.000Z', null, false)).not.toThrow();
  });

  it('requires an end date when hasDuration is true', () => {
    expect(() => validateActionEventDates('2026-08-23T10:00:00.000Z', null, true)).toThrow(
      ValidationError
    );
  });

  it('rejects an end date before the start date', () => {
    expect(() =>
      validateActionEventDates(
        '2026-08-23T10:00:00.000Z',
        '2026-08-23T09:00:00.000Z',
        true
      )
    ).toThrow(ValidationError);
  });

  it('allows an end date equal to the start date', () => {
    expect(() =>
      validateActionEventDates(
        '2026-08-23T10:00:00.000Z',
        '2026-08-23T10:00:00.000Z',
        true
      )
    ).not.toThrow();
  });
});

describe('validateDueDate', () => {
  it('rejects an empty or invalid date', () => {
    expect(() => validateDueDate('')).toThrow(ValidationError);
    expect(() => validateDueDate('not-a-date')).toThrow(ValidationError);
  });

  it('accepts a valid ISO date', () => {
    expect(() => validateDueDate('2026-12-01T00:00:00.000Z')).not.toThrow();
  });
});
