import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MonthlyChart from '../components/MonthlyChart';
import { type MonthlyStats, formatCurrency } from '../types';

/**
 * Recharts ResponsiveContainer relies on ResizeObserver, which jsdom does not
 * implement. Provide a minimal stub so the component mounts without throwing.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Builds a MonthlyStats object with sensible defaults, overridable per test. */
function makeStats(over: Partial<MonthlyStats>): MonthlyStats {
  return {
    yearMonth: '2026-07',
    dailyData: [],
    totalRevenue: 0,
    averageRevenue: 0,
    maxRevenue: 0,
    maxRevenueDate: null,
    totalItems: 0,
    recordCount: 0,
    ...over,
  };
}

describe('MonthlyChart - month label & navigation', () => {
  it('renders the human-readable month label (2026年7月)', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <MonthlyChart
        stats={makeStats({ yearMonth: '2026-07', recordCount: 1, dailyData: [{ date: '2026-07-26', revenue: 10, productCount: 1, totalQuantity: 1 }] })}
        onPrevMonth={onPrev}
        onNextMonth={onNext}
      />
    );
    expect(screen.getByText(/月度统计/)).toBeInTheDocument();
    // The label lives inside an <h2> alongside "月度统计 — ", so match by regex.
    expect(screen.getByText(/2026年7月/)).toBeInTheDocument();
  });

  it('renders prev/next navigation buttons with accessible labels', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <MonthlyChart stats={makeStats({ recordCount: 1 })} onPrevMonth={onPrev} onNextMonth={onNext} />
    );
    expect(screen.getByRole('button', { name: '上一月' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一月' })).toBeInTheDocument();
  });

  it('calls onPrevMonth when the previous-month button is clicked', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <MonthlyChart stats={makeStats({ recordCount: 1 })} onPrevMonth={onPrev} onNextMonth={onNext} />
    );
    fireEvent.click(screen.getByRole('button', { name: '上一月' }));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('calls onNextMonth when the next-month button is clicked', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <MonthlyChart stats={makeStats({ recordCount: 1 })} onPrevMonth={onPrev} onNextMonth={onNext} />
    );
    fireEvent.click(screen.getByRole('button', { name: '下一月' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();
  });
});

describe('MonthlyChart - summary cards (with data)', () => {
  it('renders total monthly revenue, daily average, peak revenue, and total items', () => {
    const stats = makeStats({
      yearMonth: '2026-07',
      recordCount: 2,
      totalRevenue: 122,
      averageRevenue: 61,
      maxRevenue: 100,
      maxRevenueDate: '2026-07-27',
      totalItems: 6,
      dailyData: [
        { date: '2026-07-26', revenue: 22, productCount: 2, totalQuantity: 5 },
        { date: '2026-07-27', revenue: 100, productCount: 1, totalQuantity: 1 },
      ],
    });
    render(<MonthlyChart stats={stats} onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />);

    // Summary metric labels are present.
    expect(screen.getByText('当月总营业额')).toBeInTheDocument();
    expect(screen.getByText('日均营业额')).toBeInTheDocument();
    expect(screen.getByText('最高营业额日')).toBeInTheDocument();
    expect(screen.getByText('商品销售总件数')).toBeInTheDocument();

    // The currency values are rendered via formatCurrency.
    expect(screen.getByText(formatCurrency(122))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(61))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(100))).toBeInTheDocument();
    // Total items is a plain number.
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders the peak day as a human-readable date (7月27日)', () => {
    const stats = makeStats({
      recordCount: 1,
      maxRevenue: 100,
      maxRevenueDate: '2026-07-27',
      dailyData: [{ date: '2026-07-27', revenue: 100, productCount: 1, totalQuantity: 1 }],
    });
    render(<MonthlyChart stats={stats} onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />);
    expect(screen.getByText('7月27日')).toBeInTheDocument();
  });
});

describe('MonthlyChart - empty state', () => {
  it('shows the "no records" message when the month has no data', () => {
    const stats = makeStats({ yearMonth: '2026-08', recordCount: 0 });
    render(<MonthlyChart stats={stats} onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />);
    expect(screen.getByText('2026-08 暂无营业记录')).toBeInTheDocument();
  });

  it('does not render summary cards when there is no data', () => {
    const stats = makeStats({ yearMonth: '2026-08', recordCount: 0 });
    render(<MonthlyChart stats={stats} onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />);
    expect(screen.queryByText('当月总营业额')).not.toBeInTheDocument();
    expect(screen.queryByText('日均营业额')).not.toBeInTheDocument();
  });

  it('still renders navigation buttons in the empty state', () => {
    const stats = makeStats({ yearMonth: '2026-08', recordCount: 0 });
    render(<MonthlyChart stats={stats} onPrevMonth={vi.fn()} onNextMonth={vi.fn()} />);
    expect(screen.getByRole('button', { name: '上一月' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一月' })).toBeInTheDocument();
  });
});
