import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, IconButton, Tooltip, MenuItem, Grid, InputAdornment,
  FormControl, InputLabel, Select, CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Payment as PaymentIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import tenantService from '../../services/tenantService';
import TenantPageShell from '../../components/tenant/TenantPageShell';
import { getApiErrorMessage, parseListResponse } from '../../utils/apiUtils';

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering
  const [filters, setFilters] = useState({ search: '', status: '' });
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  // Form states
  const [amountPaid, setAmountPaid] = useState('');
  const [monthFor, setMonthFor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY');
  const [mpesaPhone, setMpesaPhone] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchPayments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await tenantService.getPayments();
      setPayments(res.data?.payments || []);
      setSummary(res.data?.summary || null);
    } catch (e) { 
      setError(getApiErrorMessage(e, 'Failed to load payment history')); 
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = !filters.search || 
        (p.transaction_reference && p.transaction_reference.toLowerCase().includes(filters.search.toLowerCase())) ||
        (p.month_for_formatted && p.month_for_formatted.toLowerCase().includes(filters.search.toLowerCase()));
      const matchesStatus = !filters.status || p.status === filters.status;
      return matchesSearch && matchesStatus;
    });
  }, [payments, filters]);

  const handleOpenPay = async () => {
    setSelectedPayment(null);
    setDialogOpen(true);
    
    try {
      setUploading(true);
      const profileRes = await tenantService.getFullProfile();
      const unit = profileRes.data?.unit_info;
      const phone = profileRes.data?.phone_number;
      if (unit) setAmountPaid(unit.rent_amount || '');
      if (phone) setMpesaPhone(phone);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }

    // Auto-month selection: next unpaid month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Find all paid months
    const paidMonths = payments
      .filter(p => p.status === 'PAID')
      .map(p => new Date(p.month_for))
      .sort((a, b) => b - a); // Descending

    let targetMonth = currentMonthStart;
    if (paidMonths.length > 0) {
      const lastPaid = paidMonths[0];
      if (lastPaid >= currentMonthStart) {
        // Next month
        targetMonth = new Date(lastPaid.getFullYear(), lastPaid.getMonth() + 1, 1);
      }
    }

    setMonthFor(`${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}-01`);
    setPaymentMethod('MOBILE_MONEY');
  };

  const handleMpesaPayment = async () => {
    if (!amountPaid || !monthFor || !mpesaPhone) {
      setSnack({ open: true, message: 'Please fill in all details', severity: 'warning' });
      return;
    }

    // Normalize phone number (handle 07..., +254..., or 7...)
    let normalizedPhone = mpesaPhone.replace(/\s+/g, '').replace('+', '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '254' + normalizedPhone.substring(1);
    } else if (normalizedPhone.length === 9 && normalizedPhone.startsWith('7')) {
      normalizedPhone = '254' + normalizedPhone;
    } else if (normalizedPhone.startsWith('254')) {
      // already correct format
    } else {
      setSnack({ open: true, message: 'Invalid phone number format. Please enter a valid Safaricom number.', severity: 'error' });
      return;
    }

    setUploading(true);
    try {
      const data = {
        amount: amountPaid,
        month_for: monthFor,
        phone_number: normalizedPhone
      };
      const res = await tenantService.initiateMpesaStkPush(data);
      setSnack({ open: true, message: res.data.message || 'Check your phone for the M-Pesa prompt!', severity: 'success' });
      setDialogOpen(false);
      setTimeout(fetchPayments, 5000);
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'M-Pesa payment failed'), severity: 'error' });
    } finally { setUploading(false); }
  };

  const handleDownloadReceipt = async (payment) => {
    try {
      const response = await tenantService.downloadPaymentReceipt(payment.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${payment.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download receipt PDF.');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchPayments} />;

  return (
    <TenantPageShell
      title="Payments"
      subtitle="View your payment history and submit manual payments."
      right={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {summary && (
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem' }}>Total Paid</Typography>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
                KES {Number(summary.total_paid ?? 0).toLocaleString()}
              </Typography>
            </Box>
          )}
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<PaymentIcon />}
            onClick={handleOpenPay}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Make Payment
          </Button>
        </Box>
      }
    >
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by reference or month..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          sx={{ minWidth: { xs: '100%', sm: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            label="Status"
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="PAID">Paid</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="OVERDUE">Overdue</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {filteredPayments.length === 0 ? (
        <EmptyState message={payments.length === 0 ? "You have no payment records." : "No matching payments found."} />
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Amount (KES)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Due Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Payment Method</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{Number(p.amount_paid).toLocaleString()}</TableCell>
                  <TableCell>{p.month_for_formatted || p.month_for}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.status}
                      size="small"
                      color={p.status === 'PAID' ? 'success' : p.status === 'PENDING' ? 'warning' : p.status === 'OVERDUE' ? 'error' : 'default'}
                      sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell>{p.payment_method === 'MOBILE_MONEY' ? 'M-Pesa' : p.payment_method || '—'}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      {p.status === 'PAID' && (
                        <Tooltip title="Download Receipt">
                          <IconButton size="small" onClick={() => handleDownloadReceipt(p)} sx={{ bgcolor: '#f0fdf4', color: '#16a34a' }}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle sx={{ px: 3, py: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight={800}>
              M-Pesa Payment
            </Typography>
            <IconButton onClick={() => setDialogOpen(false)} size="small"><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2 }}>
          <Box sx={{ py: 2 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  The prompt will be sent to the number below. Ensure you have the required balance in your M-Pesa.
                </Alert>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Amount (KES)" 
                  type="number" 
                  value={amountPaid} 
                  onChange={(e) => setAmountPaid(e.target.value)}
                  helperText={summary?.rent_amount ? `Monthly rent: KES ${Number(summary.rent_amount).toLocaleString()}` : ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Target Month" 
                  type="month" 
                  InputLabelProps={{ shrink: true }} 
                  value={monthFor.substring(0, 7)} 
                  onChange={(e) => setMonthFor(e.target.value ? `${e.target.value}-01` : '')} 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="M-Pesa Phone Number" 
                  value={mpesaPhone} 
                  onChange={(e) => setMpesaPhone(e.target.value)} 
                  placeholder="e.g. 0712345678 or 254712345678" 
                  helperText="Enter your Safaricom number to receive the STK prompt."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={handleMpesaPayment} 
            disabled={uploading || !amountPaid || !monthFor || !mpesaPhone}
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <PaymentIcon />}
            sx={{ px: 4, py: 1, borderRadius: 2, fontWeight: 700 }}
          >
            {uploading ? 'Processing...' : 'Pay with M-Pesa'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </TenantPageShell>
  );
}
