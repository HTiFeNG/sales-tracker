import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSalesRecords } from '../hooks/useSalesRecords';

// The storage key the hook uses internally; declared here to avoid importing
// non-exported internals.
const STORAGE_KEY_LOCAL = 'sales-tracker-data';

beforeEach(() => {
  localStorage.clear();
});

describe('useSalesRecords', () => {
  it('starts with an empty product list for the selected date', () => {
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    expect(result.current.products).toEqual([]);
    expect(result.current.hasData).toBe(false);
  });

  it('adds an empty product row', () => {
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    act(() => {
      result.current.addProduct();
    });
    expect(result.current.products).toHaveLength(1);
    const added = result.current.products[0];
    expect(added.name).toBe('');
    expect(added.quantity).toBe(1);
    expect(added.unitPrice).toBe(0);
    expect(added.totalPrice).toBe(0);
    expect(added.isManualMode).toBe(false);
    expect(result.current.hasData).toBe(true);
  });

  it('updates a product with a partial update', () => {
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    act(() => result.current.addProduct());
    const id = result.current.products[0].id;
    act(() => {
      result.current.updateProduct(id, { name: '苹果', quantity: 3, unitPrice: 5 });
    });
    const updated = result.current.products[0];
    expect(updated.name).toBe('苹果');
    expect(updated.quantity).toBe(3);
    expect(updated.unitPrice).toBe(5);
  });

  it('deletes a product by id', () => {
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    act(() => {
      result.current.addProduct();
      result.current.addProduct();
    });
    expect(result.current.products).toHaveLength(2);
    const firstId = result.current.products[0].id;
    act(() => result.current.deleteProduct(firstId));
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products.find((p) => p.id === firstId)).toBeUndefined();
  });

  it('updateProduct on a missing date is a no-op', () => {
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    expect(() =>
      act(() => result.current.updateProduct('nonexistent', { name: 'x' }))
    ).not.toThrow();
    expect(result.current.products).toEqual([]);
  });

  it('deleteProduct on a missing date is a no-op', () => {
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    expect(() =>
      act(() => result.current.deleteProduct('nonexistent'))
    ).not.toThrow();
    expect(result.current.products).toEqual([]);
  });
});

describe('useSalesRecords - persistence', () => {
  it('persists data to localStorage after adding a product', () => {
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    act(() => result.current.addProduct());
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed['2026-07-26'].products).toHaveLength(1);
  });

  it('loads existing data from localStorage on init', () => {
    const seed = {
      '2026-07-26': {
        date: '2026-07-26',
        products: [
          {
            id: 'seed-1',
            name: '苹果',
            quantity: 2,
            unitPrice: 5,
            totalPrice: 10,
            isManualMode: false,
          },
        ],
      },
    };
    localStorage.setItem(STORAGE_KEY_LOCAL, JSON.stringify(seed));
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].name).toBe('苹果');
    expect(result.current.products[0].totalPrice).toBe(10);
  });

  it('survives a "page refresh": data persists across hook remounts', () => {
    const { result, unmount } = renderHook(() => useSalesRecords('2026-07-26'));
    act(() => result.current.addProduct());
    const prodId = result.current.products[0].id;
    act(() => {
      result.current.updateProduct(prodId, {
        name: '香蕉',
        quantity: 4,
        unitPrice: 3,
        totalPrice: 12,
      });
    });
    unmount();

    // Simulate a fresh page load: a brand-new hook instance reads localStorage.
    const { result: result2 } = renderHook(() => useSalesRecords('2026-07-26'));
    expect(result2.current.products).toHaveLength(1);
    expect(result2.current.products[0].name).toBe('香蕉');
    expect(result2.current.products[0].quantity).toBe(4);
    expect(result2.current.products[0].totalPrice).toBe(12);
  });

  it('returns empty data (no crash) when localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY_LOCAL, '{not valid json');
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    expect(result.current.products).toEqual([]);
  });
});

describe('useSalesRecords - date isolation & history', () => {
  it('keeps data independent between different dates', () => {
    const { result, rerender } = renderHook(
      ({ date }) => useSalesRecords(date),
      { initialProps: { date: '2026-07-26' } }
    );
    act(() => result.current.addProduct());
    const mondayId = result.current.products[0].id;
    act(() => {
      result.current.updateProduct(mondayId, { name: '周一苹果' });
    });
    expect(result.current.products).toHaveLength(1);

    // Switch to another date.
    rerender({ date: '2026-07-27' });
    expect(result.current.products).toEqual([]);
    act(() => result.current.addProduct());
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].name).toBe('');

    // Switch back — original data is intact.
    rerender({ date: '2026-07-26' });
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].name).toBe('周一苹果');
  });

  it('getDatesWithRecords returns only dates with products, sorted newest first', () => {
    const { result, rerender } = renderHook(
      ({ date }) => useSalesRecords(date),
      { initialProps: { date: '2026-07-26' } }
    );
    // Add a product on 2026-07-26
    act(() => result.current.addProduct());

    // Add a product on 2026-07-25
    rerender({ date: '2026-07-25' });
    act(() => result.current.addProduct());

    // Add a product on 2026-07-28
    rerender({ date: '2026-07-28' });
    act(() => result.current.addProduct());

    const dates = result.current.getDatesWithRecords();
    expect(dates).toEqual(['2026-07-28', '2026-07-26', '2026-07-25']);
  });

  it('getDatesWithRecords excludes dates whose product list is empty', () => {
    const { result, rerender } = renderHook(
      ({ date }) => useSalesRecords(date),
      { initialProps: { date: '2026-07-26' } }
    );
    // Visiting a date creates an (empty) record for it.
    rerender({ date: '2026-07-26' });
    rerender({ date: '2026-07-27' }); // empty record created
    // Only add a product on the 26th.
    rerender({ date: '2026-07-26' });
    act(() => result.current.addProduct());

    const dates = result.current.getDatesWithRecords();
    expect(dates).toEqual(['2026-07-26']);
  });
});

describe('useSalesRecords - edge cases', () => {
  it('handles empty product list gracefully (hasData false)', () => {
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    expect(result.current.hasData).toBe(false);
    expect(result.current.products).toEqual([]);
  });

  it('adding then deleting all products leaves an empty list', () => {
    const { result } = renderHook(() => useSalesRecords('2026-07-26'));
    act(() => {
      result.current.addProduct();
      result.current.addProduct();
    });
    expect(result.current.products).toHaveLength(2);
    // Capture both ids BEFORE the delete act, so each delete targets a
    // distinct product (otherwise the stale ref resolves to the same id).
    const ids = result.current.products.map((p) => p.id);
    act(() => {
      result.current.deleteProduct(ids[0]);
      result.current.deleteProduct(ids[1]);
    });
    expect(result.current.products).toEqual([]);
    expect(result.current.hasData).toBe(false);
  });
});
