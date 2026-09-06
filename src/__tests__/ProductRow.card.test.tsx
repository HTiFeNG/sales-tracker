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
 * Renders ProductRow with variant="card" (mobile layout) and mock callbacks.
 */
function setupCard(product: Product = baseProduct, overrides?: {
  onAddFavorite?: (name: string, unitPrice: number) => void;
  isAlreadyFavorite?: boolean;
}) {
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  const onAddFavorite = overrides?.onAddFavorite ?? vi.fn();
  const isAlreadyFavorite = overrides?.isAlreadyFavorite ?? false;
  const utils = render(
    <ProductRow
      product={product}
      onUpdate={onUpdate}
      onDelete={onDelete}
      favorites={[]}
      onAddFavorite={onAddFavorite}
      isAlreadyFavorite={isAlreadyFavorite}
      variant="card"
    />
  );
  return { onUpdate, onDelete, onAddFavorite, ...utils };
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
// 1. FIELD VISIBILITY — all fields must be present and operable in card layout
// ===========================================================================
describe('ProductRow card layout — all fields visible', () => {
  it('renders product name input (combobox, as MUI Autocomplete)', () => {
    setupCard();
    // MUI Autocomplete renders the input with role="combobox", not "textbox".
    const nameInput = screen.getByRole('combobox');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveValue('苹果');
    expect(nameInput).toHaveAttribute('placeholder', '商品名称');
  });

  it('renders quantity +1 and -1 buttons', () => {
    setupCard();
    expect(
      screen.getByRole('button', { name: '增加数量' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '减少数量' })
    ).toBeInTheDocument();
  });

  it('renders quantity number input', () => {
    setupCard();
    const { quantityInput } = getNumberInputs();
    expect(quantityInput).toHaveValue(2);
  });

  it('renders unit price input', () => {
    setupCard();
    const { unitPriceInput } = getNumberInputs();
    expect(unitPriceInput).toHaveValue(5);
  });

  it('renders total price input', () => {
    setupCard();
    const { totalPriceInput } = getNumberInputs();
    expect(totalPriceInput).toHaveValue(10);
  });

  it('renders delete button', () => {
    setupCard();
    expect(
      screen.getByRole('button', { name: '删除此行' })
    ).toBeInTheDocument();
  });

  it('renders the star (add favorite) button when onAddFavorite is provided', () => {
    setupCard();
    expect(
      screen.getByRole('button', { name: '加入常用' })
    ).toBeInTheDocument();
  });

  it('does not render star button when onAddFavorite is omitted', () => {
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    render(
      <ProductRow
        product={baseProduct}
        onUpdate={onUpdate}
        onDelete={onDelete}
        variant="card"
      />
    );
    expect(
      screen.queryByRole('button', { name: '加入常用' })
    ).not.toBeInTheDocument();
  });

  it('renders "数量", "单价", "总价" labels', () => {
    setupCard();
    expect(screen.getByText('数量')).toBeInTheDocument();
    expect(screen.getByText('单价')).toBeInTheDocument();
    expect(screen.getByText('总价')).toBeInTheDocument();
  });
});

// ===========================================================================
// 2. NO TABLE ELEMENTS — card layout must not use TableRow / TableCell
// ===========================================================================
describe('ProductRow card layout — no table elements', () => {
  it('does not render any row (TableRow) elements', () => {
    setupCard();
    expect(screen.queryAllByRole('row')).toHaveLength(0);
  });

  it('does not render any cell (TableCell) elements', () => {
    setupCard();
    expect(screen.queryAllByRole('cell')).toHaveLength(0);
  });

  it('renders a Paper-based container (MuiPaper-root)', () => {
    const { container } = setupCard();
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });
});

// ===========================================================================
// 3. LINKAGE LOGIC — quantity +/- and total-price linkage work in card layout
//    (These are the exact same assertions as the table-layout tests, proving
//     the shared handler fragments produce identical behaviour.)
// ===========================================================================
describe('ProductRow card layout — quantity +/- buttons', () => {
  it('+1 increments quantity and recalculates total, restores linkage', () => {
    const { onUpdate } = setupCard();
    fireEvent.click(screen.getByRole('button', { name: '增加数量' }));
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 3,
      totalPrice: 15, // 3 * 5
      isManualMode: false,
    });
  });

  it('-1 decrements quantity and recalculates total', () => {
    const { onUpdate } = setupCard();
    fireEvent.click(screen.getByRole('button', { name: '减少数量' }));
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 1,
      totalPrice: 5, // 1 * 5
      isManualMode: false,
    });
  });

  it('-1 from quantity 1 goes to 0, never negative', () => {
    const { onUpdate } = setupCard({
      ...baseProduct,
      quantity: 1,
      totalPrice: 5,
    });
    fireEvent.click(screen.getByRole('button', { name: '减少数量' }));
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 0,
      totalPrice: 0,
      isManualMode: false,
    });
  });

  it('-1 button is disabled when quantity is 0', () => {
    setupCard({ ...baseProduct, quantity: 0, totalPrice: 0 });
    expect(
      screen.getByRole('button', { name: '减少数量' })
    ).toBeDisabled();
  });
});

