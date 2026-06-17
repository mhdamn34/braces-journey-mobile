/**
 * Date helpers for the Visits / Appointments flow.
 *
 * Appointments are stored as ISO strings (`YYYY-MM-DD`).  We do not use
 * `new Date()` for parsing because that constructor is locale-fragile;
 * instead we split the string and build a Date in local time manually.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Parse a `YYYY-MM-DD` string into a local Date.  Returns `null` if the
 * string is not a valid ISO date.
 */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Format an ISO date string for display on cards / detail screens.
 * Example: "Fri, 19 Jun 2026"
 */
export function formatAppointmentDate(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return value;

  const day = DAYS[date.getDay()];
  const month = MONTHS[date.getMonth()];
  return `${day}, ${date.getDate()} ${month} ${date.getFullYear()}`;
}

/**
 * Build the short human label used on the next-visit hero card.
 * Example: "Fri · 19 Jun"
 */
export function formatAppointmentShort(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return value;

  const day = DAYS[date.getDay()];
  const month = MONTHS[date.getMonth()];
  return `${day} · ${date.getDate()} ${month}`;
}

/**
 * Compute the number of full days between today (00:00 local) and the
 * supplied ISO date.  Positive = future, negative = past, 0 = today.
 */
export function daysFromToday(value: string): number | null {
  const date = parseIsoDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = date.getTime() - today.getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Pretty "in N days" / "today" / "N days ago" label.
 */
export function relativeDayLabel(value: string): string | null {
  const days = daysFromToday(value);
  if (days === null) return null;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/**
 * Today as an ISO `YYYY-MM-DD` string.  Used as a min date hint in the
 * date input and to seed the wizard default.
 */
export function todayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString().padStart(4, '0');
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Add `n` days to today and return the result as ISO string.  Used for
 * the "Tomorrow" and "+1 week" suggestion chips in the wizard.
 */
export function todayPlusIso(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const yyyy = now.getFullYear().toString().padStart(4, '0');
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Lightweight time-string normaliser.  Accepts "10:00", "10:00 AM",
 * "9am", etc. and returns a tidy "10:00 AM" / "9:00 AM" string or
 * `null` if the input cannot be parsed.
 */
export function formatTimeInput(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const compact = trimmed.replace(/\s+/g, '');
  const match = /^(\d{1,2})(?::(\d{2}))?(am|pm)?$/.exec(compact);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  const meridiem = match[3];

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
  } else if (hour < 8) {
    // Heuristic: bare numbers like "7" are assumed PM (evening slot).
    hour += 12;
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}