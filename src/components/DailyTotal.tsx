import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { type Product, formatCurrency } from '../types';

interface DailyTotalProps {
  /** The list of products for the current day. */
  products: Product[];
}

/**
 * Displays the daily total (sum of all product total prices) at the bottom.
 * Highlights the total prominently with a card-style layout.
 */
const DailyTotal: React.FC<DailyTotalProps> = ({ products }) => {
  const grandTotal = React.useMemo(() => {
    return products.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
  }, [products]);

  const itemCount = products.length;

  const totalQuantity = React.useMemo(() => {
    return products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  }, [products]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mt: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: 2,
        '@media (max-width: 600px)': {
          p: 2,
          mt: 2,
        },
      }}
    >
      <Box className="flex items-end justify-between flex-wrap gap-4">
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.85, mb: 0.5 }}>
            当日营业额合计
          </Typography>
          <Typography
            variant="h3"
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.75rem', sm: '3rem' },
            }}
          >
            {formatCurrency(grandTotal)}
          </Typography>
        </Box>
        <Box className="flex text-right" sx={{ gap: { xs: 2, sm: 3 } }}>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              商品种类
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {itemCount}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              商品总件数
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {totalQuantity}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default DailyTotal;
