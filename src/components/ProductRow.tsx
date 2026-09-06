import React from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  TableCell,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { type Product, type FavoriteProduct, formatCurrency } from '../types';
import ProductNameInput from './ProductNameInput';

/** Layout variant for a product entry. */
type ProductRowVariant = 'table' | 'card';

interface ProductRowProps {
  /** The product data to display and edit. */
  product: Product;
  /** Callback to update this product with partial fields. */
  onUpdate: (id: string, updates: Partial<Product>) => void;
  /** Callback to delete this product row. */
  onDelete: (id: string) => void;
  /** Favorite products for the quick-select dropdown. Optional — defaults to empty. */
  favorites?: FavoriteProduct[];
  /** Callback to add the current product to favorites. Optional — if not provided, the star button is hidden. */
  onAddFavorite?: (name: string, unitPrice: number) => void;
  /** Whether this product's name is already in favorites. Optional. */
  isAlreadyFavorite?: boolean;
  /**
   * Layout variant.
   * - 'table' (default): renders as a `<TableRow>` with `<TableCell>`s for desktop.
   * - 'card': renders as a vertical `Paper` card for narrow (mobile) screens.
   */
  variant?: ProductRowVariant;
}

/**
 * A single product entry in the sales tracker.
 *
 * Displays editable fields for product name, quantity (with +/- buttons),
 * unit price, and total price.
 *
 * Implements the linkage logic:
 * - By default, totalPrice = unitPrice × quantity (auto-linked, shown by a Link icon).
 * - When the user manually edits totalPrice, the row enters "manual mode"
 *   (shown by a LinkOff icon). totalPrice is no longer auto-calculated.
 * - When the user edits unitPrice or quantity (including +/- buttons),
 *   linkage is restored: isManualMode = false and totalPrice recalculates.
 *
 * Also supports quick-select of favorite products via an autocomplete dropdown
 * on the product name field, and a star button to add the current entry to
 * the favorites list.
 *
 * The component supports two layout variants:
 * - `variant='table'` (default): a horizontal table row for wide screens.
 * - `variant='card'`: a vertical card for narrow (mobile) screens, so that
 *   all fields remain visible and operable without horizontal scrolling.
 */
