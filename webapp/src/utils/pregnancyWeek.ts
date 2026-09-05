const PREGNANCY_DAYS = 280; // 40 weeks
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface PregnancyProgress {
  week: number;
  day: number; // 1-7, day within the week
}

export function getCurrentPregnancyWeek(dueDateIso: string, today: Date = new Date()): PregnancyProgress {
  const dueDate = new Date(dueDateIso);
  const pregnancyStart = new Date(dueDate.getTime() - PREGNANCY_DAYS * MS_PER_DAY);
  const daysPregnant = Math.floor((today.getTime() - pregnancyStart.getTime()) / MS_PER_DAY);
  const clampedDays = Math.max(0, Math.min(daysPregnant, PREGNANCY_DAYS - 1));
  return {
    week: Math.floor(clampedDays / 7) + 1,
    day: (clampedDays % 7) + 1,
  };
}
