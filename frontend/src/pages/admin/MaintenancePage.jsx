import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Select, MenuItem, Snackbar, Alert, Card, CardContent,
  TextField, FormControl, InputLabel, Dialog, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';

const statusColors = { PENDING: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success' };
const priorityColors = {
  LOW: { bg: '#eff6ff', color: '#1d4ed8', mui: 'info' },
  MEDIUM: { bg: '#fffbeb', color: '#b45309', mui: 'warning' },
  HIGH: { bg: '#fff7ed', color: '#c2410c', mui: 'warning' },
  EMERGENCY: { bg: '#fef2f2', color: '#dc2626', mui: 'error' },
};

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminService.getMaintenance(filters);
      const payload = res.data;

      if (Array.isArray(payload)) {
        setRequests(payload);
        setHealth(null);
      } else {
        setHealth(payload);
        setRequests([]);
      }
    }
    catch (e) { setError(e.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdate = async (id, data) => {
    try {
      await adminService.updateMaintenance(id, data);
      setSnack({ open: true, message: 'Request updated', severity: 'success' });
      fetchData();
    } catch (e) { setSnack({ open: true, message: e.response?.data?.message || 'Error', severity: 'error' }); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (requests.length === 0 && !health) {
    return (
      <AdminPageShell
        title="Maintenance"
        subtitle="Manage maintenance requests and system health."
        loading={loading}
        error={error}
        onRetry={fetchData}
      >
        <EmptyState message="No maintenance requests" />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={health ? 'System Health' : 'Maintenance Requests'}
      subtitle={health ? 'System health and status information.' : 'Review and update maintenance request status.'}
      loading={loading}
      error={error}
      onRetry={fetchData}
    >

      {health ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Status</Typography>
            <Typography variant="h6" sx={{ mb: 2 }}>{health?.status || 'OK'}</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Timestamp</Typography>
                <Typography variant="body1">{health?.timestamp || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Database</Typography>
                <Typography variant="body1">{health?.database || health?.db_status || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Services</Typography>
                <Typography variant="body1">{health?.services_status || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Version</Typography>
                <Typography variant="body1">{health?.version || '—'}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', bgcolor: 'background.paper', p: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
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
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                label="Priority"
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                <MenuItem value="">All Priorities</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="EMERGENCY">Emergency</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Search"
              placeholder="Tenant, unit, or title..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              sx={{ flexGrow: 1, maxWidth: 400 }}
            />
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Request</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tenant/Unit</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <EmptyState message="No requests match your filters" />
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {r.image_url && (
                            <Box
                              component="img"
                              src={r.image_url}
                              onClick={() => setSelectedImage(r.image_url)}
                              sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'divider' }}
                            />
                          )}
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>{r.title}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.description}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{r.tenant_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.property_name} • Unit {r.unit_number}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.priority}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: priorityColors[r.priority]?.bg,
                            color: priorityColors[r.priority]?.color,
                            fontSize: '0.7rem'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.status}
                          size="small"
                          color={statusColors[r.status] || 'default'}
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Select
                            size="small"
                            value={r.priority}
                            onChange={(e) => handleUpdate(r.id, { priority: e.target.value })}
                            sx={{ minWidth: 100, fontSize: '0.8rem' }}
                          >
                            <MenuItem value="LOW">Low</MenuItem>
                            <MenuItem value="MEDIUM">Medium</MenuItem>
                            <MenuItem value="HIGH">High</MenuItem>
                            <MenuItem value="EMERGENCY">Emergency</MenuItem>
                          </Select>
                          <Select
                            size="small"
                            value={r.status}
                            onChange={(e) => handleUpdate(r.id, { status: e.target.value })}
                            sx={{ minWidth: 130, fontSize: '0.8rem' }}
                          >
                            <MenuItem value="PENDING">Pending</MenuItem>
                            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                            <MenuItem value="RESOLVED">Resolved</MenuItem>
                          </Select>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth="md" fullWidth>
            <Box sx={{ p: 1, position: 'relative' }}>
              <IconButton
                onClick={() => setSelectedImage(null)}
                sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' } }}
              >
                <CloseIcon />
              </IconButton>
              <Box component="img" src={selectedImage} sx={{ width: '100%', height: 'auto', borderRadius: 1 }} />
            </Box>
          </Dialog>
        </>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </AdminPageShell>
  );
}
