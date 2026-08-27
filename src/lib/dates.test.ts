import {
  addMonthsIso,
  daysBetween,
  formatFullDate,
  formatMonthName,
  formatMonthYear,
  formatShortDate,
  isValidIsoDate,
  isValidTime,
  monthsBetween,
  parseExifDate,
} from '@/lib/dates';

describe('monthsBetween', () => {
  it('counts whole months, day-aware', () => {
    expect(monthsBetween('2026-02-01', '2026-08-28')).toBe(6);
    expect(monthsBetween('2026-02-15', '2026-08-14')).toBe(5); // day not reached yet
    expect(monthsBetween('2026-02-15', '2026-08-15')).toBe(6);
    expect(monthsBetween('2026-02-01', '2026-02-20')).toBe(0);
    expect(monthsBetween('2025-11-10', '2026-01-10')).toBe(2); // across year end
  });
  it('never returns negative', () => {
    expect(monthsBetween('2026-08-01', '2026-02-01')).toBe(0);
  });
});

describe('daysBetween', () => {
  it('counts days', () => {
    expect(daysBetween('2026-08-01', '2026-08-28')).toBe(27);
    expect(daysBetween('2026-08-28', '2026-08-01')).toBe(-27);
  });
});

describe('addMonthsIso', () => {
  it('adds months', () => {
    expect(addMonthsIso('2026-02-05', 6)).toBe('2026-08-05');
    expect(addMonthsIso('2026-11-05', 3)).toBe('2027-02-05');
  });
  it('clamps day overflow', () => {
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28');
  });
});

describe('validation', () => {
  it('validates ISO dates', () => {
    expect(isValidIsoDate('2026-08-28')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('28-08-2026')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
  });
  it('validates times', () => {
    expect(isValidTime('09:30')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:30')).toBe(false);
  });
});

describe('formatting', () => {
  it('formats month and dates', () => {
    expect(formatMonthName('2026-08-25')).toBe('August');
    expect(formatMonthYear('2026-08-25')).toBe('August 2026');
    expect(formatShortDate('2026-08-25')).toBe('25 Aug');
    expect(formatFullDate('2026-08-25')).toBe('25 August 2026');
  });
});

describe('parseExifDate', () => {
  it('parses EXIF datetimes', () => {
    expect(parseExifDate('2026:05:24 10:12:00')).toBe('2026-05-24');
  });
  it('returns undefined for garbage', () => {
    expect(parseExifDate(undefined)).toBeUndefined();
    expect(parseExifDate('not a date')).toBeUndefined();
  });
});
