import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Dialog, TextField, Snackbar, Alert, Chip, MenuItem, Select, 
  InputLabel, FormControl, Avatar, InputAdornment, IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';
import { getApiErrorMessage, parseListResponse } from '../../utils/apiUtils';

const statusColors = { PENDING: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success' };
const priorityColors = {
  LOW: { bg: '#f0fdf4', color: '#166534' },
  MEDIUM: { bg: '#fffbeb', color: '#b45309' },
  HIGH: { bg: '#fff7ed', color: '#c2410c' },
  EMERGENCY: { bg: '#fef2f2', color: '#dc2626' },
};

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminService.getMaintenance();
      setRequests(parseListResponse(res.data));
    } catch (e) { setError(getApiErrorMessage(e, 'Failed to load maintenance requests')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = !filters.search || 
        (r.title || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (r.tenant_name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (r.unit_number || '').toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesStatus = !filters.status || r.status === filters.status;
      const matchesPriority = !filters.priority || r.priority === filters.priority;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [requests, filters]);

  const handleUpdate = async (id, data) => {
    setUpdating(true);
    try {
      await adminService.updateMaintenance(id, data);
      setSnack({ open: true, message: 'Updated successfully', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to update'), severity: 'error' });
    } finally { setUpdating(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <AdminPageShell title="Maintenance" subtitle="Manage tenant maintenance requests.">
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search requests..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
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
      </Box>

      {filteredRequests.length === 0 ? <EmptyState message="No matching requests" /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Request</TableCell>
                <TableCell>Tenant/Unit</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {r.image_url && (
                        <Avatar 
                          src={r.image_url} 
                          variant="rounded" 
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setSelectedImage(r.image_url)}
                        />
                      )}
                      <Box>
                        <Typography variant="subtitle2">{r.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.description}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{r.tenant_name}</Typography>
                    <Typography variant="caption" color="text.secondary">Unit {r.unit_number}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={r.priority} 
                      size="small" 
                      sx={{ bgcolor: priorityColors[r.priority]?.bg, color: priorityColors[r.priority]?.color, fontWeight: 'bold' }} 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={r.status} size="small" color={statusColors[r.status] || 'default'} />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Select
                        size="small"
                        value={r.status}
                        onChange={(e) => handleUpdate(r.id, { status: e.target.value })}
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="PENDING">Pending</MenuItem>
                        <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                        <MenuItem value="RESOLVED">Resolved</MenuItem>
                      </Select>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth="md">
        <Box sx={{ p: 1, position: 'relative' }}>
          <IconButton sx={{ position: 'absolute', right: 0, top: 0 }} onClick={() => setSelectedImage(null)}><CloseIcon /></IconButton>
          <img src={selectedImage} alt="Maintenance" style={{ width: '100%', borderRadius: 8 }} />
        </Box>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </AdminPageShell>
  );
}
