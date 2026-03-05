import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert, Chip, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';

const initForm = { property_obj: '', unit_number: '', rent_amount: '' };

export default function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
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

  const fetchUnits = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [u, p] = await Promise.all([adminService.getUnits(), adminService.getProperties()]);
      const unitsPayload = u.data;
      const propertiesPayload = p.data;

      const unitsList = Array.isArray(unitsPayload)
        ? unitsPayload
        : Array.isArray(unitsPayload?.results)
        ? unitsPayload.results
        : Array.isArray(unitsPayload?.units)
        ? unitsPayload.units
        : [];

      const propertiesList = Array.isArray(propertiesPayload)
        ? propertiesPayload
        : Array.isArray(propertiesPayload?.results)
        ? propertiesPayload.results
        : Array.isArray(propertiesPayload?.properties)
        ? propertiesPayload.properties
        : [];

      setUnits(unitsList);
      setProperties(propertiesList);
    }
    catch (e) { 
      console.error('Units fetch error:', e);
      setError(e.response?.data?.message || e.message || 'Failed to load units'); 
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  const openAdd = () => { setEditing(null); setForm(initForm); setFormErrors({}); setDialogOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({
      property_obj: u.property_obj ?? '',
      unit_number: u.unit_number ?? '',
      rent_amount: u.rent_amount ?? '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.property_obj) e.property_obj = 'Required';
    if (!form.unit_number.toString().trim()) e.unit_number = 'Required';
    if (!form.rent_amount || Number(form.rent_amount) <= 0) e.rent_amount = 'Must be positive';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const propertyNameById = useCallback(
    (id) => properties.find((p) => p.id === id)?.name,
    [properties]
  );

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) { await adminService.updateUnit(editing.id, form); }
      else { await adminService.createUnit(form); }
      setSnack({ open: true, message: editing ? 'Unit updated' : 'Unit created', severity: 'success' });
      setDialogOpen(false);
      fetchUnits();
    } catch (e) {
      setSnack({ open: true, message: e.response?.data?.message || 'Error saving unit', severity: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminService.deleteUnit(deleteId);
      setSnack({ open: true, message: 'Unit deleted', severity: 'success' });
      setConfirmOpen(false); setDeleteId(null);
      fetchUnits();
    } catch (e) {
      setSnack({ open: true, message: e.response?.data?.message || 'Error deleting', severity: 'error' });
    } finally { setDeleting(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchUnits} />;

  return (
    <AdminPageShell
      title="Units"
      subtitle="Manage property units and occupancy."
      right={<Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Unit</Button>}
      loading={loading}
      error={error}
      onRetry={fetchUnits}
    >
      {(!Array.isArray(units) || units.length === 0) ? <EmptyState message="No units yet" actionLabel="Add Unit" onAction={openAdd} /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow>
              <TableCell>Property</TableCell><TableCell>Unit Number</TableCell><TableCell>Rent Amount</TableCell><TableCell>Occupancy</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>{units.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{propertyNameById(u.property_obj) || u.property_name || '—'}</TableCell>
                <TableCell>{u.unit_number}</TableCell>
                <TableCell>{u.rent_amount}</TableCell>
                <TableCell>
                  <Chip
                    label={u.is_occupied ? 'Occupied' : 'Vacant'}
                    size="small"
                    color={u.is_occupied ? 'success' : 'warning'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(u)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => { setDeleteId(u.id); setConfirmOpen(true); }}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <FormControl fullWidth margin="normal" error={!!formErrors.property_obj}>
            <InputLabel>Property</InputLabel>
            <Select
              value={form.property_obj}
              label="Property"
              onChange={(e) => setForm({ ...form, property_obj: e.target.value })}
            >
              {properties.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
            {formErrors.property_obj && (
              <Typography variant="caption" color="error" sx={{ ml: 2 }}>{formErrors.property_obj}</Typography>
            )}
          </FormControl>
          <TextField label="Unit Number" fullWidth margin="normal" value={form.unit_number}
            onChange={(e) => setForm({ ...form, unit_number: e.target.value })} error={!!formErrors.unit_number} helperText={formErrors.unit_number} />
          <TextField label="Rent Amount" type="number" fullWidth margin="normal" value={form.rent_amount}
            onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} error={!!formErrors.rent_amount} helperText={formErrors.rent_amount} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={confirmOpen} title="Delete Unit" message="This action cannot be undone." onConfirm={handleDelete} onCancel={() => setConfirmOpen(false)} loading={deleting} />
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </AdminPageShell>
  );
}
