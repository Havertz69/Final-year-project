import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button,
  Divider, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, IconButton, Chip, Avatar, CircularProgress, Paper
} from '@mui/material';
import {
  Edit as EditIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Apartment as ApartmentIcon,
  Gavel as GavelIcon,
  Phone as PhoneIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import tenantService from '../../services/tenantService';
import TenantPageShell from '../../components/tenant/TenantPageShell';
import { getApiErrorMessage } from '../../utils/apiUtils';

function InfoRow({ label, value, icon }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #F1F5F9' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {icon && <Box sx={{ display: 'flex', color: 'text.secondary' }}>{icon}</Box>}
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>{value || '—'}</Typography>
    </Box>
  );
}

function SectionCard({ icon, title, children }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
          <Box sx={{ bgcolor: '#EFF6FF', borderRadius: 2, p: 1, mr: 2, display: 'flex', color: '#2563EB' }}>
            {icon}
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#1E293B' }}>{title}</Typography>
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
      setError(getApiErrorMessage(e, 'Failed to load profile'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await tenantService.updateProfile(editForm);
      setSnack({ open: true, message: 'Profile updated successfully!', severity: 'success' });
      setEditDialogOpen(false);
      fetchProfile();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Update failed'), severity: 'error' });
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
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to change password'), severity: 'error' });
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
          <SectionCard icon={<PersonIcon sx={{ fontSize: 20 }} />} title="Account Details">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
              <Avatar sx={{ 
                bgcolor: '#2563EB', 
                width: 56, 
                height: 56, 
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
              }}>
                {profile?.full_name?.charAt(0) || 'T'}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} color="#1E293B">{profile?.full_name}</Typography>
                <Chip label="Tenant Account" size="small" variant="outlined" sx={{ fontWeight: 700, mt: 0.5 }} />
              </Box>
            </Box>
            <InfoRow label="Email Address" value={profile?.email} icon={<EmailIcon fontSize="small" />} />
            <InfoRow label="Phone Number" value={profile?.phone_number} icon={<PhoneIcon fontSize="small" />} />
            <InfoRow label="Registration Date" value={profile?.move_in_date} />
            
            <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
              <Button
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={() => setEditDialogOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                Edit
              </Button>
              <Button
                variant="outlined" 
                color="warning" 
                startIcon={<LockIcon />}
                onClick={() => setPasswordDialogOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                Password
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
        <DialogTitle sx={{ fontWeight: 800 }}>Update Profile</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Email Address" fullWidth margin="normal" type="email"
            value={editForm.email}
            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label="Phone Number" fullWidth margin="normal"
            value={editForm.phone}
            onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProfile} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Change Security Password</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Current Password" fullWidth margin="normal" type="password"
            value={passwordForm.old_password}
            onChange={e => setPasswordForm(f => ({ ...f, old_password: e.target.value }))}
          />
          <Divider sx={{ my: 2 }}>New Credentials</Divider>
          <TextField
            label="New Password" fullWidth margin="normal" type="password"
            value={passwordForm.new_password}
            onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
          />
          <TextField
            label="Confirm New Password" fullWidth margin="normal" type="password"
            value={passwordForm.confirm_password}
            onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleChangePassword} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Update Password'}
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
