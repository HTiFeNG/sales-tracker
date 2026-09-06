import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  createEmptyProduct,
  generateId,
  formatDateKey,
  parseDateKey,
} from '../types';

describe('formatCurrency', () => {
  it('formats zero as ¥0.00', () => {
    expect(formatCurrency(0)).toBe('¥0.00');
  });

  it('formats a value with grouping and 2 decimals', () => {
    expect(formatCurrency(1234.5)).toBe('¥1,234.50');
  });

  it('rounds to 2 decimal places (half up)', () => {
    expect(formatCurrency(1234.567)).toBe('¥1,234.57');
  });

  it('formats a large integer with grouping', () => {
    expect(formatCurrency(1000000)).toBe('¥1,000,000.00');
  });

  it('formats a small fractional value', () => {
    expect(formatCurrency(0.1)).toBe('¥0.10');
  });
});

describe('createEmptyProduct', () => {
  it('returns a product with sensible defaults', () => {
    const p = createEmptyProduct();
    expect(p.id).toEqual(expect.any(String));
    expect(p.id.length).toBeGreaterThan(0);
    expect(p.name).toBe('');
    expect(p.quantity).toBe(1);
    expect(p.unitPrice).toBe(0);
    expect(p.totalPrice).toBe(0);
    expect(p.isManualMode).toBe(false);
  });

  it('generates a unique id on each call', () => {
    const a = createEmptyProduct();
    const b = createEmptyProduct();
    expect(a.id).not.toBe(b.id);
  });
});

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('produces unique values across many calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('formatDateKey', () => {
  it('formats a date with zero-padded month and day', () => {
    expect(formatDateKey(new Date(2026, 6, 26))).toBe('2026-07-26');
  });

  it('pads single-digit month and day', () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('handles the last day of the year', () => {
    expect(formatDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('parseDateKey', () => {
  it('parses an ISO date string into a local Date', () => {
    const d = parseDateKey('2026-07-26');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July = 6
    expect(d.getDate()).toBe(26);
  });

  it('parses single-digit month/day correctly', () => {
    const d = parseDateKey('2026-01-05');
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
  });

  it('is the inverse of formatDateKey', () => {
    const original = new Date(2026, 2, 9);
    const roundTrip = parseDateKey(formatDateKey(original));
    expect(roundTrip.getFullYear()).toBe(2026);
    expect(roundTrip.getMonth()).toBe(2);
    expect(roundTrip.getDate()).toBe(9);
  });
});
