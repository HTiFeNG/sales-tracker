import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { type FavoriteProduct, formatCurrency } from '../types';

interface ProductNameInputProps {
  /** Current product name value. */
  value: string;
  /** List of favorite products for the dropdown. */
  favorites: FavoriteProduct[];
  /** Called when the user types free text. */
  onNameChange: (name: string) => void;
  /** Called when the user selects a favorite from the dropdown. */
  onSelectFavorite: (favorite: FavoriteProduct) => void;
}

/**
 * A product name input with an autocomplete dropdown of favorite products.
 *
 * Uses MUI Autocomplete in "free solo" mode so the user can either type
 * a custom name or pick from previously-saved favorites. When a favorite
 * is selected, `onSelectFavorite` fires so the parent can auto-fill the
 * unit price and recalculate the total.
 */
const ProductNameInput: React.FC<ProductNameInputProps> = ({
  value,
  favorites,
  onNameChange,
  onSelectFavorite,
}) => {
  /**
   * Handles the Autocomplete change event.
   * - If the user typed/edited text → onNameChange.
   * - If the user selected an option → onSelectFavorite.
   */
  const handleChange = (
    _event: React.SyntheticEvent,
    newValue: string | FavoriteProduct | null
  ): void => {
    if (newValue == null) {
      onNameChange('');
      return;
    }
    if (typeof newValue === 'string') {
      onNameChange(newValue);
      return;
    }
    // A FavoriteProduct object was selected from the list.
    onSelectFavorite(newValue);
  };

  return (
    <Autocomplete
      value={value}
      options={favorites}
      freeSolo
      autoSelect
      size="small"
      fullWidth
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;
        return option.name;
      }}
      isOptionEqualToValue={(option, val) => {
        if (typeof option === 'string' || typeof val === 'string') {
          return false;
        }
        return option.id === val.id;
      }}
      renderOption={(props, option) => {
        const fav = option as FavoriteProduct;
        return (
          <li {...props} key={fav.id}>
            <span className="flex justify-between items-center w-full">
              <span>{fav.name}</span>
              <span className="text-gray-400 text-sm ml-4">
                {formatCurrency(fav.defaultUnitPrice)}
              </span>
            </span>
          </li>
        );
      }}
      onChange={handleChange}
      onInputChange={(_e, inputValue, reason) => {
        // Sync free-text input as the user types.
        if (reason === 'input') {
          onNameChange(inputValue);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="商品名称"
          variant="standard"
        />
      )}
    />
  );
};

export default ProductNameInput;
