import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DailyTotal from '../components/DailyTotal';
import { formatCurrency, type Product } from '../types';

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

/**
 * Reads the rendered totals.
 *
 * The grand total is rendered via `<Typography variant="h3" component="span">`,
 * i.e. it is a <span> (not an <h3>), so we locate it by its ¥ currency text.
 * The item count and total quantity are rendered as <h6> headings (level 6),
 * in DOM order: item count first, total quantity second.
 */
function readTotals() {
  const grandEl = screen.getByText(/¥/);
  const h6s = screen.getAllByRole('heading', { level: 6 });
  return {
    grand: grandEl.textContent ?? '',
    itemCount: h6s[0]?.textContent ?? '',
    totalQty: h6s[1]?.textContent ?? '',
  };
}

describe('DailyTotal', () => {
  it('shows zeros for an empty product list', () => {
    render(<DailyTotal products={[]} />);
    const t = readTotals();
    expect(t.grand).toBe(formatCurrency(0));
    expect(t.itemCount).toBe('0');
    expect(t.totalQty).toBe('0');
  });

  it('sums a single product correctly', () => {
    const products = [makeProduct({ quantity: 2, totalPrice: 10 })];
    render(<DailyTotal products={products} />);
    const t = readTotals();
    expect(t.grand).toBe(formatCurrency(10));
    expect(t.itemCount).toBe('1');
    expect(t.totalQty).toBe('2');
  });

  it('sums multiple products: grand total, item count, total quantity', () => {
    const products = [
      makeProduct({ id: 'a', quantity: 2, totalPrice: 10 }),
      makeProduct({ id: 'b', quantity: 3, totalPrice: 15 }),
    ];
    render(<DailyTotal products={products} />);
    const t = readTotals();
    expect(t.grand).toBe(formatCurrency(25)); // 10 + 15
    expect(t.itemCount).toBe('2');
    expect(t.totalQty).toBe('5'); // 2 + 3
  });

  it('respects manually-set totalPrice (does not recompute from price×qty)', () => {
    // qty 2, unitPrice 5 => linked total would be 10, but manual total is 99.
    const products = [
      makeProduct({
        quantity: 2,
        unitPrice: 5,
        totalPrice: 99,
        isManualMode: true,
      }),
    ];
    render(<DailyTotal products={products} />);
    const t = readTotals();
    expect(t.grand).toBe(formatCurrency(99)); // uses the manual total
    expect(t.totalQty).toBe('2');
  });

  it('treats missing/undefined totalPrice as 0 (no NaN in the sum)', () => {
    const products = [
      makeProduct({ id: 'a', quantity: 1, totalPrice: 5 }),
      // @ts-expect-error -- simulate a malformed record loaded from storage
      makeProduct({ id: 'b', quantity: 1 }),
    ];
    render(<DailyTotal products={products} />);
    const t = readTotals();
    expect(t.grand).toBe(formatCurrency(5)); // 5 + (undefined -> 0)
    expect(t.totalQty).toBe('2');
  });

  it('updates in real time when the products list changes', () => {
    const { rerender } = render(<DailyTotal products={[]} />);
    expect(readTotals().grand).toBe(formatCurrency(0));

    rerender(
      <DailyTotal
        products={[
          makeProduct({ id: 'a', quantity: 2, totalPrice: 10 }),
          makeProduct({ id: 'b', quantity: 3, totalPrice: 15 }),
        ]}
      />
    );
    let t = readTotals();
    expect(t.grand).toBe(formatCurrency(25));
    expect(t.itemCount).toBe('2');
    expect(t.totalQty).toBe('5');

    // Add one more product -> totals update live.
    rerender(
      <DailyTotal
        products={[
          makeProduct({ id: 'a', quantity: 2, totalPrice: 10 }),
          makeProduct({ id: 'b', quantity: 3, totalPrice: 15 }),
          makeProduct({ id: 'c', quantity: 4, totalPrice: 20 }),
        ]}
      />
    );
    t = readTotals();
    expect(t.grand).toBe(formatCurrency(45)); // 10 + 15 + 20
    expect(t.itemCount).toBe('3');
    expect(t.totalQty).toBe('9'); // 2 + 3 + 4
  });

  it('handles a product with quantity 0 gracefully', () => {
    const products = [makeProduct({ id: 'a', quantity: 0, totalPrice: 0 })];
    render(<DailyTotal products={products} />);
    const t = readTotals();
    expect(t.grand).toBe(formatCurrency(0));
    expect(t.itemCount).toBe('1');
    expect(t.totalQty).toBe('0');
  });
});
