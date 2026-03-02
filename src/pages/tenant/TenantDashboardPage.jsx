import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, Typography, Box, Grid, Chip, Skeleton } from '@mui/material';
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

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>My Dashboard</Typography>
      <Grid container spacing={2}>
        {[
          { label: 'Unit Number', value: data?.unit_number },
          { label: 'Rent Amount', value: data?.rent_amount ? `KES ${data.rent_amount}` : undefined },
          { label: 'Due Date', value: data?.due_date },
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
            <Typography variant="body2" color="text.secondary">Payment Status</Typography>
            {loading ? <Skeleton width={80} height={32} /> : (
              <Chip label={data?.payment_status || 'Unknown'} sx={{ mt: 1 }}
                color={data?.payment_status === 'Paid' ? 'success' : data?.payment_status === 'Pending' ? 'warning' : 'error'} />
            )}
          </CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  );
}
