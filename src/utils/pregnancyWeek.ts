const PREGNANCY_DAYS = 280; // 40 weeks
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getCurrentPregnancyWeek(dueDateIso: string, today: Date = new Date()): number {
  const dueDate = new Date(dueDateIso);
  const pregnancyStart = new Date(dueDate.getTime() - PREGNANCY_DAYS * MS_PER_DAY);
  const daysPregnant = Math.floor((today.getTime() - pregnancyStart.getTime()) / MS_PER_DAY);
  const week = Math.floor(daysPregnant / 7) + 1;
  return Math.max(1, Math.min(week, 40));
}
