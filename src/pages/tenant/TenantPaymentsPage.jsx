import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import tenantService from '../../services/tenantService';

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', month: '' });
  const [file, setFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const fileRef = useRef();

  const fetchPayments = useCallback(async () => {
    setLoading(true); setError('');
    try { const res = await tenantService.getPayments(); setPayments(res.data); }
    catch (e) { setError(e.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const validate = () => {
    const e = {};
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Must be positive';
    if (!form.month.trim()) e.month = 'Required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('amount', form.amount);
      fd.append('month', form.month);
      if (file) fd.append('proof_image', file);
      await tenantService.submitPayment(fd);
      setSnack({ open: true, message: 'Payment submitted', severity: 'success' });
      setDialogOpen(false); setForm({ amount: '', month: '' }); setFile(null);
      fetchPayments();
    } catch (e) { setSnack({ open: true, message: e.response?.data?.message || 'Error', severity: 'error' }); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchPayments} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Payments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormErrors({}); setDialogOpen(true); }}>Submit Payment</Button>
      </Box>
      {payments.length === 0 ? <EmptyState message="No payment history" /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow>
              <TableCell>Amount</TableCell><TableCell>Month</TableCell><TableCell>Status</TableCell>
            </TableRow></TableHead>
            <TableBody>{payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.amount}</TableCell>
                <TableCell>{p.month}</TableCell>
                <TableCell><Chip label={p.status} size="small" color={p.status === 'confirmed' ? 'success' : 'warning'} /></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Payment Proof</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField label="Amount" type="number" fullWidth margin="normal" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} error={!!formErrors.amount} helperText={formErrors.amount} />
          <TextField label="Month" type="date" fullWidth margin="normal" InputLabelProps={{ shrink: true }}
            value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} error={!!formErrors.month} helperText={formErrors.month} />
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          <Button variant="outlined" sx={{ mt: 1 }} onClick={() => fileRef.current.click()}>
            {file ? file.name : 'Upload Proof Image'}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting...' : 'Submit'}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
