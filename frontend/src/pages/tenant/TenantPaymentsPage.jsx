import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, IconButton, Tooltip, MenuItem, Grid, InputAdornment,
  Stepper, Step, StepLabel, Divider, FormControl, InputLabel, Select, CircularProgress
} from '@mui/material';
import {
  UploadFile as UploadFileIcon,
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
  const [dialogMode, setDialogMode] = useState('UPLOAD'); // 'UPLOAD' or 'PAY'
  const [activeStep, setActiveStep] = useState(0); 
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  // Form states
  const [amountPaid, setAmountPaid] = useState('');
  const [monthFor, setMonthFor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY');
  const [transactionRef, setTransactionRef] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  
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

  const handleOpenUpload = (payment) => {
    setSelectedPayment(payment);
    setDialogMode('UPLOAD');
    setEvidenceFile(null);
    setDialogOpen(true);
  };

  const handleOpenPay = async () => {
    setSelectedPayment(null);
    setDialogMode('PAY');
    setActiveStep(0);
    
    try {
      setUploading(true);
      const profileRes = await tenantService.getFullProfile();
      const unit = profileRes.data?.unit_info;
      if (unit) setAmountPaid(unit.rent_amount || '');
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }

    const now = new Date();
    setMonthFor(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
    setPaymentMethod('BANK_TRANSFER');
    setTransactionRef('');
    setEvidenceFile(null);
    setDialogOpen(true);
  };

  const nextStep = () => setActiveStep(prev => prev + 1);
  const prevStep = () => setActiveStep(prev => prev - 1);

  const handleUploadEvidenceOnly = async () => {
    if (!evidenceFile || !selectedPayment) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('payment', selectedPayment.id);
      formData.append('file', evidenceFile);
      await tenantService.uploadPaymentEvidence(formData);
      setSnack({ open: true, message: 'Evidence uploaded successfully!', severity: 'success' });
      setDialogOpen(false); 
      fetchPayments();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Upload failed'), severity: 'error' });
    } finally { setUploading(false); }
  };

  const handleSubmitNewPayment = async () => {
    if (!amountPaid || !monthFor) return;
    setUploading(true);
    try {
      const formData = new FormData();
      // Ensure amount is sent as a string with 2 decimal places to match backend expectation
      const formattedAmount = parseFloat(amountPaid).toFixed(2);
      formData.append('amount_paid', formattedAmount);
      formData.append('month_for', monthFor);
      formData.append('payment_method', paymentMethod);
      formData.append('transaction_reference', transactionRef);
      if (evidenceFile) formData.append('evidence', evidenceFile);
      
      await tenantService.submitPayment(formData);
      setSnack({ open: true, message: 'Payment submitted for verification!', severity: 'success' });
      setDialogOpen(false);
      fetchPayments();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Submission failed'), severity: 'error' });
    } finally { setUploading(false); }
  };

  const handleDownloadReceipt = async (payment) => {
    try {
      const response = await tenantService.downloadPaymentReceipt(payment.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const monthStr = payment.month_for_formatted ? payment.month_for_formatted.replace(' ', '_') : 'Receipt';
      link.setAttribute('download', `Receipt_${monthStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      setSnack({ open: true, message: 'Receipt download failed. Only PAID payments have receipts.', severity: 'error' });
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
                <TableCell sx={{ fontWeight: 700 }} align="center">Proof</TableCell>
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
                  <TableCell>{p.payment_method || '—'}</TableCell>
                  <TableCell align="center">
                    {p.evidence && p.evidence.length > 0 ? (
                      <Tooltip title="View Proof">
                         <IconButton size="small" onClick={() => window.open(p.evidence[p.evidence.length-1].file_url, '_blank')}>
                           <CheckCircleIcon color="success" fontSize="small" />
                         </IconButton>
                      </Tooltip>
                    ) : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      {p.status === 'PAID' && (
                        <Tooltip title="Download Receipt">
                          <IconButton size="small" onClick={() => handleDownloadReceipt(p)} sx={{ bgcolor: '#f0fdf4', color: '#16a34a' }}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {p.status !== 'PAID' && (
                        <Tooltip title="Upload Proof">
                          <IconButton size="small" onClick={() => handleOpenUpload(p)} sx={{ bgcolor: '#eff6ff', color: '#2563eb' }}>
                            <UploadFileIcon fontSize="small" />
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
              {dialogMode === 'PAY' ? 'Submit New Payment' : 'Upload Proof of Payment'}
            </Typography>
            <IconButton onClick={() => setDialogOpen(false)} size="small"><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {dialogMode === 'PAY' && (
            <Stepper activeStep={activeStep} sx={{ px: 3, py: 3, bgcolor: '#f8fafc' }}>
              <Step><StepLabel>Details</StepLabel></Step>
              <Step><StepLabel>Proof</StepLabel></Step>
              <Step><StepLabel>Confirm</StepLabel></Step>
            </Stepper>
          )}
          
          <Box sx={{ p: 3 }}>
            {dialogMode === 'PAY' ? (
              <>
                {activeStep === 0 && (
                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 1 }}>Enter the details of your payment below.</Alert>
                      {summary?.rent_amount && Number(amountPaid) !== Number(summary.rent_amount) && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          Note: Your monthly rent is <strong>KES {Number(summary.rent_amount).toLocaleString()}</strong>. Submitting a different amount may cause verification issues.
                        </Alert>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        fullWidth 
                        label="Amount Paid (KES)" 
                        type="number" 
                        value={amountPaid} 
                        onChange={(e) => setAmountPaid(e.target.value)}
                        helperText={summary?.rent_amount ? `Expected monthly rent: KES ${Number(summary.rent_amount).toLocaleString()}` : ''}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Target Month" type="date" InputLabelProps={{ shrink: true }} value={monthFor} onChange={(e) => setMonthFor(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <MenuItem value="MOBILE_MONEY">M-Pesa / Mobile Money</MenuItem>
                        <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                        <MenuItem value="CASH">Cash</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Transaction Ref" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="e.g. QKX1234567" />
                    </Grid>
                  </Grid>
                )}

                {activeStep === 1 && (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>Attach Payment Receipt</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Adding a photo of your receipt helps us verify your payment faster.
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      startIcon={<UploadFileIcon />}
                      sx={{ py: 2, borderStyle: 'dashed', borderRadius: 3 }}
                    >
                      {evidenceFile ? evidenceFile.name : 'Choose File (Image or PDF)'}
                      <input type="file" hidden accept="image/*,.pdf" onChange={(e) => setEvidenceFile(e.target.files[0])} />
                    </Button>
                  </Box>
                )}

                {activeStep === 2 && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>Review & Submit</Typography>
                    <Paper sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Amount:</Typography>
                        <Typography variant="body2" fontWeight={700}>KES {Number(amountPaid).toLocaleString()}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Method:</Typography>
                        <Typography variant="body2" fontWeight={700}>{paymentMethod}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Reference:</Typography>
                        <Typography variant="body2" fontWeight={700}>{transactionRef || 'N/A'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Proof Attached:</Typography>
                        <Typography variant="body2" fontWeight={700} color={evidenceFile ? 'success.main' : 'text.secondary'}>
                          {evidenceFile ? 'Yes' : 'No'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Upload a clear image or PDF of your payment evidence.
                </Typography>
                <Button variant="outlined" component="label" fullWidth startIcon={<UploadFileIcon />} sx={{ py: 2, borderStyle: 'dashed', borderRadius: 3 }}>
                  {evidenceFile ? evidenceFile.name : 'Choose Evidence File'}
                  <input type="file" hidden accept="image/*,.pdf" onChange={(e) => setEvidenceFile(e.target.files[0])} />
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
          {dialogMode === 'PAY' ? (
            <>
              {activeStep === 0 ? (
                <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              ) : (
                <Button onClick={prevStep}>Back</Button>
              )}
              {activeStep < 2 ? (
                <Button variant="contained" onClick={nextStep} disabled={activeStep === 0 && (!amountPaid || !monthFor)}>Continue</Button>
              ) : (
                <Button variant="contained" onClick={handleSubmitNewPayment} disabled={uploading}>
                  {uploading ? <CircularProgress size={24} /> : 'Submit Payment'}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleUploadEvidenceOnly} disabled={uploading || !evidenceFile}>
                {uploading ? <CircularProgress size={24} /> : 'Upload Proof'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </TenantPageShell>
  );
}
