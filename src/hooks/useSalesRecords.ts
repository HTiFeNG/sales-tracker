import { useCallback, useEffect, useState } from 'react';
import {
  type SalesData,
  type DailyRecord,
  type Product,
  type MonthlyStats,
  type MonthlyDayData,
  createEmptyProduct,
  formatDateKey,
} from '../types';

/** localStorage key for persisting all sales data. */
const STORAGE_KEY = 'sales-tracker-data';

/**
 * Safely loads the sales data from localStorage.
 * Returns an empty object if no data is found or if parsing fails.
 * @returns The parsed SalesData, or an empty record.
 */
function loadFromStorage(): SalesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as SalesData;
    }
    return {};
  } catch (error) {
    console.error('Failed to load sales data from localStorage:', error);
    return {};
  }
}

/**
 * Safely saves the sales data to localStorage.
 * @param data - The SalesData to persist.
 */
function saveToStorage(data: SalesData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save sales data to localStorage:', error);
  }
}

/**
 * Custom hook for managing sales records with localStorage persistence.
 *
 * Provides access to all daily records, the currently selected date's products,
 * and operations to add, update, and delete product rows.
 *
 * @param selectedDateKey - The ISO date string (YYYY-MM-DD) currently selected.
 * @returns An object containing the current day's products and CRUD operations.
 */
export function useSalesRecords(selectedDateKey: string) {
  const [data, setData] = useState<SalesData>(() => loadFromStorage());

  // Persist to localStorage whenever data changes.
  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  // Ensure a daily record exists for the selected date.
  useEffect(() => {
    setData((prevData) => {
      if (prevData[selectedDateKey]) {
        return prevData;
      }
      const newRecord: DailyRecord = {
        date: selectedDateKey,
        products: [],
      };
      return { ...prevData, [selectedDateKey]: newRecord };
    });
  }, [selectedDateKey]);

  /** The products for the currently selected date. */
  const currentProducts: Product[] = data[selectedDateKey]?.products ?? [];

  /**
   * Adds a new empty product row to the selected date.
   */
  const addProduct = useCallback(() => {
    const newProduct = createEmptyProduct();
    setData((prevData) => {
      const record = prevData[selectedDateKey];
      const updatedProducts = record
        ? [...record.products, newProduct]
        : [newProduct];
      const updatedRecord: DailyRecord = {
        date: selectedDateKey,
        products: updatedProducts,
      };
      return { ...prevData, [selectedDateKey]: updatedRecord };
    });
  }, [selectedDateKey]);

  /**
   * Updates a single product row by ID using a partial update.
   *
   * @param productId - The ID of the product to update.
   * @param updates - Partial fields to update.
   */
  const updateProduct = useCallback(
    (productId: string, updates: Partial<Product>) => {
      setData((prevData) => {
        const record = prevData[selectedDateKey];
        if (!record) return prevData;
        const updatedProducts = record.products.map((p) => {
          if (p.id !== productId) return p;
          const merged = { ...p, ...updates };
          return merged;
        });
        const updatedRecord: DailyRecord = {
          ...record,
          products: updatedProducts,
        };
        return { ...prevData, [selectedDateKey]: updatedRecord };
      });
    },
    [selectedDateKey]
  );

  /**
   * Deletes a product row by ID from the selected date.
   *
   * @param productId - The ID of the product to delete.
   */
  const deleteProduct = useCallback(
    (productId: string) => {
      setData((prevData) => {
        const record = prevData[selectedDateKey];
        if (!record) return prevData;
        const updatedProducts = record.products.filter((p) => p.id !== productId);
        const updatedRecord: DailyRecord = {
          ...record,
          products: updatedProducts,
        };
        return { ...prevData, [selectedDateKey]: updatedRecord };
      });
    },
    [selectedDateKey]
  );

  /**
   * Returns the dates that have records, sorted from newest to oldest.
   * Useful for history navigation.
   */
  const getDatesWithRecords = useCallback((): string[] => {
    const dates = Object.keys(data).filter(
      (key) => data[key]?.products && data[key].products.length > 0
    );
    return dates.sort((a, b) => b.localeCompare(a));
  }, [data]);

  /**
   * Computes aggregated monthly statistics for the given year-month.
   *
   * @param yearMonth - A string like "2026-07".
   * @returns A MonthlyStats object with per-day data and summary metrics.
   */
  const getMonthlyStats = useCallback(
    (yearMonth: string): MonthlyStats => {
      const monthRecords = Object.values(data)
        .filter(
          (record) =>
            record.date.startsWith(yearMonth) &&
            record.products &&
            record.products.length > 0
        )
        .sort((a, b) => a.date.localeCompare(b.date));

      const dailyData: MonthlyDayData[] = monthRecords.map((record) => {
        const revenue = record.products.reduce(
          (sum, p) => sum + (p.totalPrice || 0),
          0
        );
        const totalQuantity = record.products.reduce(
          (sum, p) => sum + (p.quantity || 0),
          0
        );
        return {
          date: record.date,
          revenue,
          productCount: record.products.length,
          totalQuantity,
        };
      });

      const totalRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);
      const totalItems = dailyData.reduce(
        (sum, d) => sum + d.totalQuantity,
        0
      );
      const recordCount = dailyData.length;
      const averageRevenue =
        recordCount > 0 ? totalRevenue / recordCount : 0;

      // Initialize from the first record so that days with zero revenue are
      // still considered when all daily revenues are 0. When there are ties
      // for the highest revenue, the earliest date (already sorted ascending)
      // is kept, matching the "first day on tie" semantic.
      let maxRevenue = dailyData[0]?.revenue ?? 0;
      let maxRevenueDate: string | null = dailyData[0]?.date ?? null;
      for (let i = 1; i < dailyData.length; i++) {
        if (dailyData[i].revenue > maxRevenue) {
          maxRevenue = dailyData[i].revenue;
          maxRevenueDate = dailyData[i].date;
        }
      }

      return {
        yearMonth,
        dailyData,
        totalRevenue,
        averageRevenue,
        maxRevenue,
        maxRevenueDate,
        totalItems,
        recordCount,
      };
    },
    [data]
  );

  return {
    products: currentProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getDatesWithRecords,
    getMonthlyStats,
    hasData: currentProducts.length > 0,
  };
}

/**
 * Convenience hook to get today's date key.
 * @returns The ISO date string for today.
 */
export function useTodayKey(): string {
  return formatDateKey(new Date());
}
