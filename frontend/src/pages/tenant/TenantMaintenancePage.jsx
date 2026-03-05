import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Chip, Card, CardContent, IconButton, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import tenantService from '../../services/tenantService';
import TenantPageShell from '../../components/tenant/TenantPageShell';

const statusColors = { PENDING: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success' };
const priorityColors = {
  LOW: { bg: '#eff6ff', color: '#1d4ed8' },
  MEDIUM: { bg: '#fffbeb', color: '#b45309' },
  HIGH: { bg: '#fff7ed', color: '#c2410c' },
  EMERGENCY: { bg: '#fef2f2', color: '#dc2626' },
};

function extractApiError(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  const fieldErrors = Object.entries(data)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => `${k}: ${v.join(' ')}`)
    .join(' | ');
  return fieldErrors || fallback;
}

export default function TenantMaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM' });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await tenantService.getMaintenance();
      setRequests(res.data?.results || res.data || []);
    } catch (e) {
      setError(extractApiError(e, 'Failed to load'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleSubmit = async () => {
    if (!form.title || !form.description) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('priority', form.priority);
      if (imageFile) formData.append('image', imageFile);
      await tenantService.createMaintenance(formData);
      setSnack({ open: true, message: 'Request submitted', severity: 'success' });
      setDialogOpen(false); setForm({ title: '', description: '', priority: 'MEDIUM' }); setImageFile(null);
      fetchRequests();
    } catch (e) {
      setSnack({ open: true, message: extractApiError(e, 'Failed'), severity: 'error' });
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchRequests} />;

  return (
    <TenantPageShell
      title="Maintenance"
      subtitle="Submit and track maintenance requests."
      right={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          New Request
        </Button>
      }
    >
      {requests.length === 0 ? (
        <Paper elevation={0} sx={{ p: 2 }}>
          <EmptyState message="No maintenance requests" />
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {requests.map((req) => (
            <Card key={req.id} elevation={0} sx={{ borderRadius: 4 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>{req.title}</Typography>
                    <Chip
                      label={req.priority}
                      size="small"
                      sx={{
                        mt: 0.5,
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: priorityColors[req.priority]?.bg,
                        color: priorityColors[req.priority]?.color,
                      }}
                    />
                  </Box>
                  <Chip label={req.status} size="small" color={statusColors[req.status]} sx={{ fontWeight: 700 }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {req.description}
                </Typography>
                {req.image_url && (
                  <Box sx={{ mb: 1 }}>
                    <img src={req.image_url} alt="maintenance" style={{ maxWidth: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  {req.unit_number} • {new Date(req.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Maintenance Request</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            placeholder="e.g., Leaking kitchen sink"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            sx={{ mt: 1 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={form.priority}
              label="Priority"
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="EMERGENCY">Emergency</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            placeholder="Please provide details about the issue..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            sx={{ mt: 2 }}
          />
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<PhotoCameraIcon />}
            sx={{ mt: 2 }}
          >
            {imageFile ? imageFile.name : 'Attach Image (optional)'}
            <input type="file" accept="image/*" hidden onChange={(e) => setImageFile(e.target.files[0])} />
          </Button>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!form.title || !form.description || submitting}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </TenantPageShell>
  );
}
