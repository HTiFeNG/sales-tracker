import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductRow from '../components/ProductRow';
import { type Product } from '../types';

const baseProduct: Product = {
  id: 'p1',
  name: '苹果',
  quantity: 2,
  unitPrice: 5,
  totalPrice: 10,
  isManualMode: false,
};

/** A product with zero prices — simulates createEmptyProduct() output. */
const zeroProduct: Product = {
  id: 'p1',
  name: '苹果',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  isManualMode: false,
};

/**
 * Renders ProductRow with mock onUpdate/onDelete.
 * Supports both 'table' and 'card' variants.
 */
function setup(
  product: Product = baseProduct,
  variant: 'table' | 'card' = 'table'
) {
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  const utils = render(
    <ProductRow
      product={product}
      onUpdate={onUpdate}
      onDelete={onDelete}
      variant={variant}
    />
  );
  return { onUpdate, onDelete, ...utils };
}

/**
 * Returns the three number inputs in DOM order: quantity, unitPrice, totalPrice.
 */
function getNumberInputs() {
  const inputs = screen.getAllByRole('spinbutton');
  expect(inputs).toHaveLength(3);
  return {
    quantityInput: inputs[0] as HTMLInputElement,
    unitPriceInput: inputs[1] as HTMLInputElement,
    totalPriceInput: inputs[2] as HTMLInputElement,
  };
}

// ===========================================================================
// 1. TABLE LAYOUT — zero-value display & placeholder
//    Verifies: when unitPrice/totalPrice === 0, the TextField renders an empty
//    string (虚位) instead of "0", and shows placeholder="0.00".
// ===========================================================================
describe('ProductRow placeholder input (table) — zero values show empty', () => {
  it('unitPrice = 0 → input value is empty string, not "0"', () => {
    setup(zeroProduct);
    const { unitPriceInput } = getNumberInputs();
    expect(unitPriceInput.value).toBe('');
  });

  it('totalPrice = 0 → input value is empty string, not "0"', () => {
    setup(zeroProduct);
    const { totalPriceInput } = getNumberInputs();
    expect(totalPriceInput.value).toBe('');
  });

  it('unitPrice = 0 → has placeholder="0.00"', () => {
    setup(zeroProduct);
    const { unitPriceInput } = getNumberInputs();
    expect(unitPriceInput).toHaveAttribute('placeholder', '0.00');
  });

  it('totalPrice = 0 → has placeholder="0.00"', () => {
    setup(zeroProduct);
    const { totalPriceInput } = getNumberInputs();
    expect(totalPriceInput).toHaveAttribute('placeholder', '0.00');
  });
});

// ===========================================================================
// 2. TABLE LAYOUT — non-zero values display normally
//    Verifies: the 虚位 logic does NOT affect non-zero values.
// ===========================================================================
describe('ProductRow placeholder input (table) — non-zero values display', () => {
  it('unitPrice = 5 → input value is "5" (not empty)', () => {
    setup(baseProduct);
    const { unitPriceInput } = getNumberInputs();
    expect(unitPriceInput.value).toBe('5');
  });

  it('totalPrice = 10 → input value is "10" (not empty)', () => {
    setup(baseProduct);
    const { totalPriceInput } = getNumberInputs();
    expect(totalPriceInput.value).toBe('10');
  });

  it('decimal unitPrice 12.5 → input value is "12.5"', () => {
    setup({ ...baseProduct, unitPrice: 12.5, totalPrice: 25 });
    const { unitPriceInput } = getNumberInputs();
    expect(unitPriceInput.value).toBe('12.5');
  });

  it('placeholder="0.00" is always present even when value is non-zero', () => {
    setup(baseProduct);
    const { unitPriceInput, totalPriceInput } = getNumberInputs();
    expect(unitPriceInput).toHaveAttribute('placeholder', '0.00');
    expect(totalPriceInput).toHaveAttribute('placeholder', '0.00');
  });
});

// ===========================================================================
// 3. QUANTITY FIELD — unchanged (NOT 虚位)
//    The requirement states quantity field is NOT modified.
// ===========================================================================
describe('ProductRow placeholder input — quantity field unchanged', () => {
  it('quantity = 0 → still displays "0" (NOT empty string)', () => {
    setup({ ...baseProduct, quantity: 0, unitPrice: 5, totalPrice: 0 });
    const { quantityInput } = getNumberInputs();
    expect(quantityInput.value).toBe('0');
  });

  it('quantity field does NOT have placeholder="0.00"', () => {
    setup(zeroProduct);
    const { quantityInput } = getNumberInputs();
    expect(quantityInput).not.toHaveAttribute('placeholder', '0.00');
  });
});

// ===========================================================================
// 4. CARD LAYOUT — same 虚位 behavior (shared field fragments)
// ===========================================================================
describe('ProductRow placeholder input (card) — zero values show empty', () => {
  it('unitPrice = 0 → input value is empty string', () => {
    setup(zeroProduct, 'card');
    const { unitPriceInput } = getNumberInputs();
    expect(unitPriceInput.value).toBe('');
  });

  it('totalPrice = 0 → input value is empty string', () => {
    setup(zeroProduct, 'card');
    const { totalPriceInput } = getNumberInputs();
    expect(totalPriceInput.value).toBe('');
  });

  it('unitPrice = 0 → has placeholder="0.00"', () => {
    setup(zeroProduct, 'card');
    const { unitPriceInput } = getNumberInputs();
    expect(unitPriceInput).toHaveAttribute('placeholder', '0.00');
  });

  it('totalPrice = 0 → has placeholder="0.00"', () => {
    setup(zeroProduct, 'card');
    const { totalPriceInput } = getNumberInputs();
    expect(totalPriceInput).toHaveAttribute('placeholder', '0.00');
  });

  it('unitPrice = non-zero → displays the value in card layout', () => {
    setup(baseProduct, 'card');
    const { unitPriceInput } = getNumberInputs();
    expect(unitPriceInput.value).toBe('5');
  });
});

