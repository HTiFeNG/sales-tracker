import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Divider,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import { useSalesRecords } from '../hooks/useSalesRecords';
import { useFavoriteProducts } from '../hooks/useFavoriteProducts';
import {
  formatDateKey,
  getYearMonth,
  formatCurrency,
} from '../types';
import DateSelector from './DateSelector';
import ProductRow from './ProductRow';
import DailyTotal from './DailyTotal';
import MonthlyChart from './MonthlyChart';
import ExportButton from './ExportButton';

/** Tab identifiers for the main view switcher. */
type ActiveTab = 'daily' | 'monthly';

/**
 * The main sales tracker container component.
 *
 * Orchestrates the date selector, product table, add-product button,
 * and daily total display. Manages the selected date state and delegates
 * CRUD operations to the useSalesRecords hook.
 *
 * Also provides:
 * - Tab switching between "明细记录" (daily detail) and "月度统计" (monthly chart).
 * - Excel export for daily detail and monthly summary.
 * - Favorite products management with quick-select autocomplete.
 */
const SalesTracker: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatDateKey(new Date())
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');

  // The month currently displayed in the monthly chart.
  const [chartMonth, setChartMonth] = useState<string>(() =>
    getYearMonth(selectedDate)
  );

  // Favorites dialog open state.
  const [favoritesOpen, setFavoritesOpen] = useState<boolean>(false);

  /**
   * Responsive breakpoint: on screens ≤ 600 CSS px wide (i.e. phones in
   * portrait), we switch the product list from a horizontal table to a
   * vertical card layout so that every field stays visible and operable
   * without horizontal scrolling.
   */
  const isMobile: boolean = useMediaQuery('(max-width:600px)');

  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    getMonthlyStats,
  } = useSalesRecords(selectedDate);

  const {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
  } = useFavoriteProducts();

  /** Memoized sorted products (display order remains stable). */
  const sortedProducts = useMemo(() => products, [products]);

  /** Monthly stats for the currently viewed chart month. */
  const monthlyStats = useMemo(
    () => getMonthlyStats(chartMonth),
    [getMonthlyStats, chartMonth]
  );

  /**
   * Navigates to the previous month in the chart.
   * Handles year boundary (January → December of previous year).
   */
  const handlePrevMonth = (): void => {
    const [y, m] = chartMonth.split('-').map(Number);
    let year = y;
    let month = m - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    setChartMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  /**
   * Navigates to the next month in the chart.
   * Handles year boundary (December → January of next year).
   */
  const handleNextMonth = (): void => {
    const [y, m] = chartMonth.split('-').map(Number);
    let year = y;
    let month = m + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    setChartMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  /**
   * Handles tab switching. When switching to the monthly tab,
   * syncs the chart month to the currently selected date's month.
   */
  const handleTabChange = (
    _e: React.SyntheticEvent,
    newValue: ActiveTab
  ): void => {
    setActiveTab(newValue);
    if (newValue === 'monthly') {
      setChartMonth(getYearMonth(selectedDate));
    }
  };

  /**
   * Handles adding a product to favorites.
   * Delegates to the useFavoriteProducts hook.
   */
  const handleAddFavorite = (name: string, unitPrice: number): void => {
    addFavorite(name, unitPrice);
  };

  return (
    <Box className="max-w-5xl mx-auto p-4 md:p-6">
      {/* Header */}
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 700,
          mb: 1,
          fontSize: { xs: '1.5rem', sm: '2.125rem' },
        }}
      >
        每日营业额记录
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        记录每天的商品销售明细，自动计算营业额。数据保存在本地浏览器，刷新不丢失。
      </Typography>

      {/* Tab switcher */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="明细记录" value="daily" />
        <Tab label="月度统计" value="monthly" />
      </Tabs>

      {/* ===== Daily Detail View ===== */}
      {activeTab === 'daily' && (
        <>
          {/* Date selector */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              border: '1px solid #e0e0e0',
              borderRadius: 2,
            }}
          >
            <DateSelector value={selectedDate} onChange={setSelectedDate} />
          </Paper>

          {/* Toolbar: add product, export, manage favorites */}
          <Box className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <Typography
              variant="h6"
              component="h2"
              sx={{ fontSize: { xs: '1.05rem', sm: '1.25rem' } }}
            >
              商品明细
            </Typography>
            <Box className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setFavoritesOpen(true)}
                size={isMobile ? 'small' : 'medium'}
                color="secondary"
              >
                管理常用商品
              </Button>
              <ExportButton
                products={sortedProducts}
                selectedDate={selectedDate}
                monthlyStats={monthlyStats}
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={addProduct}
                size={isMobile ? 'small' : 'medium'}
              >
                添加商品
              </Button>
            </Box>
          </Box>

          {/* Product list — responsive: table on desktop, cards on mobile */}
          {isMobile ? (
            /* ---- Mobile: vertical card list ---- */
            <Box>
              {sortedProducts.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    py: 8,
                    px: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    该日期暂无记录
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    点击「添加商品」开始记录今日营业额
                  </Typography>
                </Paper>
              ) : (
                sortedProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onUpdate={updateProduct}
                    onDelete={deleteProduct}
                    favorites={favorites}
                    onAddFavorite={handleAddFavorite}
                    isAlreadyFavorite={isFavorite(product.name)}
                    variant="card"
                  />
                ))
              )}
            </Box>
          ) : (
            /* ---- Desktop: horizontal table ---- */
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Table size="medium">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 700 }}>
                      商品名称
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 160 }}>
                      数量
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 120 }}>
                      单价
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 160 }}>
                      总价
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 700, width: 60 }}
                      align="center"
                    >
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        align="center"
                        sx={{ py: 8, color: 'text.secondary' }}
                      >
                        <Box className="flex flex-col items-center gap-2">
                          <Typography variant="body1" color="text.secondary">
                            该日期暂无记录
                          </Typography>
                          <Typography variant="body2" color="text.disabled">
                            点击「添加商品」开始记录今日营业额
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedProducts.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        onUpdate={updateProduct}
                        onDelete={deleteProduct}
                        favorites={favorites}
                        onAddFavorite={handleAddFavorite}
                        isAlreadyFavorite={isFavorite(product.name)}
                        variant="table"
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Daily total */}
          <DailyTotal products={sortedProducts} />
        </>
      )}

      {/* ===== Monthly Statistics View ===== */}
      {activeTab === 'monthly' && (
        <MonthlyChart
          stats={monthlyStats}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
      )}

      {/* ===== Favorites Management Dialog ===== */}
      <Dialog
        open={favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box className="flex items-center gap-1">
            <StarIcon sx={{ color: '#f9a825' }} />
            常用商品管理
          </Box>
          <IconButton
            onClick={() => setFavoritesOpen(false)}
            size="small"
            aria-label="关闭"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {favorites.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              暂无常用商品。在商品行中点击星标按钮即可添加。
            </Typography>
          ) : (
            <List>
              {favorites.map((fav) => (
                <ListItem
                  key={fav.id}
                  divider
                  secondaryAction={
                    <Tooltip title="删除此常用商品">
                      <IconButton
                        edge="end"
                        onClick={() => removeFavorite(fav.id)}
                        aria-label="删除常用商品"
                        color="error"
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={fav.name}
                    secondary={`默认单价：${formatCurrency(fav.defaultUnitPrice)}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFavoritesOpen(false)} variant="contained">
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesTracker;
