import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportButton from '../components/ExportButton';
import { type Product, type MonthlyStats } from '../types';

// ---------------------------------------------------------------------------
// Mock the xlsx (SheetJS) module so no real file is written to disk.
// vi.hoisted ensures the spies exist before the hoisted vi.mock factory runs.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  jsonToSheet: vi.fn(() => ({ '!cols': [] })),
  bookNew: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: mocks.jsonToSheet,
    book_new: mocks.bookNew,
    book_append_sheet: mocks.bookAppendSheet,
  },
  writeFile: mocks.writeFile,
}));

beforeEach(() => {
  mocks.jsonToSheet.mockClear();
  mocks.bookNew.mockClear();
  mocks.bookAppendSheet.mockClear();
  mocks.writeFile.mockClear();
});

function makeProduct(over: Partial<Product>): Product {
  return {
    id: 'x',
    name: '',
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
    isManualMode: false,
    ...over,
  };
}

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

/** Opens the export menu by clicking the main button. */
function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /导出 Excel/ }));
}

describe('ExportButton - daily detail export', () => {
  it('assembles daily rows with 序号, 商品名称, 数量, 单价, 总价', () => {
    const products = [
      makeProduct({ id: '1', name: '苹果', quantity: 2, unitPrice: 5, totalPrice: 10 }),
      makeProduct({ id: '2', name: '香蕉', quantity: 3, unitPrice: 4, totalPrice: 12 }),
    ];
    render(
      <ExportButton
        products={products}
        selectedDate="2026-07-26"
        monthlyStats={makeStats()}
      />
    );
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /导出当日明细/ }));

    expect(mocks.jsonToSheet).toHaveBeenCalledTimes(1);
    const [rows, options] = mocks.jsonToSheet.mock.calls[0];
    expect(rows).toEqual([
      { 序号: 1, 商品名称: '苹果', 数量: 2, 单价: 5, 总价: 10 },
      { 序号: 2, 商品名称: '香蕉', 数量: 3, 单价: 4, 总价: 12 },
    ]);
    expect(options).toEqual({
      header: ['序号', '商品名称', '数量', '单价', '总价'],
    });
  });

  it('generates the daily filename as 营业额记录_<date>.xlsx', () => {
    const products = [makeProduct({ id: '1', name: '苹果', quantity: 1, unitPrice: 5, totalPrice: 5 })];
    render(
      <ExportButton
        products={products}
        selectedDate="2026-07-26"
        monthlyStats={makeStats()}
      />
    );
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /导出当日明细/ }));

    expect(mocks.writeFile).toHaveBeenCalledTimes(1);
    const [workbook, filename] = mocks.writeFile.mock.calls[0];
    expect(workbook).toBeDefined();
    expect(filename).toBe('营业额记录_2026-07-26.xlsx');
  });

  it('appends a sheet named "当日明细" for daily export', () => {
    const products = [makeProduct({ id: '1', name: '苹果', quantity: 1, unitPrice: 5, totalPrice: 5 })];
    render(
      <ExportButton
        products={products}
        selectedDate="2026-07-26"
        monthlyStats={makeStats()}
      />
    );
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /导出当日明细/ }));

    expect(mocks.bookAppendSheet).toHaveBeenCalledTimes(1);
    const sheetName = mocks.bookAppendSheet.mock.calls[0][2];
    expect(sheetName).toBe('当日明细');
  });
});

