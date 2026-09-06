import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSalesRecords } from '../hooks/useSalesRecords';
import { type SalesData } from '../types';

const STORAGE_KEY = 'sales-tracker-data';

beforeEach(() => {
  localStorage.clear();
});

/** Seeds localStorage with the given SalesData and mounts the hook. */
function mountWithData(dateKey: string, data: SalesData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return renderHook(() => useSalesRecords(dateKey));
}

function makeProduct(over: {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isManualMode?: boolean;
}) {
  return {
    isManualMode: false,
    ...over,
  };
}

describe('getMonthlyStats - basic computation', () => {
  it('aggregates revenue, items, and record count across multiple days', () => {
    const data: SalesData = {
      '2026-07-26': {
        date: '2026-07-26',
        products: [
          makeProduct({ id: 'a', name: '苹果', quantity: 2, unitPrice: 5, totalPrice: 10 }),
          makeProduct({ id: 'b', name: '香蕉', quantity: 3, unitPrice: 4, totalPrice: 12 }),
        ],
      },
      '2026-07-27': {
        date: '2026-07-27',
        products: [
          makeProduct({ id: 'c', name: '橙子', quantity: 1, unitPrice: 100, totalPrice: 100 }),
        ],
      },
    };
    const { result } = mountWithData('2026-07-26', data);
    const stats = result.current.getMonthlyStats('2026-07');

    expect(stats.yearMonth).toBe('2026-07');
    expect(stats.recordCount).toBe(2);
    expect(stats.totalRevenue).toBe(122); // 22 + 100
    expect(stats.totalItems).toBe(6); // (2+3) + 1
    expect(stats.averageRevenue).toBe(61); // 122 / 2
  });

  it('builds per-day dailyData with revenue, productCount, and totalQuantity', () => {
    const data: SalesData = {
      '2026-07-26': {
        date: '2026-07-26',
        products: [
          makeProduct({ id: 'a', name: '苹果', quantity: 2, unitPrice: 5, totalPrice: 10 }),
          makeProduct({ id: 'b', name: '香蕉', quantity: 3, unitPrice: 4, totalPrice: 12 }),
        ],
      },
      '2026-07-27': {
        date: '2026-07-27',
        products: [
          makeProduct({ id: 'c', name: '橙子', quantity: 1, unitPrice: 100, totalPrice: 100 }),
        ],
      },
    };
    const { result } = mountWithData('2026-07-26', data);
    const stats = result.current.getMonthlyStats('2026-07');

    expect(stats.dailyData).toHaveLength(2);
    expect(stats.dailyData[0]).toEqual({
      date: '2026-07-26',
      revenue: 22,
      productCount: 2,
      totalQuantity: 5,
    });
    expect(stats.dailyData[1]).toEqual({
      date: '2026-07-27',
      revenue: 100,
      productCount: 1,
      totalQuantity: 1,
    });
  });

  it('sorts dailyData chronologically (ascending by date)', () => {
    // Seed out of order to verify sorting.
    const data: SalesData = {
      '2026-07-31': {
        date: '2026-07-31',
        products: [makeProduct({ id: 'd', name: '梨', quantity: 1, unitPrice: 6, totalPrice: 6 })],
      },
      '2026-07-01': {
        date: '2026-07-01',
        products: [makeProduct({ id: 'a', name: '苹果', quantity: 1, unitPrice: 5, totalPrice: 5 })],
      },
      '2026-07-15': {
        date: '2026-07-15',
        products: [makeProduct({ id: 'b', name: '香蕉', quantity: 1, unitPrice: 3, totalPrice: 3 })],
      },
    };
    const { result } = mountWithData('2026-07-01', data);
    const stats = result.current.getMonthlyStats('2026-07');
    expect(stats.dailyData.map((d) => d.date)).toEqual([
      '2026-07-01',
      '2026-07-15',
      '2026-07-31',
    ]);
  });
});

