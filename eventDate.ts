/* ==========================================================================
   Calendar date helpers
   Events arrive either as `datetime-local` strings from the admin form
   ("2026-09-14T09:00") or, potentially, as plain ISO dates ("2026-09-14").
   Plain date-only strings are parsed as UTC by JS, which can shift the day in
   negative-offset timezones — so they are handled explicitly here.
   ========================================================================== */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type EventDateParts = { day: string; month: string };

/** Day number + short month name shown on the calendar card (never locale-dependent). */
export function eventDateParts(value?: string | null): EventDateParts {
  if (!value) return { day: '--', month: '--' };

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return { day: dateOnly[3], month: MONTHS[Number(dateOnly[2]) - 1] ?? '--' };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: '--', month: '--' };
  return { day: String(date.getDate()), month: MONTHS[date.getMonth()] };
}

/** Full label used in the admin list, e.g. "Mon 14 Sep". */
export function eventDateLabel(value?: string | null): string {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export const isParseableDate = (value?: string | null) => Boolean(value && !Number.isNaN(new Date(value).getTime()));
