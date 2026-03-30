import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Grid, Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, Tooltip, Card, CardContent, 
  Skeleton, Avatar, List, ListItem, ListItemText, ListItemAvatar, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, LinearProgress
} from '@mui/material';
import {
  TrendingUp, People, Home, Receipt, ArrowForward, 
  Notifications as NotificationsIcon, CheckCircle, Home as HomeIcon, CheckCircle as CheckCircleIcon, 
  Cancel as CancelIcon, People as PeopleIcon, AttachMoney as AttachMoneyIcon, Build as BuildIcon,
  Campaign as CampaignIcon, CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Tooltip as ReTooltip
} from 'recharts';
import AdminPageShell from '../../components/admin/AdminPageShell';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import adminService from '../../services/adminService';
import { getApiErrorMessage, parseListResponse } from '../../utils/apiUtils';

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
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [pendingMaintenance, setPendingMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState({ open: false, title: '', message: '', sending: false });
  const [reminding, setReminding] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [successPopup, setSuccessPopup] = useState({ open: false, title: '', message: '' });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sRes, pRes, mRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getPayments(),
        adminService.getMaintenance()
      ]);
      
      setStats(sRes.data);
      setRecentPayments(parseListResponse(pRes.data).slice(0, 5));
      setPendingMaintenance(
        parseListResponse(mRes.data)
          .filter(m => m.status === 'PENDING')
          .slice(0, 5)
      );
    } catch (e) {
      console.error('Dashboard error:', e);
      setError(getApiErrorMessage(e, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleSendAnnouncement = async () => {
    if (!announcement.title || !announcement.message) return;
    setAnnouncement(prev => ({ ...prev, sending: true }));
    try {
      await adminService.broadcastAnnouncement({ 
        title: announcement.title, 
        message: announcement.message 
      });
      setSuccessPopup({ open: true, title: 'Broadcast Sent', message: 'Your announcement has been successfully sent to all tenants.' });
      setAnnouncement({ open: false, title: '', message: '', sending: false });
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to send announcement'), severity: 'error' });
      setAnnouncement(prev => ({ ...prev, sending: false }));
    }
  };

  const handleSendReminders = async () => {
    setReminding(true);
    try {
      const res = await adminService.sendRentReminders();
      setSuccessPopup({ open: true, title: 'Reminders Sent', message: res.data.message });
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to send reminders'), severity: 'error' });
    } finally {
      setReminding(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboardData} />;
  if (!stats) return <EmptyState message="No dashboard data available" />;

  const isSmart = stats?.role === 'ADMIN' && !!stats?.property_stats;
  const propertyStats = isSmart ? stats.property_stats : (stats || {});
  const paymentStats = isSmart ? stats.payment_stats : null;
  
  // Use state variables for lists to ensure they are always arrays
  const trendsData = (isSmart ? stats.revenue_trends : []) || [];
  const maintenanceList = pendingMaintenance || [];
  const paymentsList = recentPayments || [];

  const occupancyPie = [
    { name: 'Occupied', value: Number(propertyStats?.occupied_units ?? 0) },
    { name: 'Vacant', value: Number(propertyStats?.vacant_units ?? 0) },
  ];

  return (
    <AdminPageShell
      title="Admin Dashboard"
      subtitle="Overview of your property portfolio performance."
      loading={loading}
      onRetry={fetchDashboardData}
      right={
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<NotificationsIcon />}
            onClick={handleSendReminders}
            disabled={reminding}
            sx={{ borderRadius: 2, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
          >
            {reminding ? 'Sending...' : 'Send Rent Reminders'}
          </Button>
          <Button 
            variant="contained" 
            startIcon={<CampaignIcon />}
            onClick={() => setAnnouncement({ ...announcement, open: true })}
            sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}
          >
            Broadcast Announcement
          </Button>
        </Box>
      }
    >
      {stats.emergency_maintenance_count > 0 && (
        <Alert 
          severity="error" 
          variant="filled"
          sx={{ mb: 3, borderRadius: 3, fontWeight: 700, boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)' }}
          icon={<BuildIcon />}
        >
          {stats.emergency_maintenance_count} high-priority maintenance requests require immediate attention!
        </Alert>
      )}
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
                  <LineChart data={trendsData}>
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
                {maintenanceList.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No recent requests.</Typography>
                ) : (
                  maintenanceList.map((m) => {
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
                  <Typography variant="h5" fontWeight={800}>KES {paymentStats?.total_income?.toLocaleString() ?? 0}</Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" fontWeight={700}>Collection Progress</Typography>
                  <Typography variant="body2" color="primary" fontWeight={700}>
                    {paymentStats?.collection_rate?.toFixed(1) ?? 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={paymentStats?.collection_rate ?? 0} 
                  sx={{ height: 10, borderRadius: 5, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { borderRadius: 5 } }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  KES {paymentStats?.total_income?.toLocaleString()} of KES {paymentStats?.expected_income?.toLocaleString()} collected
                </Typography>
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
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={800}>Leases Expiring Soon</Typography>
                <Chip 
                  label={`${stats?.lease_stats?.expiring_count ?? 0} Expiring`} 
                  color="warning" 
                  size="small" 
                  sx={{ fontWeight: 700 }} 
                />
              </Box>
              {(!stats?.lease_stats?.upcoming_expirations || stats.lease_stats.upcoming_expirations.length === 0) ? (
                <Typography variant="body2" color="text.secondary">No leases expiring within the next 30 days.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Tenant</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>End Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Days Left</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.lease_stats.upcoming_expirations.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>{l.tenant_name}</TableCell>
                          <TableCell>{l.unit_number}</TableCell>
                          <TableCell>{new Date(l.end_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${l.days_left} days`} 
                              size="small" 
                              variant="outlined"
                              color={l.days_left < 7 ? "error" : "warning"}
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" component={Link} to="/admin/tenants" sx={{ fontWeight: 700 }}>Contact</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Announcement Dialog */}
      <Dialog 
        open={announcement.open} 
        onClose={() => !announcement.sending && setAnnouncement({ ...announcement, open: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Broadcast Announcement</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This message will be sent as a notification to all active tenants in the system.
          </Typography>
          <TextField
            fullWidth
            label="Subject / Title"
            placeholder="e.g., Scheduled Maintenance"
            variant="outlined"
            sx={{ mb: 2 }}
            value={announcement.title}
            onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
            disabled={announcement.sending}
          />
          <TextField
            fullWidth
            label="Message"
            placeholder="Detailed announcement content..."
            multiline
            rows={4}
            variant="outlined"
            value={announcement.message}
            onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
            disabled={announcement.sending}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setAnnouncement({ ...announcement, open: false })} 
            disabled={announcement.sending}
            sx={{ fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSendAnnouncement}
            disabled={announcement.sending || !announcement.title || !announcement.message}
            sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
          >
            {announcement.sending ? 'Sending...' : 'Send Broadcast'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snack.open} 
        autoHideDuration={4000} 
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack.severity} sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {snack.message}
        </Alert>
      </Snackbar>

      {/* Success Popup Dialog */}
      <Dialog 
        open={successPopup.open} 
        onClose={() => setSuccessPopup({ ...successPopup, open: false })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 2, textAlign: 'center' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'success.main', pb: 1 }}>
          {successPopup.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {successPopup.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pt: 2 }}>
          <Button 
            variant="contained" 
            color="success"
            onClick={() => setSuccessPopup({ ...successPopup, open: false })}
            sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}
          >
            Okay
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPageShell>
  );
}
