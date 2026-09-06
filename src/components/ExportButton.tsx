import React from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import * as XLSX from 'xlsx';
import { type Product, type MonthlyStats } from '../types';

interface ExportButtonProps {
  /** Products for the currently selected date (for daily detail export). */
  products: Product[];
  /** ISO date string (YYYY-MM-DD) of the currently selected date. */
  selectedDate: string;
  /** Monthly stats for the currently viewed month. */
  monthlyStats: MonthlyStats;
}

/**
 * Renders a split-style "导出 Excel" button with two options:
 * 1. Export the current day's product detail.
 * 2. Export the current month's daily summary.
 *
 * Uses the SheetJS (xlsx) library to generate .xlsx files with formatted
 * headers. File names include the relevant date for easy identification.
 */
const ExportButton: React.FC<ExportButtonProps> = ({
  products,
  selectedDate,
  monthlyStats,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  /** Opens the export menu. */
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    setAnchorEl(e.currentTarget);
  };

  /** Closes the export menu. */
  const handleClose = (): void => {
    setAnchorEl(null);
  };

  /**
   * Exports the current day's product detail to an .xlsx file.
   * Columns: 序号, 商品名称, 数量, 单价, 总价.
   */
  const handleExportDaily = (): void => {
    handleClose();
    const rows = products.map((p, index) => ({
      序号: index + 1,
      商品名称: p.name,
      数量: p.quantity,
      单价: p.unitPrice,
      总价: p.totalPrice,
    }));

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ['序号', '商品名称', '数量', '单价', '总价'],
    });
    // Set column widths for readability.
    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '当日明细');
    XLSX.writeFile(wb, `营业额记录_${selectedDate}.xlsx`);
  };

  /**
   * Exports the current month's daily summary to an .xlsx file.
   * Columns: 序号, 日期, 商品种类数, 总件数, 当日营业额.
   */
  const handleExportMonthly = (): void => {
    handleClose();
    const rows = monthlyStats.dailyData.map((d, index) => ({
      序号: index + 1,
      日期: d.date,
      商品种类数: d.productCount,
      总件数: d.totalQuantity,
      当日营业额: d.revenue,
    }));

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ['序号', '日期', '商品种类数', '总件数', '当日营业额'],
    });
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '月度汇总');

    // Add a summary row sheet.
    const summaryRows = [
      { 指标: '月份', 值: monthlyStats.yearMonth },
      { 指标: '总营业额', 值: monthlyStats.totalRevenue },
      { 指标: '日均营业额', 值: Math.round(monthlyStats.averageRevenue * 100) / 100 },
      { 指标: '最高营业额', 值: monthlyStats.maxRevenue },
      { 指标: '最高营业额日期', 值: monthlyStats.maxRevenueDate ?? '无' },
      { 指标: '商品销售总件数', 值: monthlyStats.totalItems },
      { 指标: '有记录天数', 值: monthlyStats.recordCount },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    summaryWs['!cols'] = [{ wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, '汇总指标');

    XLSX.writeFile(wb, `营业额月度汇总_${monthlyStats.yearMonth}.xlsx`);
  };

  // Whether there's any data worth exporting for the current day.
  const hasDailyData = products.length > 0;
  const hasMonthlyData = monthlyStats.recordCount > 0;

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        startIcon={<DownloadIcon />}
        onClick={handleClick}
        size="medium"
        disabled={!hasDailyData && !hasMonthlyData}
      >
        导出 Excel
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleExportDaily} disabled={!hasDailyData}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="导出当日明细"
            secondary={hasDailyData ? selectedDate : '当日无数据'}
          />
        </MenuItem>
        <MenuItem onClick={handleExportMonthly} disabled={!hasMonthlyData}>
          <ListItemIcon>
            <CalendarMonthIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="导出月度汇总"
            secondary={
              hasMonthlyData
                ? `${monthlyStats.yearMonth}（${monthlyStats.recordCount}天）`
                : '当月无数据'
            }
          />
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportButton;
