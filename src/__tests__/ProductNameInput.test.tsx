import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductNameInput from '../components/ProductNameInput';
import ProductRow from '../components/ProductRow';
import { type FavoriteProduct, type Product } from '../types';

const apple: FavoriteProduct = { id: 'f1', name: '苹果', defaultUnitPrice: 5 };
const banana: FavoriteProduct = { id: 'f2', name: '香蕉', defaultUnitPrice: 3.5 };

/**
 * A stateful wrapper that feeds onNameChange back into the controlled `value`
 * prop. This is necessary because MUI Autocomplete is controlled: without
 * reflecting the typed text back into `value`, the popup filtering and option
 * rendering do not behave as in production.
 */
function StatefulInput(props: {
  favorites: FavoriteProduct[];
  onSelectFavorite: (f: FavoriteProduct) => void;
  onNameChange?: (v: string) => void;
  initial?: string;
}) {
  const [value, setValue] = useState(props.initial ?? '');
  return (
    <ProductNameInput
      value={value}
      favorites={props.favorites}
      onNameChange={(v) => {
        setValue(v);
        props.onNameChange?.(v);
      }}
      onSelectFavorite={props.onSelectFavorite}
    />
  );
}

describe('ProductNameInput - rendering', () => {
  it('renders a text input with the 商品名称 placeholder', () => {
    render(
      <ProductNameInput
        value=""
        favorites={[]}
        onNameChange={vi.fn()}
        onSelectFavorite={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText('商品名称')).toBeInTheDocument();
  });
});

describe('ProductNameInput - free text input', () => {
  it('calls onNameChange when the user types', () => {
    const onNameChange = vi.fn();
    render(
      <ProductNameInput
        value=""
        favorites={[]}
        onNameChange={onNameChange}
        onSelectFavorite={vi.fn()}
      />
    );
    const input = screen.getByPlaceholderText('商品名称');
    fireEvent.change(input, { target: { value: '苹' } });
    expect(onNameChange).toHaveBeenCalledWith('苹');
  });

  it('calls onNameChange with each keystroke', () => {
    const onNameChange = vi.fn();
    render(
      <ProductNameInput
        value=""
        favorites={[]}
        onNameChange={onNameChange}
        onSelectFavorite={vi.fn()}
      />
    );
    const input = screen.getByPlaceholderText('商品名称');
    fireEvent.change(input, { target: { value: '苹' } });
    fireEvent.change(input, { target: { value: '苹果' } });
    expect(onNameChange).toHaveBeenNthCalledWith(1, '苹');
    expect(onNameChange).toHaveBeenNthCalledWith(2, '苹果');
  });
});

describe('ProductNameInput - favorite selection', () => {
  it('calls onSelectFavorite when a favorite is picked from the dropdown', () => {
    const onSelectFavorite = vi.fn();
    render(
      <StatefulInput favorites={[apple, banana]} onSelectFavorite={onSelectFavorite} />
    );
    const input = screen.getByPlaceholderText('商品名称');
    input.focus();
    fireEvent.mouseDown(input);

    const option = screen.getByRole('option', { name: /苹果/ });
    fireEvent.click(option);

    expect(onSelectFavorite).toHaveBeenCalledTimes(1);
    expect(onSelectFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f1', name: '苹果', defaultUnitPrice: 5 })
    );
  });

  it('calls onSelectFavorite with the correct favorite when a different one is chosen', () => {
    const onSelectFavorite = vi.fn();
    render(
      <StatefulInput favorites={[apple, banana]} onSelectFavorite={onSelectFavorite} />
    );
    const input = screen.getByPlaceholderText('商品名称');
    input.focus();
    fireEvent.mouseDown(input);

    const option = screen.getByRole('option', { name: /香蕉/ });
    fireEvent.click(option);

    expect(onSelectFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f2', name: '香蕉', defaultUnitPrice: 3.5 })
    );
  });
});

describe('ProductRow - favorite auto-fill integration', () => {
  const baseProduct: Product = {
    id: 'p1',
    name: '',
    quantity: 2,
    unitPrice: 0,
    totalPrice: 0,
    isManualMode: false,
  };

  /**
   * Selecting a favorite should auto-fill the product name and unit price and
   * recompute the linked total (defaultUnitPrice × quantity), restoring
   * auto-linkage.
   */
  it('auto-fills name, unit price, and recalculates total when a favorite is selected', () => {
    const onUpdate = vi.fn();
    render(
      <ProductRow
        product={baseProduct}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        favorites={[apple]}
        onAddFavorite={vi.fn()}
        isAlreadyFavorite={false}
      />
    );
    const input = screen.getByPlaceholderText('商品名称');
    input.focus();
    fireEvent.mouseDown(input);

    const option = screen.getByRole('option', { name: /苹果/ });
    fireEvent.click(option);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      name: '苹果',
      unitPrice: 5,
      totalPrice: 10, // 5 (defaultUnitPrice) × 2 (quantity)
      isManualMode: false,
    });
  });

  it('recalculates total using the current quantity, not a hardcoded one', () => {
    const onUpdate = vi.fn();
    const product: Product = { ...baseProduct, quantity: 4 };
    render(
      <ProductRow
        product={product}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        favorites={[banana]}
        onAddFavorite={vi.fn()}
        isAlreadyFavorite={false}
      />
    );
    const input = screen.getByPlaceholderText('商品名称');
    input.focus();
    fireEvent.mouseDown(input);

    fireEvent.click(screen.getByRole('option', { name: /香蕉/ }));

    expect(onUpdate).toHaveBeenCalledWith('p1', {
      name: '香蕉',
      unitPrice: 3.5,
      totalPrice: 14, // 3.5 × 4
      isManualMode: false,
    });
  });
});
