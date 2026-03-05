import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button,
  Divider, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, IconButton, Chip, Avatar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import ApartmentIcon from '@mui/icons-material/Apartment';
import GavelIcon from '@mui/icons-material/Gavel';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import tenantService from '../../services/tenantService';
import TenantPageShell from '../../components/tenant/TenantPageShell';

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>{value || '—'}</Typography>
    </Box>
  );
}

function SectionCard({ icon, title, children }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ bgcolor: '#EFF6FF', borderRadius: 2, p: 0.8, mr: 1.5, display: 'flex' }}>
            {icon}
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#1E293B' }}>{title}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {children}
      </CardContent>
    </Card>
  );
}

export default function TenantProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchProfile = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await tenantService.getFullProfile();
      setProfile(res.data);
      setEditForm({ email: res.data.email || '', phone: res.data.phone_number || '' });
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await tenantService.updateProfile(editForm);
      setSnack({ open: true, message: 'Profile updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      fetchProfile();
    } catch (e) {
      setSnack({ open: true, message: e.response?.data?.error || 'Update failed', severity: 'error' });
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setSnack({ open: true, message: 'Passwords do not match', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      await tenantService.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      setSnack({ open: true, message: 'Password changed successfully', severity: 'success' });
      setPasswordDialogOpen(false);
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (e) {
      setSnack({ open: true, message: e.response?.data?.error || 'Failed to change password', severity: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchProfile} />;

  const lease = profile?.lease;
  const daysRemaining = lease?.days_remaining ?? null;

  return (
    <TenantPageShell title="My Profile" subtitle="View and manage your account and lease details.">
      <Grid container spacing={3}>

        {/* Account Info */}
        <Grid item xs={12} md={6}>
          <SectionCard icon={<PersonIcon sx={{ color: '#2563EB', fontSize: 20 }} />} title="Account Information">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: '#2563EB', width: 48, height: 48, fontWeight: 700 }}>
                {profile?.full_name?.charAt(0) || 'T'}
              </Avatar>
              <Box>
                <Typography fontWeight={700} color="#1E293B">{profile?.full_name}</Typography>
                <Typography variant="caption" color="text.secondary">Tenant</Typography>
              </Box>
            </Box>
            <InfoRow label="Email" value={profile?.email} />
            <InfoRow label="Phone" value={profile?.phone_number} />
            <InfoRow label="Member Since" value={profile?.move_in_date} />
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                size="small" variant="outlined" startIcon={<EditIcon />}
                onClick={() => setEditDialogOpen(true)}
              >
                Edit Profile
              </Button>
              <Button
                size="small" variant="outlined" color="warning" startIcon={<LockIcon />}
                onClick={() => setPasswordDialogOpen(true)}
              >
                Change Password
              </Button>
            </Box>
          </SectionCard>
        </Grid>

        {/* Unit Info */}
        <Grid item xs={12} md={6}>
          <SectionCard icon={<ApartmentIcon sx={{ color: '#7C3AED', fontSize: 20 }} />} title="Unit & Property">
            {profile?.unit_info ? (
              <>
                <InfoRow label="Unit Number" value={profile.unit_info.unit_number} />
                <InfoRow label="Property" value={profile.unit_info.property_name} />
                <InfoRow label="Address" value={profile.unit_info.property_location} />
                <InfoRow label="Monthly Rent" value={`KES ${Number(profile.unit_info.rent_amount).toLocaleString()}`} />
                <InfoRow label="Security Deposit" value={`KES ${Number(profile.security_deposit || 0).toLocaleString()}`} />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">No unit assigned yet.</Typography>
            )}
          </SectionCard>
        </Grid>

        {/* Lease Info */}
        <Grid item xs={12}>
          <SectionCard icon={<GavelIcon sx={{ color: '#16A34A', fontSize: 20 }} />} title="Lease Details">
            {lease ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <InfoRow label="Start Date" value={lease.start_date} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <InfoRow label="End Date" value={lease.end_date} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <InfoRow label="Rent Amount" value={`KES ${Number(lease.rent_amount).toLocaleString()}`} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <InfoRow label="Deposit" value={`KES ${Number(lease.deposit).toLocaleString()}`} />
                </Grid>
                {daysRemaining !== null && (
                  <Grid item xs={12}>
                    <Chip
                      label={daysRemaining === 0 ? 'Lease Expired' : `${daysRemaining} days remaining`}
                      color={daysRemaining === 0 ? 'error' : daysRemaining <= 30 ? 'error' : daysRemaining <= 90 ? 'warning' : 'success'}
                      sx={{ fontWeight: 700, borderRadius: '8px', mt: 0.5 }}
                    />
                  </Grid>
                )}
                {lease.lease_document_url && (
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      href={lease.lease_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Download Lease Document
                    </Button>
                  </Grid>
                )}
              </Grid>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No active lease record found. Please contact your property manager.
              </Alert>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Profile</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Email" fullWidth margin="dense" type="email"
            value={editForm.email}
            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label="Phone Number" fullWidth margin="dense"
            value={editForm.phone}
            onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Change Password</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Current Password" fullWidth margin="dense" type="password"
            value={passwordForm.old_password}
            onChange={e => setPasswordForm(f => ({ ...f, old_password: e.target.value }))}
          />
          <TextField
            label="New Password" fullWidth margin="dense" type="password"
            value={passwordForm.new_password}
            onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
          />
          <TextField
            label="Confirm New Password" fullWidth margin="dense" type="password"
            value={passwordForm.confirm_password}
            onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleChangePassword} disabled={saving}>
            {saving ? 'Saving…' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }}>{snack.message}</Alert>
      </Snackbar>
    </TenantPageShell>
  );
}
