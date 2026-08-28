const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = parts(value);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function monthsBetween(startIso: string, endIso: string): number {
  const [y1, m1, d1] = parts(startIso);
  const [y2, m2, d2] = parts(endIso);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) months -= 1;
  return Math.max(0, months);
}

export function daysBetween(aIso: string, bIso: string): number {
  const [y1, m1, d1] = parts(aIso);
  const [y2, m2, d2] = parts(bIso);
  const a = Date.UTC(y1, m1 - 1, d1, 12);
  const b = Date.UTC(y2, m2 - 1, d2, 12);
  return Math.round((b - a) / 86_400_000);
}

export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  const total = y * 12 + (m - 1) + months;
  const ty = Math.floor(total / 12);
  const tm = total % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const td = Math.min(d, lastDay);
  return `${ty}-${String(tm + 1).padStart(2, '0')}-${String(td).padStart(2, '0')}`;
}

export function formatMonthName(iso: string): string {
  return MONTHS[parts(iso)[1] - 1];
}

export function formatMonthYear(iso: string): string {
  const [y, m] = parts(iso);
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatShortDate(iso: string): string {
  const [, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

export function formatFullDate(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function parseExifDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = /^(\d{4}):(\d{2}):(\d{2})/.exec(value);
  if (!match) return undefined;
  const iso = `${match[1]}-${match[2]}-${match[3]}`;
  return isValidIsoDate(iso) ? iso : undefined;
}
