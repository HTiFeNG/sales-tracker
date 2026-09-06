import { describe, it, expect } from 'vitest';
import {
  getYearMonth,
  getMonthKey,
  getDaysInMonth,
} from '../types';

describe('getYearMonth', () => {
  it('extracts the YYYY-MM prefix from an ISO date string', () => {
    expect(getYearMonth('2026-07-26')).toBe('2026-07');
  });

  it('handles single-digit months', () => {
    expect(getYearMonth('2026-01-05')).toBe('2026-01');
  });

  it('handles December dates', () => {
    expect(getYearMonth('2026-12-31')).toBe('2026-12');
  });
});

describe('getMonthKey', () => {
  it('returns the same value as getYearMonth (YYYY-MM prefix)', () => {
    expect(getMonthKey('2026-07-26')).toBe('2026-07');
    expect(getMonthKey('2026-07-26')).toBe(getYearMonth('2026-07-26'));
  });
});

describe('getDaysInMonth', () => {
  it('returns 31 for a 31-day month (January)', () => {
    expect(getDaysInMonth(2026, 1)).toBe(31);
  });

  it('returns 30 for a 30-day month (April)', () => {
    expect(getDaysInMonth(2026, 4)).toBe(30);
  });

  it('returns 28 for February in a non-leap year', () => {
    expect(getDaysInMonth(2025, 2)).toBe(28);
  });

  it('returns 29 for February in a leap year', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2028, 2)).toBe(29);
  });

  it('returns 31 for December', () => {
    expect(getDaysInMonth(2026, 12)).toBe(31);
  });
});
