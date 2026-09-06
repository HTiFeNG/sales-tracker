import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  IconButton,
} from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from 'recharts';
import {
  type MonthlyStats,
  type MonthlyDayData,
  formatCurrency,
  parseDateKey,
} from '../types';

interface MonthlyChartProps {
  /** Aggregated monthly statistics to display. */
  stats: MonthlyStats;
  /** Callback to navigate to the previous month. */
  onPrevMonth: () => void;
  /** Callback to navigate to the next month. */
  onNextMonth: () => void;
}

/**
 * Monthly statistics view with a bar chart and summary cards.
 *
 * Shows the daily revenue for the selected month as a bar chart, plus
 * summary metrics: total monthly revenue, daily average, highest-revenue
 * day, and total items sold. Prev/next buttons let the user navigate
 * between months.
 */
const MonthlyChart: React.FC<MonthlyChartProps> = ({
  stats,
  onPrevMonth,
  onNextMonth,
}) => {
  /** Chart data with short date labels for the X axis. */
  const chartData = useMemo(() => {
    return stats.dailyData.map((d: MonthlyDayData) => ({
      ...d,
      shortDate: d.date.slice(5), // "07-26"
    }));
  }, [stats.dailyData]);

  /** Formats a Y-axis tick value as currency. */
  const formatYAxisTick = (value: number): string => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`;
    }
    return value.toFixed(0);
  };

  /** Tooltip content for each bar. */
  const renderTooltip = (
    props: TooltipProps<number, string>
  ): React.ReactNode => {
    if (!props.active || !props.payload || props.payload.length === 0) {
      return null;
    }
    const day = props.payload[0].payload as MonthlyDayData & {
      shortDate: string;
    };
    return (
      <Box
        sx={{
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          p: 1.5,
          boxShadow: 2,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {day.date}
        </Typography>
        <Typography variant="body2" color="primary">
          营业额：{formatCurrency(day.revenue)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          商品种类：{day.productCount} · 件数：{day.totalQuantity}
        </Typography>
      </Box>
    );
  };

  /** Index of the peak day for highlighting. */
  const peakIndex = useMemo(() => {
    let maxRev = 0;
    let idx = -1;
    stats.dailyData.forEach((d, i) => {
      if (d.revenue > maxRev) {
        maxRev = d.revenue;
        idx = i;
      }
    });
    return idx;
  }, [stats.dailyData]);

  /** Human-readable month label, e.g. "2026年7月". */
  const monthLabel = useMemo(() => {
    const [year, month] = stats.yearMonth.split('-').map(Number);
    return `${year}年${month}月`;
  }, [stats.yearMonth]);

  /** Human-readable peak date, e.g. "7月26日". */
  const peakDateLabel = useMemo(() => {
    if (!stats.maxRevenueDate) return '—';
    const d = parseDateKey(stats.maxRevenueDate);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }, [stats.maxRevenueDate]);

  const hasData = stats.recordCount > 0;

  return (
    <Box>
      {/* Month navigation + title */}
      <Box className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Typography variant="h6" component="h2">
          月度统计 — {monthLabel}
        </Typography>
        <Box className="flex items-center gap-1">
          <IconButton onClick={onPrevMonth} size="small" aria-label="上一月">
            <ChevronLeft />
          </IconButton>
          <IconButton onClick={onNextMonth} size="small" aria-label="下一月">
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      {hasData ? (
        <>
          {/* Summary cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  当月总营业额
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565c0' }}>
                  {formatCurrency(stats.totalRevenue)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  日均营业额
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                  {formatCurrency(stats.averageRevenue)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  最高营业额日
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#e65100' }}>
                  {formatCurrency(stats.maxRevenue)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {peakDateLabel}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#f3e5f5', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  商品销售总件数
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#7b1fa2' }}>
                  {stats.totalItems}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Bar chart */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              height: 360,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e0e0e0"
                />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#ccc' }}
                />
                <YAxis
                  tickFormatter={formatYAxisTick}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#ccc' }}
                />
                <RechartsTooltip
                  content={renderTooltip}
                  cursor={{ fill: 'rgba(25, 118, 210, 0.08)' }}
                />
                <Bar
                  dataKey="revenue"
                  name="营业额"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === peakIndex ? '#e65100' : '#1976d2'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            橙色柱表示当月最高营业额日，蓝色为其余各日。X 轴为日期（月-日），Y 轴为营业额（元）。
          </Typography>
        </>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            {stats.yearMonth} 暂无营业记录
          </Typography>
          <Typography variant="body2" color="text.disabled">
            请在「明细记录」中添加商品数据后回到此查看统计
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default MonthlyChart;
