import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Grid, Paper, Card, CardContent, Divider,
  Button, Table, TableBody, TableCell, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment
} from '@mui/material';
import {
  TrendingUp, TrendingDown, AccountBalanceWallet, 
  Download as DownloadIcon, FilterList, Search
} from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';
import { getApiErrorMessage, parseListResponse } from '../../utils/apiUtils';

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear(),
    propertyId: '' 
  });
  const [properties, setProperties] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [rRes, tRes, pRes] = await Promise.all([
        adminService.getReports(filters.year, filters.month),
        adminService.getRevenueTrends(12),
        adminService.getProperties()
      ]);
      setReportData(rRes.data.report);
      setTrends(parseListResponse(tRes.data.trends || tRes.data));
      setProperties(parseListResponse(pRes.data));
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to generate report'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportPDF = async () => {
    try {
      const response = await adminService.exportReportPDF(filters.year, filters.month);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Property_Report_${filters.year}_${filters.month.toString().padStart(2, '0')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to download PDF'));
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <AdminPageShell title="Reports & Analytics" subtitle="Financial performance and occupancy trends.">
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Month</InputLabel>
          <Select
            value={filters.month}
            label="Month"
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={filters.year}
            label="Year"
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
          >
            {[2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Property</InputLabel>
          <Select
            value={filters.propertyId}
            label="Property"
            onChange={(e) => setFilters({ ...filters, propertyId: e.target.value })}
          >
            <MenuItem value="">All Properties</MenuItem>
            {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportPDF}>Export PDF</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccountBalanceWallet color="primary" />
                <Typography color="text.secondary">Total Revenue</Typography>
              </Box>
              <Typography variant="h4">KES {reportData?.total_revenue?.toLocaleString() || 0}</Typography>
              <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp fontSize="small" /> +12% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp color="info" />
                <Typography color="text.secondary">Occupancy Rate</Typography>
              </Box>
              <Typography variant="h4">{reportData?.occupancy_rate || 0}%</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {reportData?.occupied_units || 0} of {reportData?.total_units || 0} units
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingDown color="warning" />
                <Typography color="text.secondary">Pending Payments</Typography>
              </Box>
              <Typography variant="h4">KES {reportData?.total_pending?.toLocaleString() || 0}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {reportData?.pending_count || 0} payments outstanding
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Revenue Trends</Typography>
        <Box sx={{ height: 300, mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `KES ${value / 1000}k`} />
              <ChartTooltip formatter={(value) => `KES ${value.toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" />
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </AdminPageShell>
  );
}