describe('getMonthlyStats - max revenue', () => {
  it('identifies the peak revenue day and its date', () => {
    const data: SalesData = {
      '2026-07-26': {
        date: '2026-07-26',
        products: [makeProduct({ id: 'a', name: '苹果', quantity: 2, unitPrice: 5, totalPrice: 10 })],
      },
      '2026-07-27': {
        date: '2026-07-27',
        products: [makeProduct({ id: 'b', name: '橙子', quantity: 1, unitPrice: 100, totalPrice: 100 })],
      },
      '2026-07-28': {
        date: '2026-07-28',
        products: [makeProduct({ id: 'c', name: '梨', quantity: 1, unitPrice: 50, totalPrice: 50 })],
      },
    };
    const { result } = mountWithData('2026-07-26', data);
    const stats = result.current.getMonthlyStats('2026-07');
    expect(stats.maxRevenue).toBe(100);
    expect(stats.maxRevenueDate).toBe('2026-07-27');
  });

  it('on a tie, returns the first peak day (strict greater-than)', () => {
    const data: SalesData = {
      '2026-07-01': {
        date: '2026-07-01',
        products: [makeProduct({ id: 'a', name: '苹果', quantity: 1, unitPrice: 50, totalPrice: 50 })],
      },
      '2026-07-02': {
        date: '2026-07-02',
        products: [makeProduct({ id: 'b', name: '橙子', quantity: 1, unitPrice: 50, totalPrice: 50 })],
      },
    };
    const { result } = mountWithData('2026-07-01', data);
    const stats = result.current.getMonthlyStats('2026-07');
    expect(stats.maxRevenue).toBe(50);
    // First day wins because the loop uses strict ">".
    expect(stats.maxRevenueDate).toBe('2026-07-01');
  });

  it('returns a non-null date when records exist even if all revenue is 0', () => {
    // Spec: maxRevenueDate is "null if no records". With records present it
    // should resolve to a day, even when every day's revenue is 0.
    const data: SalesData = {
      '2026-07-26': {
        date: '2026-07-26',
        products: [makeProduct({ id: 'a', name: '苹果', quantity: 2, unitPrice: 0, totalPrice: 0 })],
      },
    };
    const { result } = mountWithData('2026-07-26', data);
    const stats = result.current.getMonthlyStats('2026-07');
    expect(stats.recordCount).toBe(1);
    expect(stats.maxRevenue).toBe(0);
    expect(stats.maxRevenueDate).toBe('2026-07-26');
  });
});

describe('getMonthlyStats - month filtering & isolation', () => {
  it('excludes records from other months', () => {
    const data: SalesData = {
      '2026-07-26': {
        date: '2026-07-26',
        products: [makeProduct({ id: 'a', name: '苹果', quantity: 2, unitPrice: 5, totalPrice: 10 })],
      },
      '2026-08-01': {
        date: '2026-08-01',
        products: [makeProduct({ id: 'b', name: '西瓜', quantity: 1, unitPrice: 20, totalPrice: 20 })],
      },
      '2026-06-30': {
        date: '2026-06-30',
        products: [makeProduct({ id: 'c', name: '桃子', quantity: 1, unitPrice: 8, totalPrice: 8 })],
      },
    };
    const { result } = mountWithData('2026-07-26', data);
    const stats = result.current.getMonthlyStats('2026-07');
    expect(stats.recordCount).toBe(1);
    expect(stats.totalRevenue).toBe(10);
    expect(stats.dailyData[0].date).toBe('2026-07-26');
  });

  it('excludes days whose product list is empty', () => {
    const data: SalesData = {
      '2026-07-25': { date: '2026-07-25', products: [] }, // empty — excluded
      '2026-07-26': {
        date: '2026-07-26',
        products: [makeProduct({ id: 'a', name: '苹果', quantity: 2, unitPrice: 5, totalPrice: 10 })],
      },
      '2026-07-27': { date: '2026-07-27', products: [] }, // empty — excluded
    };
    const { result } = mountWithData('2026-07-26', data);
    const stats = result.current.getMonthlyStats('2026-07');
    expect(stats.recordCount).toBe(1);
    expect(stats.dailyData.map((d) => d.date)).toEqual(['2026-07-26']);
  });

  it('handles year boundaries: December vs January are separate months', () => {
    const data: SalesData = {
      '2026-12-31': {
        date: '2026-12-31',
        products: [makeProduct({ id: 'a', name: '苹果', quantity: 1, unitPrice: 5, totalPrice: 5 })],
      },
      '2027-01-01': {
        date: '2027-01-01',
        products: [makeProduct({ id: 'b', name: '橙子', quantity: 1, unitPrice: 10, totalPrice: 10 })],
      },
    };
    const { result } = mountWithData('2026-12-31', data);
    const decStats = result.current.getMonthlyStats('2026-12');
    expect(decStats.recordCount).toBe(1);
    expect(decStats.totalRevenue).toBe(5);

    const janStats = result.current.getMonthlyStats('2027-01');
    expect(janStats.recordCount).toBe(1);
    expect(janStats.totalRevenue).toBe(10);
  });
});