const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onUpdate,
  onDelete,
  favorites = [],
  onAddFavorite,
  isAlreadyFavorite = false,
  variant = 'table',
}) => {
  const { id, name, quantity, unitPrice, totalPrice, isManualMode } = product;

  /**
   * Handles quantity increment (+1).
   * Editing quantity restores auto-linkage.
   */
  const handleIncrement = (): void => {
    const newQty = quantity + 1;
    onUpdate(id, {
      quantity: newQty,
      totalPrice: newQty * unitPrice,
      isManualMode: false,
    });
  };

  /**
   * Handles quantity decrement (-1, minimum 0).
   * Editing quantity restores auto-linkage.
   */
  const handleDecrement = (): void => {
    const newQty = Math.max(0, quantity - 1);
    onUpdate(id, {
      quantity: newQty,
      totalPrice: newQty * unitPrice,
      isManualMode: false,
    });
  };

  /**
   * Handles manual quantity text input.
   * Editing quantity restores auto-linkage.
   */
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value;
    const parsed = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
    onUpdate(id, {
      quantity: parsed,
      totalPrice: parsed * unitPrice,
      isManualMode: false,
    });
  };

  /**
   * Handles unit price changes.
   * Editing unit price restores auto-linkage and recalculates total.
   */
  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value;
    const parsed = raw === '' ? 0 : parseFloat(raw);
    const safePrice = isNaN(parsed) ? 0 : Math.max(0, parsed);
    onUpdate(id, {
      unitPrice: safePrice,
      totalPrice: safePrice * quantity,
      isManualMode: false,
    });
  };

  /**
   * Handles manual total price changes.
   * This enters "manual mode" — linkage is broken.
   */
  const handleTotalPriceChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value;
    const parsed = raw === '' ? 0 : parseFloat(raw);
    const safeTotal = isNaN(parsed) ? 0 : Math.max(0, parsed);
    onUpdate(id, {
      totalPrice: safeTotal,
      isManualMode: true,
    });
  };

  /** Handles product name text changes (free typing). */
  const handleNameChange = (newName: string): void => {
    onUpdate(id, { name: newName });
  };

  /**
   * Handles selection of a favorite product from the dropdown.
   * Auto-fills the name, unit price, and recalculates total.
   */
  const handleSelectFavorite = (favorite: FavoriteProduct): void => {
    const newUnitPrice = favorite.defaultUnitPrice;
    onUpdate(id, {
      name: favorite.name,
      unitPrice: newUnitPrice,
      totalPrice: newUnitPrice * quantity,
      isManualMode: false,
    });
  };

  /** Handles row deletion. */
  const handleDelete = (): void => {
    onDelete(id);
  };

  /**
   * Handles adding the current product to the favorites list.
   * Only fires when a name and (optionally) unit price are present.
   */
  const handleAddFavorite = (): void => {
    if (onAddFavorite && name.trim()) {
      onAddFavorite(name.trim(), unitPrice);
    }
  };

  /** The expected total if auto-linked (for tooltip display). */
  const expectedTotal = unitPrice * quantity;

  /** The linkage tooltip text, shared by both layouts. */
  const linkageTooltip = isManualMode
    ? `手动模式：总价已手动修改，不再自动联动（联动值应为 ${formatCurrency(expectedTotal)}）`
    : `联动模式：总价 = 单价 × 数量 = ${formatCurrency(expectedTotal)}`;

  // -------------------------------------------------------------------------
  // Reusable field fragments — rendered identically in both layouts so that
  // behaviour (handlers, aria-labels, input styling) is guaranteed consistent.
  // -------------------------------------------------------------------------

  /**
   * Card-layout specific input styling: a subtle background highlight on focus
   * for better touch UX. Only applied in the card (mobile) variant; the table
   * (desktop) variant is left untouched.
   */
  const cardInputSx = {
    '& .MuiInputBase-root': {
      borderRadius: 1,
      px: 0.5,
      '&.Mui-focused': {
        backgroundColor: 'rgba(25, 118, 210, 0.04)',
      },
    },
  };

  /** Star (favorite) button — rendered when onAddFavorite is provided. */
  const starButton = onAddFavorite ? (
    <Tooltip
      title={isAlreadyFavorite ? '已加入常用商品' : '加入常用商品'}
    >
      <IconButton
        onClick={handleAddFavorite}
        size="small"
        aria-label="加入常用"
        disabled={!name.trim()}
        sx={{ width: 28, height: 28 }}
      >
        {isAlreadyFavorite ? (
          <StarIcon sx={{ fontSize: 18, color: '#f9a825' }} />
        ) : (
          <StarBorderIcon sx={{ fontSize: 18, color: '#bdbdbd' }} />
        )}
      </IconButton>
    </Tooltip>
  ) : null;

  /** Quantity stepper: [-1] input [+1]. */
  const quantityStepper = (
    <>
      <IconButton
        onClick={handleDecrement}
        size="small"
        disabled={quantity <= 0}
        aria-label="减少数量"
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          width: variant === 'card' ? 32 : 28,
          height: variant === 'card' ? 32 : 28,
        }}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <TextField
        type="number"
        value={quantity}
        onChange={handleQuantityChange}
        variant="standard"
        size="small"
        inputProps={{
          min: 0,
          step: 1,
          style: { textAlign: 'center', width: 50 },
        }}
      />
      <IconButton
        onClick={handleIncrement}
        size="small"
        aria-label="增加数量"
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          width: variant === 'card' ? 32 : 28,
          height: variant === 'card' ? 32 : 28,
        }}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </>
  );

  /** Unit price input field. Shows empty (with placeholder) when value is 0. */
  const unitPriceField = (
    <TextField
      type="number"
      value={unitPrice === 0 ? '' : unitPrice}
      onChange={handleUnitPriceChange}
      variant="standard"
      size="small"
      fullWidth
      placeholder="0.00"
      inputProps={{
        min: 0,
        step: 0.01,
        style: { textAlign: 'right' },
      }}
      InputProps={{
        endAdornment: <span className="text-gray-400 text-sm">元</span>,
      }}
      sx={variant === 'card' ? cardInputSx : undefined}
    />
  );

  /**
   * Total price input field (without the linkage icon).
   * Shows empty (with placeholder) when value is 0.
   * Split from the icon so that the card and table layouts can position the
   * icon independently (card: icon before field; table: icon after field).
   */
  const totalPriceTextField = (
    <TextField
      type="number"
      value={totalPrice === 0 ? '' : totalPrice}
      onChange={handleTotalPriceChange}
      variant="standard"
      size="small"
      fullWidth
      placeholder="0.00"
      inputProps={{
        min: 0,
        step: 0.01,
        style: {
          textAlign: 'right',
          color: isManualMode ? '#d32f2f' : 'inherit',
          fontWeight: isManualMode ? 600 : 400,
        },
      }}
      InputProps={{
        endAdornment: <span className="text-gray-400 text-sm">元</span>,
      }}
      sx={{
        '& .MuiInput-root::before': {
          borderColor: isManualMode ? '#d32f2f' : 'rgba(0,0,0,0.42)',
        },
        ...(variant === 'card' ? cardInputSx : {}),
      }}
    />
  );

  /**
   * Linkage indicator icon (Link = auto-calculated, LinkOff = manual mode).
   * Shared by both layouts; the placement order is decided by each layout.
   */
  const totalPriceLinkIcon = (
    <Tooltip title={linkageTooltip}>
      {isManualMode ? (
        <LinkOffIcon sx={{ fontSize: 18, color: '#d32f2f' }} />
      ) : (
        <LinkIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
      )}
    </Tooltip>
  );

  /** Delete button. */
  const deleteButton = (
    <IconButton
      onClick={handleDelete}
      size="small"
      aria-label="删除此行"
      color="error"
    >
      <DeleteIcon fontSize="small" />
    </IconButton>
  );

  // =========================================================================
  // CARD LAYOUT (mobile / narrow screens)
  // =========================================================================
  if (variant === 'card') {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 1.5,
          border: '1px solid #e0e0e0',
          borderRadius: 2,
        }}
      >
        {/* Row 1: product name (grows) + star + delete */}
        <Box className="flex items-center" sx={{ gap: 1, mb: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ProductNameInput
              value={name}
              favorites={favorites}
              onNameChange={handleNameChange}
              onSelectFavorite={handleSelectFavorite}
            />
          </Box>
          {starButton}
          {deleteButton}
        </Box>

        {/* Row 2: quantity stepper */}
        <Box className="flex items-center" sx={{ gap: 1.5, mb: 1.5 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minWidth: 48, flexShrink: 0 }}
          >
            数量
          </Typography>
          {quantityStepper}
        </Box>

        {/* Row 3: unit price */}
        <Box className="flex items-center" sx={{ gap: 1.5, mb: 1.5 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minWidth: 48, flexShrink: 0 }}
          >
            单价
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>{unitPriceField}</Box>
        </Box>

        {/* Row 4: total price + linkage indicator.
            The link icon is placed BEFORE the input (left side) and the
            container is an explicit flex row so that the icon is never
            pushed to a second line when horizontal space is tight. */}
        <Box className="flex items-center" sx={{ gap: 1.5 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minWidth: 48, flexShrink: 0 }}
          >
            总价
          </Typography>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box sx={{ flexShrink: 0 }}>{totalPriceLinkIcon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>{totalPriceTextField}</Box>
          </Box>
        </Box>
      </Paper>
    );
  }

  // =========================================================================
  // TABLE LAYOUT (desktop / wide screens) — unchanged from original
  // =========================================================================
  return (
    <TableRow
      hover
      sx={{
        '&:last-child td': { border: 0 },
      }}
    >
      {/* Product name with autocomplete quick-select */}
      <TableCell sx={{ minWidth: 160, maxWidth: 260 }}>
        <Box className="flex items-center gap-1">
          <ProductNameInput
            value={name}
            favorites={favorites}
            onNameChange={handleNameChange}
            onSelectFavorite={handleSelectFavorite}
          />
          {starButton}
        </Box>
      </TableCell>

      {/* Quantity with +1 / -1 buttons */}
      <TableCell sx={{ minWidth: 160 }}>
        <Box className="flex items-center gap-1">{quantityStepper}</Box>
      </TableCell>

      {/* Unit price */}
      <TableCell sx={{ minWidth: 120 }}>{unitPriceField}</TableCell>

      {/* Total price with linkage indicator (icon after field — desktop) */}
      <TableCell sx={{ minWidth: 160 }}>
        <Box className="flex items-center gap-1">
          {totalPriceTextField}
          {totalPriceLinkIcon}
        </Box>
      </TableCell>

      {/* Delete button */}
      <TableCell align="center" sx={{ width: 60 }}>
        {deleteButton}
      </TableCell>
    </TableRow>
  );
};

export default ProductRow;
