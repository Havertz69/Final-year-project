import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, Typography, Box, Grid, Skeleton } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import adminService from '../../services/adminService';

const statConfig = [
  { key: 'total_units', label: 'Total Units', icon: <HomeIcon />, color: '#0D7377' },
  { key: 'occupied_units', label: 'Occupied', icon: <CheckCircleIcon />, color: '#2E7D32' },
  { key: 'vacant_units', label: 'Vacant', icon: <CancelIcon />, color: '#ED6C02' },
  { key: 'expected_income', label: 'Expected Income', icon: <TrendingUpIcon />, color: '#1565C0', prefix: 'KES ' },
  { key: 'collected_income', label: 'Collected', icon: <AttachMoneyIcon />, color: '#2E7D32', prefix: 'KES ' },
  { key: 'outstanding_balance', label: 'Outstanding', icon: <MoneyOffIcon />, color: '#D32F2F', prefix: 'KES ' },
  { key: 'late_tenants_count', label: 'Late Tenants', icon: <PeopleIcon />, color: '#ED6C02' },
];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!loading && !data) return <EmptyState message="No dashboard data available" />;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Dashboard</Typography>
      <Grid container spacing={2}>
        {statConfig.map((s) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={s.key}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ bgcolor: s.color + '18', color: s.color, borderRadius: 2, p: 1.2, display: 'flex' }}>
                  {s.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                  {loading ? (
                    <Skeleton width={80} height={32} />
                  ) : (
                    <Typography variant="h5">{s.prefix || ''}{data?.[s.key] ?? '—'}</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
