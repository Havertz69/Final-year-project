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
import { getApiErrorMessage } from '../../utils/apiUtils';
import AdminFinancialReport from './AdminFinancialReport';

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
      const response = await adminService.getReports(filters.year, filters.month);
      setReportData(response.data.report);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to generate report'));
    } finally {
      setLoading(false);
    }
  }, [filters.month, filters.year]);

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
    <AdminPageShell title="Financial Reports" subtitle="Comprehensive property performance and revenue analysis.">
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', bgcolor: 'white', p: 2, borderRadius: 1 }}>
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
      </Box>

      {reportData ? (
        <AdminFinancialReport 
          report_month={reportData.report_month}
          generated_date={reportData.generated_date}
          metrics={reportData.metrics}
          monthly_revenue={reportData.monthly_revenue}
          properties={reportData.properties}
          payments={reportData.payments}
        />
      ) : (
        <EmptyState title="No Report Data" message="Adjust your filters or try again later." />
      )}
    </AdminPageShell>
  );
}
