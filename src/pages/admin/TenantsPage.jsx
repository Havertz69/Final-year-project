import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert, MenuItem, Select, InputLabel, FormControl,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import adminService from '../../services/adminService';

const initForm = { full_name: '', phone: '', id_number: '', unit_id: '', move_in_date: '' };

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [t, u] = await Promise.all([adminService.getTenants(), adminService.getUnits()]);
      setTenants(t.data);
      setUnits(u.data);
    } catch (e) { setError(e.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const availableUnits = units.filter(u => u.status === 'vacant' || (editing && u.id === editing.unit_id));

  const openAdd = () => { setEditing(null); setForm(initForm); setFormErrors({}); setDialogOpen(true); };
  const openEdit = (t) => { setEditing(t); setForm({ full_name: t.full_name, phone: t.phone, id_number: t.id_number, unit_id: t.unit_id, move_in_date: t.move_in_date || '' }); setFormErrors({}); setDialogOpen(true); };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    else if (!/^\d{10,}$/.test(form.phone)) e.phone = 'Min 10 digits';
    if (!form.id_number.trim()) e.id_number = 'Required';
    if (!form.unit_id) e.unit_id = 'Required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) await adminService.updateTenant(editing.id, form);
      else await adminService.createTenant(form);
      setSnack({ open: true, message: editing ? 'Tenant updated' : 'Tenant added', severity: 'success' });
      setDialogOpen(false); fetchData();
    } catch (e) { setSnack({ open: true, message: e.response?.data?.message || 'Error', severity: 'error' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminService.deleteTenant(deleteId);
      setSnack({ open: true, message: 'Tenant removed', severity: 'success' });
      setConfirmOpen(false); fetchData();
    } catch (e) { setSnack({ open: true, message: e.response?.data?.message || 'Error', severity: 'error' }); }
    finally { setDeleting(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Tenants</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Tenant</Button>
      </Box>
      {tenants.length === 0 ? <EmptyState message="No tenants yet" actionLabel="Add Tenant" onAction={openAdd} /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow>
              <TableCell>Name</TableCell><TableCell>Phone</TableCell><TableCell>ID Number</TableCell><TableCell>Unit</TableCell><TableCell>Move-in Date</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>{tenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.full_name}</TableCell>
                <TableCell>{t.phone}</TableCell>
                <TableCell>{t.id_number}</TableCell>
                <TableCell>{t.unit_id}</TableCell>
                <TableCell>{t.move_in_date || '—'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(t)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => { setDeleteId(t.id); setConfirmOpen(true); }}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField label="Full Name" fullWidth margin="normal" value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} error={!!formErrors.full_name} helperText={formErrors.full_name} />
          <TextField label="Phone" fullWidth margin="normal" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} error={!!formErrors.phone} helperText={formErrors.phone} />
          <TextField label="ID Number" fullWidth margin="normal" value={form.id_number}
            onChange={(e) => setForm({ ...form, id_number: e.target.value })} error={!!formErrors.id_number} helperText={formErrors.id_number} />
          <FormControl fullWidth margin="normal" error={!!formErrors.unit_id}>
            <InputLabel>Unit</InputLabel>
            <Select value={form.unit_id} label="Unit" onChange={(e) => setForm({ ...form, unit_id: e.target.value })}>
              {availableUnits.map((u) => <MenuItem key={u.id} value={u.id}>{u.unit_number}</MenuItem>)}
            </Select>
            {formErrors.unit_id && <Typography variant="caption" color="error" sx={{ ml: 2 }}>{formErrors.unit_id}</Typography>}
          </FormControl>
          <TextField label="Move-in Date" type="date" fullWidth margin="normal" InputLabelProps={{ shrink: true }}
            value={form.move_in_date} onChange={(e) => setForm({ ...form, move_in_date: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={confirmOpen} title="Remove Tenant" message="This action cannot be undone." onConfirm={handleDelete} onCancel={() => setConfirmOpen(false)} loading={deleting} />
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
