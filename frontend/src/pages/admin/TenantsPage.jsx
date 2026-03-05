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
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';

const initForm = { user_email: '', unit_id: '', move_in_date: '', lease_end_date: '' };

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const getApiErrorMessage = (e, fallback) => {
    const data = e?.response?.data;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    try {
      const firstKey = Object.keys(data)[0];
      const val = data[firstKey];
      if (Array.isArray(val)) return val[0];
      if (typeof val === 'string') return val;
    } catch {
      // ignore
    }
    return fallback;
  };

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [t, u] = await Promise.all([adminService.getTenants(), adminService.getUnits()]);
      const tenantsPayload = t.data;
      const unitsPayload = u.data;
      const tenantsList = Array.isArray(tenantsPayload)
        ? tenantsPayload
        : Array.isArray(tenantsPayload?.results)
        ? tenantsPayload.results
        : Array.isArray(tenantsPayload?.tenants)
        ? tenantsPayload.tenants
        : [];
      const unitsList = Array.isArray(unitsPayload)
        ? unitsPayload
        : Array.isArray(unitsPayload?.results)
        ? unitsPayload.results
        : Array.isArray(unitsPayload?.units)
        ? unitsPayload.units
        : [];
      setTenants(tenantsList);
      setUnits(unitsList);
    } catch (e) { setError(getApiErrorMessage(e, 'Failed to load')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const availableUnits = units.filter((u) => !u.is_occupied);

  const openAssign = () => {
    setForm(initForm);
    setFormErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.user_email.trim()) e.user_email = 'Required';
    if (!form.unit_id) e.unit_id = 'Required';
    if (!form.move_in_date) e.move_in_date = 'Required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await adminService.assignTenantToUnit({
        user_email: form.user_email,
        unit_id: Number(form.unit_id),
        move_in_date: form.move_in_date,
        ...(form.lease_end_date ? { lease_end_date: form.lease_end_date } : {}),
      });
      setSnack({ open: true, message: 'Tenant assigned', severity: 'success' });
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to assign tenant'), severity: 'error' });
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminService.unassignTenantFromUnit(deleteId);
      setSnack({ open: true, message: 'Tenant unassigned', severity: 'success' });
      setConfirmOpen(false);
      fetchData();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to unassign tenant'), severity: 'error' });
    }
    finally { setDeleting(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <AdminPageShell
      title="Tenants"
      subtitle="Assign tenants to units and manage leases."
      right={<Button variant="contained" startIcon={<AddIcon />} onClick={openAssign}>Assign Tenant</Button>}
      loading={loading}
      error={error}
      onRetry={fetchData}
    >
      {tenants.length === 0 ? <EmptyState message="No tenants yet" /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow>
              <TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Unit</TableCell><TableCell>Move-in Date</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>{tenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.user_full_name}</TableCell>
                <TableCell>{t.user_email}</TableCell>
                <TableCell>{t.unit_number || '—'}</TableCell>
                <TableCell>{t.move_in_date || '—'}</TableCell>
                <TableCell align="right">
                  <Button size="small" color="error" onClick={() => { setDeleteId(t.id); setConfirmOpen(true); }}>
                    Unassign
                  </Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Tenant to Unit</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField label="Email" fullWidth margin="normal" value={form.user_email}
            onChange={(e) => setForm({ ...form, user_email: e.target.value })} error={!!formErrors.user_email} helperText={formErrors.user_email} />
          <FormControl fullWidth margin="normal" error={!!formErrors.unit_id}>
            <InputLabel>Unit</InputLabel>
            <Select value={form.unit_id} label="Unit" onChange={(e) => setForm({ ...form, unit_id: e.target.value })}>
              {availableUnits.map((u) => <MenuItem key={u.id} value={u.id}>{u.unit_number}</MenuItem>)}
            </Select>
            {formErrors.unit_id && <Typography variant="caption" color="error" sx={{ ml: 2 }}>{formErrors.unit_id}</Typography>}
          </FormControl>
          <TextField
            label="Move-in Date"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={form.move_in_date}
            onChange={(e) => setForm({ ...form, move_in_date: e.target.value })}
            error={!!formErrors.move_in_date}
            helperText={formErrors.move_in_date}
          />
          <TextField
            label="Lease End Date (optional)"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={form.lease_end_date}
            onChange={(e) => setForm({ ...form, lease_end_date: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={confirmOpen} title="Unassign Tenant" message="This will remove the tenant from their unit." onConfirm={handleDelete} onCancel={() => setConfirmOpen(false)} loading={deleting} />
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </AdminPageShell>
  );
}
