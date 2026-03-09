import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button,
  Divider, Chip, Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as DescriptionIcon,
  Event as EventIcon,
  Apartment as ApartmentIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import tenantService from '../../services/tenantService';
import TenantPageShell from '../../components/tenant/TenantPageShell';
import { getApiErrorMessage } from '../../utils/apiUtils';

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>{value || '—'}</Typography>
    </Box>
  );
}

function LeaseCard({ icon, title, children }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ mr: 1.5, p: 1, bgcolor: '#f8fafc', borderRadius: 2, display: 'flex' }}>{icon}</Box>
          <Typography variant="subtitle1" fontWeight={800} color="#1E293B">{title}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {children}
      </CardContent>
    </Card>
  );
}

export default function TenantLeasePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await tenantService.getFullProfile();
      setProfile(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load lease information'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const lease = profile?.lease;
  const unit = profile?.unit_info;
  const daysRemaining = lease?.days_remaining ?? null;

  return (
    <TenantPageShell
      title="Lease Information"
      subtitle="Your active lease agreement, unit, and contract details."
    >
      <Grid container spacing={3}>
        {/* Unit & Property */}
        <Grid item xs={12} md={6}>
          <LeaseCard
            icon={<ApartmentIcon sx={{ color: '#7C3AED' }} />}
            title="Unit & Property"
          >
            {unit ? (
              <>
                <InfoRow label="Property" value={unit.property_name} />
                <InfoRow label="Unit Number" value={unit.unit_number} />
                <InfoRow label="Address" value={unit.property_location} />
                <InfoRow label="Monthly Rent" value={`KES ${Number(unit.rent_amount).toLocaleString()}`} />
                <InfoRow
                  label="Security Deposit"
                  value={`KES ${Number(profile?.security_deposit || 0).toLocaleString()}`}
                />
              </>
            ) : (
              <Alert severity="warning">No unit assigned yet.</Alert>
            )}
          </LeaseCard>
        </Grid>

        {/* Lease Dates */}
        <Grid item xs={12} md={6}>
          <LeaseCard
            icon={<EventIcon sx={{ color: '#2563EB' }} />}
            title="Lease Period"
          >
            {lease ? (
              <>
                <InfoRow label="Start Date" value={lease.start_date} />
                <InfoRow label="End Date" value={lease.end_date} />
                <InfoRow label="Move-in Date" value={profile?.move_in_date} />
                {daysRemaining !== null && (
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={
                        daysRemaining === 0
                          ? 'Lease Expired'
                          : `${daysRemaining} days remaining`
                      }
                      color={
                        daysRemaining === 0
                          ? 'error'
                          : daysRemaining <= 30
                            ? 'error'
                            : daysRemaining <= 90
                              ? 'warning'
                              : 'success'
                      }
                      sx={{ fontWeight: 700, borderRadius: '8px' }}
                    />
                  </Box>
                )}
              </>
            ) : (
              <Alert severity="info">No active lease on record.</Alert>
            )}
          </LeaseCard>
        </Grid>

        {/* Financial Terms */}
        {lease && (
          <Grid item xs={12} md={6}>
            <LeaseCard
              icon={<AttachMoneyIcon sx={{ color: '#16A34A' }} />}
              title="Financial Terms"
            >
              <InfoRow label="Rent Amount" value={`KES ${Number(lease.rent_amount).toLocaleString()}`} />
              <InfoRow label="Deposit" value={`KES ${Number(lease.deposit).toLocaleString()}`} />
            </LeaseCard>
          </Grid>
        )}

        {/* Lease Document */}
        <Grid item xs={12} md={lease ? 6 : 12}>
          <LeaseCard
            icon={<DescriptionIcon sx={{ color: '#EA580C' }} />}
            title="Lease Document"
          >
            {lease?.lease_document_url ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">
                  Your signed lease agreement is available for download.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  href={lease.lease_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ borderRadius: 2 }}
                >
                  Download Lease
                </Button>
              </Box>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No lease document uploaded yet. Please contact your property manager.
              </Alert>
            )}
          </LeaseCard>
        </Grid>
      </Grid>
    </TenantPageShell>
  );
}
