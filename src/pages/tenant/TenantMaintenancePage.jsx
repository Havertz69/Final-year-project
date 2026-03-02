import { useState, useEffect, useCallback } from 'react';
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

const statusColors = { Pending: 'warning', 'In Progress': 'info', Resolved: 'success' };

export default function TenantMaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try { const res = await tenantService.getMaintenance(); setRequests(res.data); }
    catch (e) { setError(e.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await tenantService.createMaintenance(form);
      setSnack({ open: true, message: 'Request submitted', severity: 'success' });
      setDialogOpen(false); setForm({ title: '', description: '' });
      fetchData();
    } catch (e) { setSnack({ open: true, message: e.response?.data?.message || 'Error', severity: 'error' }); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Maintenance Requests</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormErrors({}); setDialogOpen(true); }}>New Request</Button>
      </Box>
      {requests.length === 0 ? <EmptyState message="No maintenance requests" actionLabel="New Request" onAction={() => setDialogOpen(true)} /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow>
              <TableCell>Title</TableCell><TableCell>Description</TableCell><TableCell>Status</TableCell>
            </TableRow></TableHead>
            <TableBody>{requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell><Chip label={r.status} size="small" color={statusColors[r.status] || 'default'} /></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Maintenance Request</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField label="Title" fullWidth margin="normal" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} error={!!formErrors.title} helperText={formErrors.title} />
          <TextField label="Description" fullWidth margin="normal" multiline rows={4} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} error={!!formErrors.description} helperText={formErrors.description} />
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
