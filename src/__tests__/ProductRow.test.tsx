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

/**
 * Renders ProductRow with a mock onUpdate/onDelete so we can assert exactly
 * what partial update the linkage logic produces.
 */
function setup(product: Product = baseProduct) {
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  const utils = render(
    <ProductRow product={product} onUpdate={onUpdate} onDelete={onDelete} />
  );
  return { onUpdate, onDelete, ...utils };
}

/**
 * Returns the three number inputs in DOM order: quantity, unitPrice, totalPrice.
 * (The name TextField is a plain textbox and is excluded.)
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

describe('ProductRow - quantity +1 / -1 buttons', () => {
  it('+1 increments quantity and recalculates total, restores linkage', () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getByRole('button', { name: '增加数量' }));
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 3,
      totalPrice: 15, // 3 * 5
      isManualMode: false,
    });
  });

  it('-1 decrements quantity and recalculates total', () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getByRole('button', { name: '减少数量' }));
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 1,
      totalPrice: 5, // 1 * 5
      isManualMode: false,
    });
  });

  it('-1 from quantity 1 goes to 0, never negative', () => {
    const { onUpdate } = setup({ ...baseProduct, quantity: 1, totalPrice: 5 });
    fireEvent.click(screen.getByRole('button', { name: '减少数量' }));
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 0,
      totalPrice: 0,
      isManualMode: false,
    });
  });

  it('-1 button is disabled when quantity is 0 (cannot go negative)', () => {
    setup({ ...baseProduct, quantity: 0, totalPrice: 0 });
    const decBtn = screen.getByRole('button', { name: '减少数量' });
    expect(decBtn).toBeDisabled();
  });

  it('+1 still works from quantity 0', () => {
    const { onUpdate } = setup({ ...baseProduct, quantity: 0, totalPrice: 0 });
    fireEvent.click(screen.getByRole('button', { name: '增加数量' }));
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 1,
      totalPrice: 5, // 1 * 5
      isManualMode: false,
    });
  });
});

describe('ProductRow - linkage logic (the critical path)', () => {
  describe('default (linked) state', () => {
    it('changing quantity recalculates total = unitPrice × quantity', () => {
      const { onUpdate } = setup();
      fireEvent.change(getNumberInputs().quantityInput, {
        target: { value: '4' },
      });
      expect(onUpdate).toHaveBeenCalledWith('p1', {
        quantity: 4,
        totalPrice: 20, // 5 * 4
        isManualMode: false,
      });
    });

    it('changing unit price recalculates total = unitPrice × quantity', () => {
      const { onUpdate } = setup();
      fireEvent.change(getNumberInputs().unitPriceInput, {
        target: { value: '8' },
      });
      expect(onUpdate).toHaveBeenCalledWith('p1', {
        unitPrice: 8,
        totalPrice: 16, // 8 * 2
        isManualMode: false,
      });
    });
  });

  describe('manual mode (total edited)', () => {
    it('editing total enters manual mode and does NOT recalculate', () => {
      const { onUpdate } = setup();
      fireEvent.change(getNumberInputs().totalPriceInput, {
        target: { value: '99' },
      });
      // Notice: unitPrice and quantity are NOT touched, total is kept as entered.
      expect(onUpdate).toHaveBeenCalledWith('p1', {
        totalPrice: 99,
        isManualMode: true,
      });
    });

    it('editing unit price after manual total restores linkage', () => {
      const manual = { ...baseProduct, totalPrice: 99, isManualMode: true };
      const { onUpdate } = setup(manual);
      fireEvent.change(getNumberInputs().unitPriceInput, {
        target: { value: '8' },
      });
      expect(onUpdate).toHaveBeenCalledWith('p1', {
        unitPrice: 8,
        totalPrice: 16, // 8 * 2 — re-linked!
        isManualMode: false,
      });
    });

    it('editing quantity after manual total restores linkage', () => {
      const manual = { ...baseProduct, totalPrice: 99, isManualMode: true };
      const { onUpdate } = setup(manual);
      fireEvent.change(getNumberInputs().quantityInput, {
        target: { value: '4' },
      });
      expect(onUpdate).toHaveBeenCalledWith('p1', {
        quantity: 4,
        totalPrice: 20, // 5 * 4 — re-linked!
        isManualMode: false,
      });
    });

    it('+1 after manual total restores linkage and recalculates', () => {
      const manual = {
        ...baseProduct,
        quantity: 2,
        unitPrice: 5,
        totalPrice: 99,
        isManualMode: true,
      };
      const { onUpdate } = setup(manual);
      fireEvent.click(screen.getByRole('button', { name: '增加数量' }));
      expect(onUpdate).toHaveBeenCalledWith('p1', {
        quantity: 3,
        totalPrice: 15, // 3 * 5 — re-linked!
        isManualMode: false,
      });
    });

    it('-1 after manual total restores linkage and recalculates', () => {
      const manual = {
        ...baseProduct,
        quantity: 2,
        unitPrice: 5,
        totalPrice: 99,
        isManualMode: true,
      };
      const { onUpdate } = setup(manual);
      fireEvent.click(screen.getByRole('button', { name: '减少数量' }));
      expect(onUpdate).toHaveBeenCalledWith('p1', {
        quantity: 1,
        totalPrice: 5, // 1 * 5 — re-linked!
        isManualMode: false,
      });
    });
  });

  /**
   * Full round-trip through a stateful wrapper that applies onUpdate back to
   * state, proving the three-state transition actually drives the rendered
   * total: linked → manual → re-linked.
   */
  describe('full transition (linked → manual → re-linked)', () => {
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

    it('total follows unitPrice×qty, breaks on manual edit, re-links on price change', () => {
      render(
        <StatefulRow
          initial={{
            ...baseProduct,
            quantity: 2,
            unitPrice: 5,
            totalPrice: 10,
            isManualMode: false,
          }}
        />
      );

      // Linked: total = 10
      expect(getNumberInputs().totalPriceInput).toHaveValue(10);

      // Manually edit total → 99 (manual mode)
      fireEvent.change(getNumberInputs().totalPriceInput, {
        target: { value: '99' },
      });
      expect(getNumberInputs().totalPriceInput).toHaveValue(99);

      // Now change unit price → re-links: total = 8 × 2 = 16
      fireEvent.change(getNumberInputs().unitPriceInput, {
        target: { value: '8' },
      });
      expect(getNumberInputs().totalPriceInput).toHaveValue(16);
    });

    it('total re-links when quantity changes after manual edit', () => {
      render(
        <StatefulRow
          initial={{
            ...baseProduct,
            quantity: 2,
            unitPrice: 5,
            totalPrice: 10,
            isManualMode: false,
          }}
        />
      );
      // Manual edit to 99
      fireEvent.change(getNumberInputs().totalPriceInput, {
        target: { value: '99' },
      });
      expect(getNumberInputs().totalPriceInput).toHaveValue(99);
      // Change quantity → re-link: 5 × 4 = 20
      fireEvent.change(getNumberInputs().quantityInput, {
        target: { value: '4' },
      });
      expect(getNumberInputs().totalPriceInput).toHaveValue(20);
    });

    it('total re-links when +1 clicked after manual edit', () => {
      render(
        <StatefulRow
          initial={{
            ...baseProduct,
            quantity: 2,
            unitPrice: 5,
            totalPrice: 10,
            isManualMode: false,
          }}
        />
      );
      fireEvent.change(getNumberInputs().totalPriceInput, {
        target: { value: '99' },
      });
      expect(getNumberInputs().totalPriceInput).toHaveValue(99);
      fireEvent.click(screen.getByRole('button', { name: '增加数量' }));
      // 3 × 5 = 15
      expect(getNumberInputs().totalPriceInput).toHaveValue(15);
    });
  });
});

