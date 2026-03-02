import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Button, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import adminService from '../../services/adminService';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchPayments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminService.getPayments(month ? { month } : {});
      setPayments(res.data);
    } catch (e) { setError(e.response?.data?.message || 'Failed to load payments'); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleConfirm = async (id) => {
    try {
      await adminService.confirmPayment(id);
      setSnack({ open: true, message: 'Payment confirmed', severity: 'success' });
      fetchPayments();
    } catch (e) {
      setSnack({ open: true, message: e.response?.data?.message || 'Error', severity: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchPayments} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5">Payments</Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter by Month</InputLabel>
          <Select value={month} label="Filter by Month" onChange={(e) => setMonth(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m =>
              <MenuItem key={m} value={m}>{m}</MenuItem>
            )}
          </Select>
        </FormControl>
      </Box>
      {payments.length === 0 ? <EmptyState message="No payments found" /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow>
              <TableCell>Tenant</TableCell><TableCell>Amount</TableCell><TableCell>Month</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>{payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.tenant_id}</TableCell>
                <TableCell>{p.amount}</TableCell>
                <TableCell>{p.month}</TableCell>
                <TableCell>
                  <Chip label={p.status} size="small"
                    color={p.status === 'confirmed' ? 'success' : p.status === 'pending' ? 'warning' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  {p.status !== 'confirmed' && (
                    <Button size="small" variant="outlined" color="success" onClick={() => handleConfirm(p.id)}>Confirm</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      )}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
