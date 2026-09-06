import React from 'react';
import { Box, TextField, IconButton } from '@mui/material';

interface DateSelectorProps {
  /** The currently selected date in YYYY-MM-DD format. */
  value: string;
  /** Callback when the user selects a different date. */
  onChange: (date: string) => void;
}

/**
 * A date selector component using a native date input styled with MUI.
 *
 * Allows the user to pick any date to view or edit that day's sales records.
 * Includes "Prev Day" and "Next Day" buttons for quick navigation,
 * and a "Today" button to jump back to the current date.
 */
const DateSelector: React.FC<DateSelectorProps> = ({ value, onChange }) => {
  /** Formats a Date to YYYY-MM-DD in local time. */
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /** Navigates to the previous day. */
  const handlePrevDay = (): void => {
    const [y, m, d] = value.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    current.setDate(current.getDate() - 1);
    onChange(formatDate(current));
  };

  /** Navigates to the next day. */
  const handleNextDay = (): void => {
    const [y, m, d] = value.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    current.setDate(current.getDate() + 1);
    onChange(formatDate(current));
  };

  /** Jumps to today's date. */
  const handleToday = (): void => {
    onChange(formatDate(new Date()));
  };

  /** Formats the selected date into a human-readable Chinese label. */
  const dateLabel = React.useMemo(() => {
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${y}年${m}月${d}日 ${weekdays[date.getDay()]}`;
  }, [value]);

  const todayKey = formatDate(new Date());
  const isToday = value === todayKey;

  return (
    <Box className="flex items-center gap-2 flex-wrap">
      <IconButton onClick={handlePrevDay} aria-label="前一天" size="small">
        ‹
      </IconButton>
      <TextField
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        sx={{ width: 170 }}
        inputProps={{ 'aria-label': '选择日期' }}
      />
      <IconButton onClick={handleNextDay} aria-label="后一天" size="small">
        ›
      </IconButton>
      {!isToday && (
        <button
          onClick={handleToday}
          className="ml-1 px-3 py-1 text-sm rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
        >
          回到今天
        </button>
      )}
      <span className="text-sm text-gray-600 ml-1">{dateLabel}</span>
    </Box>
  );
};

export default DateSelector;
