import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Chip, Card, CardContent, IconButton, MenuItem, Select, 
  FormControl, InputLabel, InputAdornment, Grid
} from '@mui/material';
import {
  Add as AddIcon,
  PhotoCamera as PhotoCameraIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import tenantService from '../../services/tenantService';
import TenantPageShell from '../../components/tenant/TenantPageShell';
import { getApiErrorMessage, parseListResponse } from '../../utils/apiUtils';

const statusColors = { PENDING: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success' };
const priorityColors = {
  LOW: { bg: '#eff6ff', color: '#1d4ed8' },
  MEDIUM: { bg: '#fffbeb', color: '#b45309' },
  HIGH: { bg: '#fff7ed', color: '#c2410c' },
  EMERGENCY: { bg: '#fef2f2', color: '#dc2626' },
};

export default function TenantMaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM' });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await tenantService.getMaintenance();
      setRequests(parseListResponse(res.data));
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load maintenance requests'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = !filters.search || 
        r.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        r.description.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = !filters.status || r.status === filters.status;
      return matchesSearch && matchesStatus;
    });
  }, [requests, filters]);

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
      setSnack({ open: true, message: 'Request submitted successfully!', severity: 'success' });
      setDialogOpen(false); 
      setForm({ title: '', description: '', priority: 'MEDIUM' }); 
      setImageFile(null);
      fetchRequests();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to submit request'), severity: 'error' });
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchRequests} />;

  return (
    <TenantPageShell
      title="Maintenance Requests"
      subtitle="Track and report issues in your unit."
      right={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} sx={{ borderRadius: 2 }}>
          New Request
        </Button>
      }
    >
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search requests..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          sx={{ minWidth: { xs: '100%', sm: 300 } }}
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
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
            <MenuItem value="RESOLVED">Resolved</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {filteredRequests.length === 0 ? (
        <EmptyState 
          message={requests.length === 0 ? "You haven't submitted any requests yet." : "No requests match your filters."} 
        />
      ) : (
        <Grid container spacing={2}>
          {filteredRequests.map((req) => (
            <Grid item xs={12} md={6} key={req.id}>
              <Card elevation={0} sx={{ 
                borderRadius: 4, 
                border: '1px solid #e2e8f0',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{req.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Submitted: {new Date(req.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip 
                      label={req.status} 
                      size="small" 
                      color={statusColors[req.status]} 
                      sx={{ fontWeight: 800, fontSize: '0.65rem', borderRadius: 1.5 }} 
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    mb: 2, 
                    display: '-webkit-box', 
                    WebkitLineClamp: 2, 
                    WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden' 
                  }}>
                    {req.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={`${req.priority} Priority`}
                      size="small"
                      sx={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: priorityColors[req.priority]?.bg,
                        color: priorityColors[req.priority]?.color,
                      }}
                    />
                    {req.image_url && (
                       <Button size="small" onClick={() => window.open(req.image_url, '_blank')}>View Photo</Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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