// ===========================================================================
// 5. EMPTY STRING INPUT — handler treats "" as 0
//    Verifies: when user clears the input, the handler correctly maps "" → 0.
// ===========================================================================
describe('ProductRow placeholder input — clearing input maps to 0', () => {
  it('clearing unitPrice (was 5) → onUpdate with unitPrice=0, totalPrice=0', () => {
    const { onUpdate } = setup(baseProduct);
    fireEvent.change(getNumberInputs().unitPriceInput, {
      target: { value: '' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      unitPrice: 0,
      totalPrice: 0, // 0 * 2
      isManualMode: false,
    });
  });

  it('clearing totalPrice (was 10) → onUpdate with totalPrice=0, manual mode', () => {
    const { onUpdate } = setup(baseProduct);
    fireEvent.change(getNumberInputs().totalPriceInput, {
      target: { value: '' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      totalPrice: 0,
      isManualMode: true,
    });
  });

  it('clearing unitPrice in card layout → same behavior', () => {
    const { onUpdate } = setup(baseProduct, 'card');
    fireEvent.change(getNumberInputs().unitPriceInput, {
      target: { value: '' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      unitPrice: 0,
      totalPrice: 0,
      isManualMode: false,
    });
  });
});

// ===========================================================================
// 6. LINKAGE FROM ZERO STATE — typing a price from empty still recalculates
//    Verifies: the 虚位 change does NOT break the auto-linkage logic.
// ===========================================================================
describe('ProductRow placeholder input — linkage works from zero state', () => {
  it('typing unitPrice from empty (0) recalculates total = price × qty', () => {
    const { onUpdate } = setup(zeroProduct); // qty=1, unitPrice=0, total=0
    fireEvent.change(getNumberInputs().unitPriceInput, {
      target: { value: '8' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      unitPrice: 8,
      totalPrice: 8, // 8 * 1
      isManualMode: false,
    });
  });

  it('typing unitPrice from empty with qty=3 recalculates total = price × 3', () => {
    const { onUpdate } = setup({ ...zeroProduct, quantity: 3 });
    fireEvent.change(getNumberInputs().unitPriceInput, {
      target: { value: '5.5' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      unitPrice: 5.5,
      totalPrice: 16.5, // 5.5 * 3
      isManualMode: false,
    });
  });

  it('full round-trip: 0 → type price → total links → clear → back to 0', () => {
    function StatefulRow({ initial }: { initial: Product }) {
      const [product, setProduct] = useState<Product>(initial);
      return (
        <ProductRow
          product={product}
          onUpdate={(_id, updates) =>
            setProduct((p) => ({ ...p, ...updates }))
          }
          onDelete={vi.fn()}
        />
      );
    }

    render(
      <StatefulRow
        initial={{
          ...zeroProduct,
          quantity: 2,
          unitPrice: 0,
          totalPrice: 0,
          isManualMode: false,
        }}
      />
    );

    const { unitPriceInput, totalPriceInput } = getNumberInputs();

    // Initially empty (虚位)
    expect(unitPriceInput.value).toBe('');
    expect(totalPriceInput.value).toBe('');

    // Type unit price = 8 → total = 8 × 2 = 16 (auto-linked)
    fireEvent.change(unitPriceInput, { target: { value: '8' } });
    expect(unitPriceInput.value).toBe('8');
    expect(totalPriceInput.value).toBe('16');

    // Clear unit price → total = 0 × 2 = 0, both empty again (虚位 restored)
    fireEvent.change(unitPriceInput, { target: { value: '' } });
    expect(unitPriceInput.value).toBe('');
    expect(totalPriceInput.value).toBe('');
  });

  it('manual total from empty state: type total → manual mode → type price → re-link', () => {
    function StatefulRow({ initial }: { initial: Product }) {
      const [product, setProduct] = useState<Product>(initial);
      return (
        <ProductRow
          product={product}
          onUpdate={(_id, updates) =>
            setProduct((p) => ({ ...p, ...updates }))
          }
          onDelete={vi.fn()}
        />
      );
    }

    render(
      <StatefulRow
        initial={{
          ...zeroProduct,
          quantity: 2,
          unitPrice: 0,
          totalPrice: 0,
          isManualMode: false,
        }}
      />
    );

    const { unitPriceInput, totalPriceInput } = getNumberInputs();

    // Type total manually → 99 (manual mode, breaks linkage)
    fireEvent.change(totalPriceInput, { target: { value: '99' } });
    expect(totalPriceInput.value).toBe('99');

    // Now type unit price → 8 → re-links: total = 8 × 2 = 16
    fireEvent.change(unitPriceInput, { target: { value: '8' } });
    expect(unitPriceInput.value).toBe('8');
    expect(totalPriceInput.value).toBe('16');
  });
});
