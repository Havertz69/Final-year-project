import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Button, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';
import { getApiErrorMessage, parseListResponse } from '../../utils/apiUtils';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [pRes, propRes] = await Promise.all([
        adminService.getPayments(),
        adminService.getProperties()
      ]);
      setPayments(parseListResponse(pRes.data));
      setProperties(parseListResponse(propRes.data));
    } catch (e) { setError(getApiErrorMessage(e, 'Failed to load payments')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = !searchTerm || 
        (p.tenant_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.tenant_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.unit_number || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProperty = !propertyFilter || p.property_id === propertyFilter;
      
      let matchesMonth = true;
      if (monthFilter) {
        // month_for is usually "YYYY-MM-DD"
        const pMonth = new Date(p.month_for).getMonth() + 1;
        matchesMonth = pMonth === parseInt(monthFilter);
      }
      
      return matchesSearch && matchesProperty && matchesMonth;
    });
  }, [payments, searchTerm, propertyFilter, monthFilter]);

  const handleConfirm = async (id) => {
    try {
      await adminService.confirmPayment(id);
      setSnack({ open: true, message: 'Payment confirmed', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to confirm payment'), severity: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <AdminPageShell
      title="Payments"
      subtitle="Review and confirm tenant payments."
      loading={loading}
      error={error}
      onRetry={fetchData}
    >
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search tenant or unit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter by Month</InputLabel>
          <Select value={monthFilter} label="Filter by Month" onChange={(e) => setMonthFilter(e.target.value)}>
            <MenuItem value="">All Months</MenuItem>
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
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Property</InputLabel>
          <Select value={propertyFilter} label="Filter by Property" onChange={(e) => setPropertyFilter(e.target.value)}>
            <MenuItem value="">All Properties</MenuItem>
            {properties.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {filteredPayments.length === 0 ? <EmptyState message={payments.length === 0 ? "No payments found" : "No matching payments"} /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow>
              <TableCell>Tenant</TableCell><TableCell>Amount</TableCell><TableCell>Month</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>{filteredPayments.map((p) => (
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
