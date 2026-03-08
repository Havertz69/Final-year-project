import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, IconButton, Tooltip, MenuItem, Grid
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PaymentIcon from '@mui/icons-material/Payment';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import tenantService from '../../services/tenantService';
import TenantPageShell from '../../components/tenant/TenantPageShell';

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('UPLOAD'); // 'UPLOAD' or 'PAY'
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  // Form states
  const [amountPaid, setAmountPaid] = useState('');
  const [monthFor, setMonthFor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
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
    }
    catch (e) { setError(e.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleOpenUpload = (payment) => {
    setSelectedPayment(payment);
    setDialogMode('UPLOAD');
    setEvidenceFile(null);
    setDialogOpen(true);
  };

  const handleOpenPay = async () => {
    setSelectedPayment(null);
    setDialogMode('PAY');
    
    // Fetch profile to get rent amount
    try {
      setUploading(true);
      const profileRes = await tenantService.getFullProfile();
      const unit = profileRes.data?.unit_info;
      
      if (!unit) {
        setSnack({ open: true, message: 'No unit assigned to your profile. Please contact admin.', severity: 'error' });
        return;
      }
      
      const rent = unit.rent_amount || '';
      setAmountPaid(rent);
    } catch (e) {
      console.error(e);
      setAmountPaid('');
    } finally {
      setUploading(false);
    }

    // Set default month to current month YYYY-MM
    const now = new Date();
    setMonthFor(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
    setPaymentMethod('BANK_TRANSFER');
    setTransactionRef('');
    setEvidenceFile(null);
    setDialogOpen(true);
  };

  const handleUploadEvidenceOnly = async () => {
    if (!evidenceFile || !selectedPayment) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('payment', selectedPayment.id);
      formData.append('file', evidenceFile);
      await tenantService.uploadPaymentEvidence(formData);
      setSnack({ open: true, message: 'Evidence uploaded successfully', severity: 'success' });
      setDialogOpen(false); 
      fetchPayments();
    } catch (e) {
      setSnack({ open: true, message: e.response?.data?.message || e.response?.data?.error || 'Upload failed', severity: 'error' });
    } finally { setUploading(false); }
  };

  const handleSubmitNewPayment = async () => {
    if (!amountPaid || !monthFor) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('amount_paid', amountPaid);
      formData.append('month_for', monthFor);
      formData.append('payment_method', paymentMethod);
      formData.append('transaction_reference', transactionRef);
      if (evidenceFile) {
        formData.append('evidence', evidenceFile);
      }
      
      await tenantService.submitPayment(formData);
      setSnack({ open: true, message: 'Payment submitted successfully', severity: 'success' });
      setDialogOpen(false);
      fetchPayments();
    } catch (e) {
      setSnack({ open: true, message: e.response?.data?.message || e.response?.data?.error || 'Submission failed', severity: 'error' });
    } finally { setUploading(false); }
  };

  const handleDownloadReceipt = async (payment) => {
    try {
      const response = await tenantService.downloadPaymentReceipt(payment.id);
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Generate filename parsing out the month from 'month_for_formatted'
      const monthStr = payment.month_for_formatted ? payment.month_for_formatted.replace(' ', '_') : 'Receipt';
      link.setAttribute('download', `Receipt_${monthStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setSnack({ open: true, message: 'Receipt downloaded', severity: 'success' });
    } catch (error) {
      console.error("Receipt Download Error:", error);
      setSnack({ open: true, message: 'Error downloading receipt. Ensure it is PAID.', severity: 'error' });
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
      {payments.length === 0 ? (
        <Paper elevation={0} sx={{ p: 2 }}>
          <EmptyState message="No payment history" />
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Amount (KES)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Month</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{Number(p.amount_paid).toLocaleString()}</TableCell>
                  <TableCell>{p.month_for_formatted || p.month_for}</TableCell>
                  <TableCell>{p.due_date || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.status}
                      size="small"
                      color={p.status === 'PAID' ? 'success' : p.status === 'PENDING' ? 'warning' : p.status === 'OVERDUE' ? 'error' : 'default'}
                      sx={{ fontWeight: 600, borderRadius: '6px' }}
                    />
                  </TableCell>
                  <TableCell>{p.payment_method || '—'}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
                      {p.status === 'PAID' && (
                        <Tooltip title="Download Receipt">
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadReceipt(p)}
                            sx={{ color: '#16A34A', bgcolor: '#F0FDF4', '&:hover': { bgcolor: '#DCFCE7' } }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Evidence Status / Upload */}
                      {p.evidence && p.evidence.length > 0 ? (
                        (() => {
                          const latestEv = p.evidence[p.evidence.length - 1];
                          const evStatus = latestEv.status;
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Tooltip title={`Evidence Status: ${evStatus}${latestEv.admin_notes ? ' - ' + latestEv.admin_notes : ''}`}>
                                <Chip
                                  label={`Proof: ${evStatus}`}
                                  size="small"
                                  variant="outlined"
                                  color={evStatus === 'APPROVED' ? 'success' : evStatus === 'PENDING' ? 'warning' : 'error'}
                                  onClick={() => window.open(latestEv.file_url, '_blank')}
                                  sx={{ cursor: 'pointer', height: 24, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                              </Tooltip>
                              {(evStatus === 'REJECTED' || (evStatus === 'PENDING' && p.status !== 'PAID')) && (
                                <Tooltip title="Re-upload evidence">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenUpload(p)}
                                    sx={{ color: '#2563EB', bgcolor: '#EEF4FF', '&:hover': { bgcolor: '#DBEAFE' } }}
                                  >
                                    <UploadFileIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          );
                        })()
                      ) : (
                        p.status !== 'PAID' && (
                          <Tooltip title="Upload evidence">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenUpload(p)}
                              sx={{ color: '#2563EB', bgcolor: '#EEF4FF', '&:hover': { bgcolor: '#DBEAFE' } }}
                            >
                              <UploadFileIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )
                      )}
                    </Box>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'PAY' ? 'Submit Manual Payment' : 'Upload Payment Evidence'}
          <IconButton
            aria-label="close"
            onClick={() => setDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {dialogMode === 'PAY' ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount Paid (KES)"
                  type="number"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Rent Month"
                  type="date"
                  required
                  InputLabelProps={{ shrink: true }}
                  value={monthFor}
                  onChange={(e) => setMonthFor(e.target.value)}
                  helperText="Select any date in the target month"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <MenuItem value="MPESA">M-Pesa</MenuItem>
                  <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                  <MenuItem value="CASH">Cash</MenuItem>
                  <MenuItem value="CARD">Credit/Debit Card</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Transaction Reference"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. QKX1234567"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Attach Payment Proof (Optional)</Typography>
                <TextField
                  type="file"
                  fullWidth
                  inputProps={{ accept: 'image/*,.pdf' }}
                  onChange={(e) => setEvidenceFile(e.target.files[0])}
                />
              </Grid>
            </Grid>
          ) : (
            <TextField
              type="file"
              fullWidth
              label="Screenshot / Document"
              inputProps={{ accept: 'image/*,.pdf' }}
              onChange={(e) => setEvidenceFile(e.target.files[0])}
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={dialogMode === 'PAY' ? handleSubmitNewPayment : handleUploadEvidenceOnly} 
            disabled={uploading || (dialogMode === 'UPLOAD' && !evidenceFile) || (dialogMode === 'PAY' && (!amountPaid || !monthFor))}
          >
            {uploading ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </TenantPageShell>
  );
}
