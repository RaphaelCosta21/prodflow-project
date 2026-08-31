import { getBrHolidaySet } from "../config/brHolidays";

// All comparisons in UTC to match the "YYYY-MM-DD" holiday set (avoids timezone drift).
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function utcMidnight(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export function isBusinessDay(date: Date, holidays: Set<string>): boolean {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !holidays.has(isoUtc(date));
}

// Adds N Brazilian business days to `start` (skips weekends + national holidays).
export function addBusinessDays(
  start: Date,
  businessDays: number,
  holidays?: Set<string>,
): Date {
  let d = utcMidnight(start);
  const set =
    holidays ?? getBrHolidaySet(d.getUTCFullYear() - 1, d.getUTCFullYear() + 2);
  let remaining = Math.max(0, Math.floor(businessDays));
  while (remaining > 0) {
    d = new Date(d.getTime() + 86400000);
    if (isBusinessDay(d, set)) remaining--;
  }
  return d;
}

export function businessDaysBetween(
  start: Date,
  end: Date,
  holidays?: Set<string>,
): number {
  let cursor = utcMidnight(start);
  const target = utcMidnight(end);
  if (target <= cursor) return 0;
  const set =
    holidays ??
    getBrHolidaySet(cursor.getUTCFullYear() - 1, target.getUTCFullYear() + 1);
  let count = 0;
  while (cursor < target) {
    cursor = new Date(cursor.getTime() + 86400000);
    if (isBusinessDay(cursor, set)) count++;
  }
  return count;
}

export function isOverdue(deadline: Date, reference?: Date): boolean {
  const ref = reference ?? new Date();
  return utcMidnight(ref).getTime() > utcMidnight(deadline).getTime();
}
