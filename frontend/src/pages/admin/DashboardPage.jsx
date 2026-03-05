import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, Typography, Box, Grid, Skeleton, Paper, Divider, Chip, List, ListItem, ListItemText, ListItemAvatar, Avatar } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BuildIcon from '@mui/icons-material/Build';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

const KPI_CARDS = [
  { key: 'total_units', label: 'Total Units', icon: <HomeIcon />, color: '#2563eb' },
  { key: 'occupied_units', label: 'Occupied Units', icon: <CheckCircleIcon />, color: '#16a34a' },
  { key: 'vacant_units', label: 'Vacant Units', icon: <CancelIcon />, color: '#f59e0b' },
  { key: 'total_tenants', label: 'Tenants', icon: <PeopleIcon />, color: '#8b5cf6' },
  { key: 'total_income', label: 'Total Income', icon: <AttachMoneyIcon />, color: '#166534', isCurrency: true },
];

const PIE_COLORS = ['#16a34a', '#f59e0b'];

const priorityColors = {
  LOW: { bg: '#eff6ff', color: '#1d4ed8' },
  MEDIUM: { bg: '#fffbeb', color: '#b45309' },
  HIGH: { bg: '#fff7ed', color: '#c2410c' },
  EMERGENCY: { bg: '#fef2f2', color: '#dc2626' },
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, trendsRes, maintRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getRevenueTrends(6),
        adminService.getMaintenance(),
      ]);
      setData(dashRes.data);
      setTrends(trendsRes.data.trends || []);
      setMaintenance(Array.isArray(maintRes.data) ? maintRes.data.slice(0, 5) : []);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
      setError(e.response?.data?.message || e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!loading && !data) return <EmptyState message="No dashboard data available" />;

  const isSmart = data?.role === 'ADMIN' && !!data?.property_stats;
  const propertyStats = isSmart ? data.property_stats : data;
  const paymentStats = isSmart ? data.payment_stats : null;

  const occupancyPie = [
    { name: 'Occupied', value: Number(propertyStats?.occupied_units ?? 0) },
    { name: 'Vacant', value: Number(propertyStats?.vacant_units ?? 0) },
  ];

  return (
    <AdminPageShell
      title="Admin Dashboard"
      subtitle="Overview of your property portfolio performance."
      loading={loading}
      onRetry={fetchData}
    >
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {KPI_CARDS.map((k) => (
          <Grid item xs={12} sm={6} md={3} key={k.key}>
            <Card sx={{
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.02)' }
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ bgcolor: `${k.color}1A`, color: k.color, borderRadius: 3, p: 1.5, display: 'flex' }}>
                  {k.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>{k.label}</Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {loading ? (
                      <Skeleton width={40} />
                    ) : k.isCurrency ? (
                      `KES ${(paymentStats?.[k.key] || 0).toLocaleString()}`
                    ) : (
                      propertyStats?.[k.key] ?? '0'
                    )}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 3 }}>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={800}>Revenue Portfolio</Typography>
                <Typography variant="body2" color="text.secondary">Monthly income trends for the last 6 months.</Typography>
              </Box>
              <Box sx={{ height: 350, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                    <ReTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_income"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name="Income (KES)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%', minHeight: 450 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Occupancy Distribution</Typography>
              <Box sx={{ height: 280, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={occupancyPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      strokeWidth={0}
                    >
                      {occupancyPie.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#16a34a' }} />
                    <Typography variant="body2">Occupied</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700}>{propertyStats?.occupied_units ?? 0}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                    <Typography variant="body2">Vacant</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700}>{propertyStats?.vacant_units ?? 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Recent Maintenance</Typography>
              <List sx={{ pt: 0 }}>
                {maintenance.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No recent requests.</Typography>
                ) : (
                  maintenance.map((m) => {
                    const priority = priorityColors[m.priority] || priorityColors.MEDIUM;
                    return (
                      <ListItem key={m.id} disableGutters divider sx={{ py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'grey.100', color: 'grey.600' }}>
                            <BuildIcon fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="subtitle2" fontWeight={700}>{m.title}</Typography>}
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {m.tenant_name} • {m.unit_number}
                            </Typography>
                          }
                        />
                        <Chip
                          label={m.priority}
                          size="small"
                          sx={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: priority.bg,
                            color: priority.color,
                            height: 20
                          }}
                        />
                      </ListItem>
                    );
                  })
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Collections Overview</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: '#dcfce7', color: '#166534', mr: 2, width: 48, height: 48 }}>
                  <AttachMoneyIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Revenue This Month</Typography>
                  <Typography variant="h5" fontWeight={800}>KES {paymentStats?.total_income ?? 0}</Typography>
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Paid</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="success.main">{paymentStats?.paid_count ?? 0}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Pending</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="warning.main">{paymentStats?.pending_count ?? 0}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Overdue</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="error.main">{paymentStats?.overdue_count ?? 0}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminPageShell>
  );
}