describe('ExportButton - monthly summary export', () => {
  it('assembles monthly rows with 序号, 日期, 商品种类数, 总件数, 当日营业额', () => {
    const stats = makeStats({
      yearMonth: '2026-07',
      recordCount: 2,
      dailyData: [
        { date: '2026-07-26', revenue: 22, productCount: 2, totalQuantity: 5 },
        { date: '2026-07-27', revenue: 100, productCount: 1, totalQuantity: 1 },
      ],
    });
    render(
      <ExportButton
        products={[]}
        selectedDate="2026-07-26"
        monthlyStats={stats}
      />
    );
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /导出月度汇总/ }));

    // Two sheets are built: the daily breakdown + the summary metrics.
    expect(mocks.jsonToSheet).toHaveBeenCalledTimes(2);

    const [dailyRows, dailyOptions] = mocks.jsonToSheet.mock.calls[0];
    expect(dailyRows).toEqual([
      { 序号: 1, 日期: '2026-07-26', 商品种类数: 2, 总件数: 5, 当日营业额: 22 },
      { 序号: 2, 日期: '2026-07-27', 商品种类数: 1, 总件数: 1, 当日营业额: 100 },
    ]);
    expect(dailyOptions).toEqual({
      header: ['序号', '日期', '商品种类数', '总件数', '当日营业额'],
    });
  });

  it('includes a summary metrics sheet with month totals', () => {
    const stats = makeStats({
      yearMonth: '2026-07',
      recordCount: 1,
      totalRevenue: 122,
      averageRevenue: 61,
      maxRevenue: 100,
      maxRevenueDate: '2026-07-27',
      totalItems: 6,
      dailyData: [{ date: '2026-07-27', revenue: 100, productCount: 1, totalQuantity: 1 }],
    });
    render(
      <ExportButton
        products={[]}
        selectedDate="2026-07-27"
        monthlyStats={stats}
      />
    );
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /导出月度汇总/ }));

    // Second json_to_sheet call builds the summary sheet.
    const summaryRows = mocks.jsonToSheet.mock.calls[1][0] as Array<{
      指标: string;
      值: string | number;
    }>;
    const asMap = Object.fromEntries(summaryRows.map((r) => [r.指标, r.值]));
    expect(asMap['月份']).toBe('2026-07');
    expect(asMap['总营业额']).toBe(122);
    expect(asMap['最高营业额']).toBe(100);
    expect(asMap['最高营业额日期']).toBe('2026-07-27');
    expect(asMap['商品销售总件数']).toBe(6);
    expect(asMap['有记录天数']).toBe(1);
  });

  it('generates the monthly filename as 营业额月度汇总_<yearMonth>.xlsx', () => {
    const stats = makeStats({
      yearMonth: '2026-07',
      recordCount: 1,
      dailyData: [{ date: '2026-07-26', revenue: 10, productCount: 1, totalQuantity: 1 }],
    });
    render(
      <ExportButton
        products={[]}
        selectedDate="2026-07-26"
        monthlyStats={stats}
      />
    );
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /导出月度汇总/ }));

    expect(mocks.writeFile).toHaveBeenCalledTimes(1);
    const filename = mocks.writeFile.mock.calls[0][1];
    expect(filename).toBe('营业额月度汇总_2026-07.xlsx');
  });

  it('shows "无" for the peak date when there are no records in the summary', () => {
    // recordCount 0 but we force-call the monthly export path by giving data.
    const stats = makeStats({
      yearMonth: '2026-07',
      recordCount: 1,
      maxRevenueDate: null,
      dailyData: [{ date: '2026-07-26', revenue: 0, productCount: 1, totalQuantity: 0 }],
    });
    render(
      <ExportButton
        products={[]}
        selectedDate="2026-07-26"
        monthlyStats={stats}
      />
    );
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /导出月度汇总/ }));

    const summaryRows = mocks.jsonToSheet.mock.calls[1][0] as Array<{
      指标: string;
      值: string | number;
    }>;
    const peakRow = summaryRows.find((r) => r.指标 === '最高营业额日期');
    expect(peakRow?.值).toBe('无');
  });
});

describe('ExportButton - disabled states & empty data', () => {
  it('disables the main button when there is no daily and no monthly data', () => {
    render(
      <ExportButton
        products={[]}
        selectedDate="2026-07-26"
        monthlyStats={makeStats({ recordCount: 0 })}
      />
    );
    expect(screen.getByRole('button', { name: /导出 Excel/ })).toBeDisabled();
  });

  it('enables the main button when there is daily data but no monthly data', () => {
    const products = [makeProduct({ id: '1', name: '苹果', quantity: 1, unitPrice: 5, totalPrice: 5 })];
    render(
      <ExportButton
        products={products}
        selectedDate="2026-07-26"
        monthlyStats={makeStats({ recordCount: 0 })}
      />
    );
    expect(screen.getByRole('button', { name: /导出 Excel/ })).toBeEnabled();
  });

  it('enables the main button when there is monthly data but no daily data', () => {
    const stats = makeStats({
      recordCount: 1,
      dailyData: [{ date: '2026-07-26', revenue: 10, productCount: 1, totalQuantity: 1 }],
    });
    render(
      <ExportButton
        products={[]}
        selectedDate="2026-07-26"
        monthlyStats={stats}
      />
    );
    expect(screen.getByRole('button', { name: /导出 Excel/ })).toBeEnabled();
  });

  it('disables the daily menu item when there is no daily data', () => {
    const stats = makeStats({
      recordCount: 1,
      dailyData: [{ date: '2026-07-26', revenue: 10, productCount: 1, totalQuantity: 1 }],
    });
    render(
      <ExportButton
        products={[]}
        selectedDate="2026-07-26"
        monthlyStats={stats}
      />
    );
    openMenu();
    const dailyItem = screen.getByRole('menuitem', { name: /导出当日明细/ });
    // MUI MenuItem renders a <li>, which has no native `disabled` attribute;
    // instead it exposes `aria-disabled="true"`.
    expect(dailyItem).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables the monthly menu item when there is no monthly data', () => {
    const products = [makeProduct({ id: '1', name: '苹果', quantity: 1, unitPrice: 5, totalPrice: 5 })];
    render(
      <ExportButton
        products={products}
        selectedDate="2026-07-26"
        monthlyStats={makeStats({ recordCount: 0 })}
      />
    );
    openMenu();
    const monthlyItem = screen.getByRole('menuitem', { name: /导出月度汇总/ });
    // MUI MenuItem renders a <li>, which has no native `disabled` attribute;
    // instead it exposes `aria-disabled="true"`.
    expect(monthlyItem).toHaveAttribute('aria-disabled', 'true');
  });
});