describe('ProductRow card layout — linkage logic', () => {
  it('changing quantity recalculates total = unitPrice × quantity', () => {
    const { onUpdate } = setupCard();
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
    const { onUpdate } = setupCard();
    fireEvent.change(getNumberInputs().unitPriceInput, {
      target: { value: '8' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      unitPrice: 8,
      totalPrice: 16, // 8 * 2
      isManualMode: false,
    });
  });

  it('editing total enters manual mode and does NOT recalculate', () => {
    const { onUpdate } = setupCard();
    fireEvent.change(getNumberInputs().totalPriceInput, {
      target: { value: '99' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      totalPrice: 99,
      isManualMode: true,
    });
  });

  it('editing unit price after manual total restores linkage', () => {
    const manual = { ...baseProduct, totalPrice: 99, isManualMode: true };
    const { onUpdate } = setupCard(manual);
    fireEvent.change(getNumberInputs().unitPriceInput, {
      target: { value: '8' },
    });
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      unitPrice: 8,
      totalPrice: 16, // re-linked
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
    const { onUpdate } = setupCard(manual);
    fireEvent.click(screen.getByRole('button', { name: '增加数量' }));
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      quantity: 3,
      totalPrice: 15, // re-linked
      isManualMode: false,
    });
  });
});

describe('ProductRow card layout — full transition (stateful)', () => {
  function StatefulCard({ initial }: { initial: Product }) {
    const [product, setProduct] = useState<Product>(initial);
    return (
      <ProductRow
        product={product}
        onUpdate={(_id, updates) =>
          setProduct((p) => ({ ...p, ...updates }))
        }
        onDelete={vi.fn()}
        variant="card"
      />
    );
  }

  it('total follows unitPrice×qty, breaks on manual edit, re-links on price change', () => {
    render(
      <StatefulCard
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

    // Change unit price → re-links: total = 8 × 2 = 16
    fireEvent.change(getNumberInputs().unitPriceInput, {
      target: { value: '8' },
    });
    expect(getNumberInputs().totalPriceInput).toHaveValue(16);
  });

  it('total re-links when +1 clicked after manual edit', () => {
    render(
      <StatefulCard
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

// ===========================================================================
// 4. DELETE in card layout
// ===========================================================================
describe('ProductRow card layout — delete', () => {
  it('calls onDelete with id when delete button clicked', () => {
    const { onDelete } = setupCard();
    fireEvent.click(screen.getByRole('button', { name: '删除此行' }));
    expect(onDelete).toHaveBeenCalledWith('p1');
  });
});

// ===========================================================================
// 5. STAR (favorite) in card layout
// ===========================================================================
describe('ProductRow card layout — favorite star button', () => {
  it('calls onAddFavorite with name and unitPrice when star clicked', () => {
    const onAddFavorite = vi.fn();
    setupCard(baseProduct, { onAddFavorite });
    fireEvent.click(screen.getByRole('button', { name: '加入常用' }));
    expect(onAddFavorite).toHaveBeenCalledWith('苹果', 5);
  });

  it('star button is disabled when name is empty', () => {
    setupCard({ ...baseProduct, name: '' });
    expect(
      screen.getByRole('button', { name: '加入常用' })
    ).toBeDisabled();
  });
});
