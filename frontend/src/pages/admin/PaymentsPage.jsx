import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Button, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const getApiErrorMessage = (e, fallback) => {
    const data = e?.response?.data;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    try {
      const firstKey = Object.keys(data)[0];
      const val = data[firstKey];
      if (Array.isArray(val)) return val[0];
      if (typeof val === 'string') return val;
    } catch {
      // ignore
    }
    return fallback;
  };

  const currentYear = new Date().getFullYear();

  const fetchPayments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminService.getPayments();
      const payload = res.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload?.payments)
        ? payload.payments
        : [];
      setPayments(list);
    } catch (e) { setError(getApiErrorMessage(e, 'Failed to load payments')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleConfirm = async (id) => {
    try {
      await adminService.confirmPayment(id);
      setSnack({ open: true, message: 'Payment confirmed', severity: 'success' });
      fetchPayments();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to confirm payment'), severity: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchPayments} />;

  return (
    <AdminPageShell
      title="Payments"
      subtitle="Review and confirm tenant payments."
      right={
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter by Month</InputLabel>
          <Select value={month} label="Filter by Month" onChange={(e) => setMonth(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {[
              { label: 'January', value: '1' },
              { label: 'February', value: '2' },
              { label: 'March', value: '3' },
              { label: 'April', value: '4' },
              { label: 'May', value: '5' },
              { label: 'June', value: '6' },
              { label: 'July', value: '7' },
              { label: 'August', value: '8' },
              { label: 'September', value: '9' },
              { label: 'October', value: '10' },
              { label: 'November', value: '11' },
              { label: 'December', value: '12' },
            ].map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      }
      loading={loading}
      error={error}
      onRetry={fetchPayments}
    >
      {(!Array.isArray(payments) || payments.length === 0) ? <EmptyState message="No payments found" /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow>
              <TableCell>Tenant</TableCell><TableCell>Amount</TableCell><TableCell>Month</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>{payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.tenant_name || p.tenant_email || p.tenant || '—'}</TableCell>
                <TableCell>{p.amount_paid ?? '—'}</TableCell>
                <TableCell>{p.month_for_formatted || '—'}</TableCell>
                <TableCell>
                  <Chip label={p.status} size="small"
                    color={p.status === 'PAID' ? 'success' : p.status === 'PENDING' ? 'warning' : p.status === 'OVERDUE' ? 'error' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  {p.status !== 'PAID' && (
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
    </AdminPageShell>
  );
}