describe('ProductRow - manual/linked visual indicator', () => {
  it('applies manual-mode styling (red, bold) when isManualMode is true', () => {
    setup({ ...baseProduct, isManualMode: true, totalPrice: 99 });
    const { totalPriceInput } = getNumberInputs();
    expect(totalPriceInput).toHaveStyle({ color: '#d32f2f' });
    expect(totalPriceInput).toHaveStyle({ fontWeight: 600 });
  });

  it('applies linked styling when isManualMode is false', () => {
    setup({ ...baseProduct, isManualMode: false });
    const { totalPriceInput } = getNumberInputs();
    expect(totalPriceInput).toHaveStyle({ fontWeight: 400 });
  });
});

describe('ProductRow - boundary & invalid inputs', () => {
  it('rejects negative quantity input (clamps to 0)', () => {
    const { onUpdate } = setup();
    fireEvent.change(getNumberInputs().quantityInput, {
      target: { value: '-3' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 0,
      totalPrice: 0,
      isManualMode: false,
    });
  });

  it('treats empty quantity input as 0', () => {
    const { onUpdate } = setup();
    fireEvent.change(getNumberInputs().quantityInput, {
      target: { value: '' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 0,
      totalPrice: 0,
      isManualMode: false,
    });
  });

  it('rejects non-numeric quantity (NaN → 0)', () => {
    const { onUpdate } = setup();
    fireEvent.change(getNumberInputs().quantityInput, {
      target: { value: 'abc' },
    });
    // parseInt('abc') = NaN → || 0 → 0
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 0,
      totalPrice: 0,
      isManualMode: false,
    });
  });

  it('rejects negative unit price (clamps to 0)', () => {
    const { onUpdate } = setup();
    fireEvent.change(getNumberInputs().unitPriceInput, {
      target: { value: '-5' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      unitPrice: 0,
      totalPrice: 0, // 0 * 2
      isManualMode: false,
    });
  });

  it('treats empty unit price as 0', () => {
    const { onUpdate } = setup();
    fireEvent.change(getNumberInputs().unitPriceInput, {
      target: { value: '' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      unitPrice: 0,
      totalPrice: 0,
      isManualMode: false,
    });
  });

  it('rejects negative total price (clamps to 0, still manual)', () => {
    const { onUpdate } = setup();
    fireEvent.change(getNumberInputs().totalPriceInput, {
      target: { value: '-50' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      totalPrice: 0,
      isManualMode: true,
    });
  });

  it('handles zero unit price (total = 0 × quantity)', () => {
    const zero = { ...baseProduct, unitPrice: 0, totalPrice: 0, isManualMode: false };
    const { onUpdate } = setup(zero);
    fireEvent.change(getNumberInputs().quantityInput, {
      target: { value: '5' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 5,
      totalPrice: 0,
      isManualMode: false,
    });
  });
});

describe('ProductRow - delete', () => {
  it('calls onDelete with id when delete button clicked', () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole('button', { name: '删除此行' }));
    expect(onDelete).toHaveBeenCalledWith('p1');
  });
});
