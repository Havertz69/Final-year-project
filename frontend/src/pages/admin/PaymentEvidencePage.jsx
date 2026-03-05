import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, IconButton, Tooltip, Card, CardContent, Grid,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';

const statusColors = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };

export default function PaymentEvidencePage() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchEvidence = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminService.getPaymentEvidence();
      setEvidence(res.data?.results || res.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  const handleApprove = async () => {
    if (!selectedEvidence) return;
    setUpdating(true);
    try {
      await adminService.updatePaymentEvidence(selectedEvidence.id, { status: 'APPROVED', admin_notes });
      setSnack({ open: true, message: 'Evidence approved', severity: 'success' });
      setDialogOpen(false); setSelectedEvidence(null); setAdminNotes('');
      fetchEvidence();
    } catch (e) {
      setSnack({ open: true, message: e.response?.data?.message || 'Failed to approve', severity: 'error' });
    } finally { setUpdating(false); }
  };

  const handleReject = async () => {
    if (!selectedEvidence) return;
    setUpdating(true);
    try {
      await adminService.updatePaymentEvidence(selectedEvidence.id, { status: 'REJECTED', admin_notes });
      setSnack({ open: true, message: 'Evidence rejected', severity: 'success' });
      setDialogOpen(false); setSelectedEvidence(null); setAdminNotes('');
      fetchEvidence();
    } catch (e) {
      setSnack({ open: true, message: e.response?.data?.message || 'Failed to reject', severity: 'error' });
    } finally { setUpdating(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchEvidence} />;

  return (
    <AdminPageShell
      title="Payment Evidence"
      subtitle="Review and approve or reject tenant payment evidence."
      loading={loading}
      error={error}
      onRetry={fetchEvidence}
    >

      {evidence.length === 0 ? (
        <Paper elevation={0} sx={{ borderRadius: 4, p: 2 }}>
          <EmptyState message="No payment evidence submitted" />
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {evidence.map((ev) => (
            <Grid item xs={12} md={6} key={ev.id}>
              <Card elevation={0} sx={{ borderRadius: 4, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {ev.payment?.tenant?.user?.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ev.payment?.unit?.unit_number} • {ev.payment?.month_for_formatted || ev.payment?.month_for}
                      </Typography>
                    </Box>
                    <Chip label={ev.status} size="small" color={statusColors[ev.status]} />
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Amount: KES {ev.payment?.amount_paid}
                  </Typography>
                  {ev.file_url && (
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Tooltip title="View file">
                        <IconButton size="small" href={ev.file_url} target="_blank" rel="noopener noreferrer">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton size="small" href={ev.file_url} download>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                  {ev.admin_notes && (
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                      Note: {ev.admin_notes}
                    </Typography>
                  )}
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    {ev.status === 'PENDING' && (
                      <>
                        <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => { setSelectedEvidence(ev); setAdminNotes(''); setDialogOpen(true); }}>
                          Approve
                        </Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => { setSelectedEvidence(ev); setAdminNotes(''); setDialogOpen(true); }}>
                          Reject
                        </Button>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Evidence</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Admin Notes (optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={updating}>
            Approve
          </Button>
          <Button variant="outlined" color="error" onClick={handleReject} disabled={updating}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </AdminPageShell>
  );
}
