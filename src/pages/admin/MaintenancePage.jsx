import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Select, MenuItem, Snackbar, Alert,
} from '@mui/material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import adminService from '../../services/adminService';

const statusColors = { Pending: 'warning', 'In Progress': 'info', Resolved: 'success' };

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try { const res = await adminService.getMaintenance(); setRequests(res.data); }
    catch (e) { setError(e.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id, status) => {
    try {
      await adminService.updateMaintenance(id, { status });
      setSnack({ open: true, message: 'Status updated', severity: 'success' });
      fetchData();
    } catch (e) { setSnack({ open: true, message: e.response?.data?.message || 'Error', severity: 'error' }); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (requests.length === 0) return <Box><Typography variant="h5" sx={{ mb: 2 }}>Maintenance</Typography><EmptyState message="No maintenance requests" /></Box>;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Maintenance Requests</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow>
            <TableCell>Title</TableCell><TableCell>Description</TableCell><TableCell>Status</TableCell><TableCell align="right">Update Status</TableCell>
          </TableRow></TableHead>
          <TableBody>{requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.title}</TableCell>
              <TableCell>{r.description}</TableCell>
              <TableCell><Chip label={r.status} size="small" color={statusColors[r.status] || 'default'} /></TableCell>
              <TableCell align="right">
                <Select size="small" value={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value)}>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Resolved">Resolved</MenuItem>
                </Select>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </TableContainer>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
