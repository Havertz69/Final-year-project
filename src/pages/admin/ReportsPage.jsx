import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import adminService from '../../services/adminService';

export default function ReportsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('12');

  const fetchReports = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminService.getIncomeReports({ months: range });
      setData(res.data);
    } catch (e) { setError(e.response?.data?.message || 'Failed to load reports'); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchReports} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5">Income Reports</Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Range</InputLabel>
          <Select value={range} label="Range" onChange={(e) => setRange(e.target.value)}>
            <MenuItem value="3">Last 3 months</MenuItem>
            <MenuItem value="6">Last 6 months</MenuItem>
            <MenuItem value="12">Last 12 months</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {data.length === 0 ? <EmptyState message="No report data available" /> : (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Income Trend</Typography>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="income" stroke="#0D7377" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
