import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, Typography, Box, Grid, Chip, Skeleton, Divider } from '@mui/material';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import tenantService from '../../services/tenantService';

export default function TenantDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try { const res = await tenantService.getDashboard(); setData(res.data); }
    catch (e) { setError(e.response?.data?.message || 'Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!loading && !data) return <EmptyState message="No dashboard data" />;

  const unitInfo = data?.unit_info;
  const paymentSummary = data?.payment_summary;
  const notifications = data?.recent_notifications || [];

  const currentMonthStatus = paymentSummary?.current_month?.status;
  const statusColor = currentMonthStatus === 'PAID'
    ? 'success'
    : currentMonthStatus === 'OVERDUE'
      ? 'error'
      : currentMonthStatus === 'PENDING'
        ? 'warning'
        : 'default';

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>My Dashboard</Typography>
      <Grid container spacing={2}>
        {[
          { label: 'Unit Number', value: unitInfo?.unit_number },
          { label: 'Property', value: unitInfo?.property_name },
          { label: 'Rent Amount', value: unitInfo?.rent_amount != null ? `KES ${unitInfo.rent_amount}` : undefined },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.label}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary">{item.label}</Typography>
              {loading ? <Skeleton width={100} height={32} /> : <Typography variant="h5">{item.value || '—'}</Typography>}
            </CardContent></Card>
          </Grid>
        ))}
        <Grid item xs={12} sm={6} md={4}>
          <Card><CardContent>
            <Typography variant="body2" color="text.secondary">Current Month Status</Typography>
            {loading ? <Skeleton width={80} height={32} /> : (
              <Chip
                label={currentMonthStatus || 'Unknown'}
                sx={{ mt: 1 }}
                color={statusColor}
              />
            )}
          </CardContent></Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Payment Summary</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Total Paid</Typography>
                  {loading ? <Skeleton width={90} height={28} /> : (
                    <Typography variant="h6">KES {paymentSummary?.total_paid ?? 0}</Typography>
                  )}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Overdue</Typography>
                  {loading ? <Skeleton width={60} height={28} /> : (
                    <Typography variant="h6">{paymentSummary?.overdue_count ?? 0}</Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Recent Notifications</Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Skeleton height={24} />
                  <Skeleton height={24} />
                  <Skeleton height={24} />
                </Box>
              ) : notifications.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No notifications.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {notifications.slice(0, 5).map((n) => (
                    <Box key={n.id}>
                      <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>{n.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                        {n.message}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
