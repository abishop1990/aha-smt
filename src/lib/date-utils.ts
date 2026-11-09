import { differenceInBusinessDays, eachDayOfInterval, format, isAfter, isWeekend, parseISO } from "date-fns";

export function parseAhaDate(value: string): Date {
  return parseISO(value);
}

export function formatAhaDate(
  value: string | null | undefined,
  pattern = "MMM d, yyyy"
): string {
  if (!value) return "N/A";
  return format(parseAhaDate(value), pattern);
}

export function getLocalDateString(date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function countBusinessDaysInclusive(startDate: string, endDate: string): number {
  const start = parseAhaDate(startDate);
  const end = parseAhaDate(endDate);

  if (start > end) return 0;

  return eachDayOfInterval({ start, end }).filter((date) => !isWeekend(date)).length;
}

/** Business days left until `endDate`; 0 once it has passed or when there is no end date. */
export function businessDaysRemaining(endDate: string | null | undefined, now = new Date()): number {
  if (!endDate) return 0;
  const end = parseAhaDate(endDate);
  if (isAfter(now, end)) return 0;
  return differenceInBusinessDays(end, now);
}
