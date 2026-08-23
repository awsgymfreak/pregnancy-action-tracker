import { getCurrentPregnancyWeek } from './pregnancyWeek';

describe('getCurrentPregnancyWeek', () => {
  it('returns week 1 at the very start of pregnancy (280 days before due date)', () => {
    const dueDate = '2026-12-01T00:00:00.000Z';
    const pregnancyStart = new Date('2026-12-01T00:00:00.000Z');
    pregnancyStart.setDate(pregnancyStart.getDate() - 280);
    expect(getCurrentPregnancyWeek(dueDate, pregnancyStart)).toBe(1);
  });

  it('returns week 40 on the due date itself', () => {
    const dueDate = '2026-12-01T00:00:00.000Z';
    expect(getCurrentPregnancyWeek(dueDate, new Date(dueDate))).toBe(40);
  });

  it('clamps to 1 for a date before pregnancy start', () => {
    const dueDate = '2026-12-01T00:00:00.000Z';
    const wayBefore = new Date('2020-01-01T00:00:00.000Z');
    expect(getCurrentPregnancyWeek(dueDate, wayBefore)).toBe(1);
  });

  it('clamps to 40 for a date well past the due date', () => {
    const dueDate = '2026-12-01T00:00:00.000Z';
    const wayAfter = new Date('2027-06-01T00:00:00.000Z');
    expect(getCurrentPregnancyWeek(dueDate, wayAfter)).toBe(40);
  });

  it('returns week 2 exactly 7 days into pregnancy', () => {
    const dueDate = '2026-12-01T00:00:00.000Z';
    const pregnancyStart = new Date('2026-12-01T00:00:00.000Z');
    pregnancyStart.setDate(pregnancyStart.getDate() - 280 + 7);
    expect(getCurrentPregnancyWeek(dueDate, pregnancyStart)).toBe(2);
  });
});
