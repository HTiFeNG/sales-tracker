/**
 * Type definitions for the Sales Tracker application.
 */

/**
 * Represents a single product entry within a daily sales record.
 */
export interface Product {
  /** Unique identifier for the product row. */
  id: string;
  /** Product name entered by the user. */
  name: string;
  /** Quantity of the product sold. Must be >= 0. */
  quantity: number;
  /** Unit price in yuan (CNY). Must be >= 0. */
  unitPrice: number;
  /** Total price in yuan (CNY). Either auto-calculated or manually set. */
  totalPrice: number;
  /**
   * Whether this row is in "manual mode".
   * When true, totalPrice is NOT auto-linked to unitPrice × quantity.
   * When the user edits unitPrice or quantity, this resets to false (re-link).
   */
  isManualMode: boolean;
}

/**
 * Represents all product records for a single day.
 */
export interface DailyRecord {
  /** Date string in ISO format: YYYY-MM-DD. */
  date: string;
  /** List of product entries for this day. */
  products: Product[];
}

/**
 * Top-level data structure stored in localStorage.
 * Maps each date to its corresponding daily record.
 */
export type SalesData = Record<string, DailyRecord>;

/**
 * Represents a "favorite" (frequently-used) product for quick selection.
 * Stored separately in localStorage under key "sales-tracker-favorites".
 */
export interface FavoriteProduct {
  /** Unique identifier for the favorite entry. */
  id: string;
  /** Product name (used as the display label and search key). */
  name: string;
  /** Default unit price in yuan (CNY), auto-filled when selected. */
  defaultUnitPrice: number;
}

/**
 * Aggregated data for a single day within a monthly summary.
 */
export interface MonthlyDayData {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  /** Total revenue for this day (sum of all product totalPrice). */
  revenue: number;
  /** Number of distinct product entries for this day. */
  productCount: number;
  /** Total quantity of all products for this day. */
  totalQuantity: number;
}

/**
 * Computed monthly statistics for chart and export.
 */
export interface MonthlyStats {
  /** Year-month key, e.g. "2026-07". */
  yearMonth: string;
  /** Per-day aggregated data, sorted by date ascending. */
  dailyData: MonthlyDayData[];
  /** Sum of revenue across all days in the month. */
  totalRevenue: number;
  /** Average revenue per day (across days that have records). */
  averageRevenue: number;
  /** Highest single-day revenue. 0 if no records. */
  maxRevenue: number;
  /** The date (YYYY-MM-DD) of the highest-revenue day, or null if no records. */
  maxRevenueDate: string | null;
  /** Total quantity of all products across the month. */
  totalItems: number;
  /** Number of days that have records. */
  recordCount: number;
}

/**
 * Generates a unique ID string using timestamp and random suffix.
 * @returns A unique string identifier.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generates a new empty product row with sensible defaults.
 * @returns A new Product with id, zero values, and auto-link enabled.
 */
export function createEmptyProduct(): Product {
  return {
    id: generateId(),
    name: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    isManualMode: false,
  };
}

/**
 * Formats a Date object to ISO date string (YYYY-MM-DD) in local time.
 * @param date - The Date to format.
 * @returns A string like "2026-07-26".
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extracts the year-month key from an ISO date string.
 * @param dateKey - The ISO date string (YYYY-MM-DD).
 * @returns A string like "2026-07".
 */
export function getMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/**
 * Returns the number of days in a given month (1-indexed).
 * @param year - Full year, e.g. 2026.
 * @param month - Month 1–12 (NOT 0-indexed).
 * @returns Number of days in that month (28–31).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Parses an ISO date string (YYYY-MM-DD) into a Date object in local time.
 * @param dateStr - The ISO date string.
 * @returns A Date object representing that day.
 */
export function parseDateKey(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats a number as a currency string in Chinese yuan.
 * @param value - The numeric amount.
 * @returns A formatted string like "¥1,234.50".
 */
export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ---------------------------------------------------------------------------
// Favorite Products (Feature 3: Quick product selection)
// ---------------------------------------------------------------------------

/**
 * Represents a frequently-used product saved for quick selection.
 * Stored in localStorage under key "sales-tracker-favorites".
 */
export interface FavoriteProduct {
  /** Unique identifier for the favorite entry. */
  id: string;
  /** Product name. */
  name: string;
  /** Default unit price in yuan (CNY). Pre-filled when the favorite is picked. */
  defaultUnitPrice: number;
}

// ---------------------------------------------------------------------------
// Monthly Statistics (Feature 1: Monthly chart)
// ---------------------------------------------------------------------------

/**
 * Aggregated statistics for a single day within a month.
 */
export interface MonthlyDayData {
  /** ISO date string YYYY-MM-DD. */
  date: string;
  /** Total revenue for that day (sum of all product totalPrice). */
  revenue: number;
  /** Number of distinct product entries that day. */
  productCount: number;
  /** Sum of all product quantities that day. */
  totalQuantity: number;
}

/**
 * Aggregated statistics for an entire month.
 */
export interface MonthlyStats {
  /** Year-month key, e.g. "2026-07". */
  yearMonth: string;
  /** Per-day breakdown, sorted chronologically (only days with records). */
  dailyData: MonthlyDayData[];
  /** Sum of revenue across all days in the month. */
  totalRevenue: number;
  /** Average revenue per day (total / number of days with records). */
  averageRevenue: number;
  /** The highest single-day revenue in the month. */
  maxRevenue: number;
  /** The date (YYYY-MM-DD) of the highest-revenue day, or null if no records. */
  maxRevenueDate: string | null;
  /** Total items sold across all days in the month (sum of quantities). */
  totalItems: number;
  /** Number of days that have records. */
  recordCount: number;
}

/**
 * Extracts the year-month prefix (YYYY-MM) from a full ISO date string.
 * @param dateKey - ISO date string like "2026-07-26".
 * @returns Year-month string like "2026-07".
 */
export function getYearMonth(dateKey: string): string {
  return dateKey.slice(0, 7);
}