describe('getMonthlyStats - empty & boundary cases', () => {
  it('returns zeros and null maxRevenueDate for a month with no records', () => {
    const data: SalesData = {
      '2026-08-01': {
        date: '2026-08-01',
        products: [makeProduct({ id: 'a', name: '苹果', quantity: 1, unitPrice: 5, totalPrice: 5 })],
      },
    };
    const { result } = mountWithData('2026-08-01', data);
    const stats = result.current.getMonthlyStats('2026-07'); // July has nothing
    expect(stats.yearMonth).toBe('2026-07');
    expect(stats.dailyData).toEqual([]);
    expect(stats.totalRevenue).toBe(0);
    expect(stats.averageRevenue).toBe(0);
    expect(stats.maxRevenue).toBe(0);
    expect(stats.maxRevenueDate).toBeNull();
    expect(stats.totalItems).toBe(0);
    expect(stats.recordCount).toBe(0);
  });

  it('handles a single-day month correctly', () => {
    const data: SalesData = {
      '2026-07-15': {
        date: '2026-07-15',
        products: [makeProduct({ id: 'a', name: '苹果', quantity: 4, unitPrice: 6, totalPrice: 24 })],
      },
    };
    const { result } = mountWithData('2026-07-15', data);
    const stats = result.current.getMonthlyStats('2026-07');
    expect(stats.recordCount).toBe(1);
    expect(stats.totalRevenue).toBe(24);
    expect(stats.averageRevenue).toBe(24);
    expect(stats.maxRevenue).toBe(24);
    expect(stats.maxRevenueDate).toBe('2026-07-15');
    expect(stats.totalItems).toBe(4);
  });

  it('respects manually-set totalPrice when summing revenue', () => {
    const data: SalesData = {
      '2026-07-26': {
        date: '2026-07-26',
        products: [
          makeProduct({
            id: 'a',
            name: '苹果',
            quantity: 2,
            unitPrice: 5,
            totalPrice: 99, // manual, not 10
            isManualMode: true,
          }),
        ],
      },
    };
    const { result } = mountWithData('2026-07-26', data);
    const stats = result.current.getMonthlyStats('2026-07');
    expect(stats.totalRevenue).toBe(99);
    expect(stats.totalItems).toBe(2); // quantity still summed
  });

  it('treats missing/undefined totalPrice as 0 (no NaN)', () => {
    const data: SalesData = {
      '2026-07-26': {
        date: '2026-07-26',
        products: [
          // @ts-expect-error -- simulate a malformed record
          { id: 'a', name: '苹果', quantity: 2, unitPrice: 5, isManualMode: false },
        ],
      },
    };
    const { result } = mountWithData('2026-07-26', data);
    const stats = result.current.getMonthlyStats('2026-07');
    expect(stats.totalRevenue).toBe(0);
    expect(stats.totalItems).toBe(2);
    expect(Number.isNaN(stats.totalRevenue)).toBe(false);
  });
});
