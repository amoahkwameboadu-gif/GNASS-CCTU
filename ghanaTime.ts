/* ---------- Ghana Time (Africa/Accra) Utilities ---------- */
// Ghana uses GMT (UTC+0) year-round — no DST. All date/time calculations
// for the countdown and schedule highlighting must use this timezone.
export const GHANA_TZ = 'Africa/Accra';

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: GHANA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/**
 * Returns a Date object representing "now" in Ghana Time.
 * Uses Intl.DateTimeFormat to get accurate time in Africa/Accra.
 */
export function getGhanaNow(): Date {
  const parts = formatter.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value || '0';
  const year = Number(get('year'));
  const month = Number(get('month')) - 1; // JS months are 0-indexed
  const day = Number(get('day'));
  const hour = Number(get('hour')) % 24; // some engines report midnight as "24"
  const minute = Number(get('minute'));
  const second = Number(get('second'));
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/** Returns the day of week (0=Sun, 6=Sat) in Ghana Time. */
export function getGhanaDay(): number {
  return getGhanaNow().getUTCDay();
}

/** Returns the current hour (0-23) in Ghana Time. */
export function getGhanaHour(): number {
  return getGhanaNow().getUTCHours();
}

/** Returns the current minute (0-59) in Ghana Time. */
export function getGhanaMinute(): number {
  return getGhanaNow().getUTCMinutes();
}

/* ---------- Sabbath countdown (Ghana Time) ---------- */
// Ghana uses GMT/UTC+0, so the countdown uses UTC throughout regardless of
// the visitor's local timezone.
export function getNextSabbathStart(): Date {
  const now = getGhanaNow();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0, 0));

  const FRIDAY = 5;
  let daysUntilFriday = (FRIDAY - now.getUTCDay() + 7) % 7;

  // If it's already Friday but past 6 PM, jump to next week's Friday.
  if (daysUntilFriday === 0 && now > target) daysUntilFriday = 7;

  target.setUTCDate(now.getUTCDate() + daysUntilFriday);
  return target;
}

export type CountdownState = {
  status: string;
  days: string;
  hours: string;
  mins: string;
  secs: string;
};

const pad = (num: number) => String(num).padStart(2, '0');

/** One "tick" of the countdown — same maths as the original script.js. */
export function computeCountdown(): CountdownState {
  const now = getGhanaNow();
  const target = getNextSabbathStart();
  let diff = target.getTime() - now.getTime();

  // Sabbath lasts roughly 24 hours. Once we're inside that window, diff goes
  // negative and we say "Sabbath is here".
  if (diff <= 0 && diff > -24 * 60 * 60 * 1000) {
    return { status: 'Sabbath is here — enjoy the rest', days: '00', hours: '00', mins: '00', secs: '00' };
  }
  if (diff <= 0) diff = target.setUTCDate(target.getUTCDate() + 7) - now.getTime(); // safety fallback

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  return { status: 'Sabbath begins in', days: pad(days), hours: pad(hours), mins: pad(mins), secs: pad(secs) };
}

/**
 * Determines which schedule card (if any) should be highlighted based on
 * the current day and time in Ghana Time (Africa/Accra).
 * Returns the card index (0-3) or -1 when no activity is ongoing.
 * - Saturday: Sabbath School (9:00 AM - 10:30 AM)
 * - Saturday: Divine Service (10:30 AM - 12:30 PM approx)
 * - Wednesday: Vespers (6:30 PM - 8:00 PM approx)
 * - Friday: Adventist Youth (AY) (7:00 PM - 9:00 PM approx)
 */
export function getCurrentScheduleIndex(): number {
  const day = getGhanaDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const timeInMinutes = getGhanaHour() * 60 + getGhanaMinute();

  const SATURDAY = 6;
  const WEDNESDAY = 3;
  const FRIDAY = 5;

  if (day === SATURDAY) {
    if (timeInMinutes >= 540 && timeInMinutes < 630) return 0; // Sabbath School
    if (timeInMinutes >= 630 && timeInMinutes < 750) return 1; // Divine Service
  } else if (day === WEDNESDAY) {
    if (timeInMinutes >= 1110 && timeInMinutes < 1200) return 2; // Vespers
  } else if (day === FRIDAY) {
    if (timeInMinutes >= 1140 && timeInMinutes < 1260) return 3; // AY
  }
  return -1;
}
