import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip,
} from '@mui/material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import tenantService from '../../services/tenantService';

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await tenantService.getPayments();
      setPayments(res.data?.payments || []);
      setSummary(res.data?.summary || null);
    }
    catch (e) { setError(e.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchPayments} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5">Payments</Typography>
          <Typography variant="body2" color="text.secondary">
            View your payment history and current rent status.
          </Typography>
        </Box>
        {summary && (
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="body2" color="text.secondary">Total Paid</Typography>
            <Typography variant="h6">KES {summary.total_paid ?? 0}</Typography>
            <Typography variant="body2" color="text.secondary">
              Overdue: {summary.overdue_count ?? 0}
            </Typography>
          </Box>
        )}
      </Box>

      {payments.length === 0 ? <EmptyState message="No payment history" /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow>
              <TableCell>Amount</TableCell><TableCell>Month</TableCell><TableCell>Status</TableCell><TableCell>Method</TableCell>
            </TableRow></TableHead>
            <TableBody>{payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.amount_paid}</TableCell>
                <TableCell>{p.month_for_formatted || p.month_for}</TableCell>
                <TableCell>
                  <Chip
                    label={p.status}
                    size="small"
                    color={p.status === 'PAID' ? 'success' : p.status === 'PENDING' ? 'warning' : p.status === 'OVERDUE' ? 'error' : 'default'}
                  />
                </TableCell>
                <TableCell>{p.payment_method || '—'}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
