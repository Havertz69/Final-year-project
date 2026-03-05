import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, Typography, Box, Grid, Button, Skeleton, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AdminPageShell from '../../components/admin/AdminPageShell';
import adminService from '../../services/adminService';
import ErrorState from '../../components/common/ErrorState';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip } from 'recharts';

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reportRes, trendsRes] = await Promise.all([
        adminService.getReports(),
        adminService.getRevenueTrends(12),
      ]);
      setReportData(reportRes.data);
      setTrends(trendsRes.data.trends || []);
    } catch (e) {
      console.error('Reports fetch error:', e);
      setError('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await adminService.exportPaymentsCSV(year, month);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payment_report_${year}_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Export error:', e);
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const stats = reportData?.report || {};

  return (
    <AdminPageShell
      title="Financial Reports"
      subtitle="Analyze your revenue and collection performance."
      loading={loading}
    >
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Month</InputLabel>
            <Select value={month} label="Month" onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }).map((_, i) => (
                <MenuItem key={i + 1} value={String(i + 1)}>{i + 1}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
              {[0, 1, 2].map((n) => {
                const y = String(new Date().getFullYear() - n);
                return <MenuItem key={y} value={y}>{y}</MenuItem>;
              })}
            </Select>
          </FormControl>
        </Box>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
          disabled={exporting}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Expected Revenue', value: stats.expected_income, color: '#2563eb' },
          { label: 'Actual Collected', value: stats.total_income, color: '#16a34a' },
          { label: 'Collection Rate', value: `${stats.collection_rate || 0}%`, color: '#f59e0b' },
        ].map((s, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Card sx={{
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>{s.label}</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: s.color, mt: 1 }}>
                  {loading ? <Skeleton width={100} /> : (typeof s.value === 'number' ? `KES ${s.value.toLocaleString()}` : s.value)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 4 }}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={800}>Revenue Portfolio Trends</Typography>
            <Typography variant="body2" color="text.secondary">12-month performance history.</Typography>
          </Box>
          <Box sx={{ height: 400 }}>
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
                  name="Income"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
