/*
  Location: frontend/src/pages/admin/AdminFinancialReport.jsx
  Purpose: Admin Financial Report dashboard showing KPIs, revenue charts, and payment activity.
*/

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import adminService from '../../services/adminService';
import './AdminFinancialReport.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AdminFinancialReport = ({ 
  report_month = "March 2025",
  generated_date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  metrics = {
    total_collected: 412000,
    outstanding: 74000,
    outstanding_tenants: 4,
    occupancy_rate: 91,
    occupied_units: 22,
    total_units: 24,
    pending_approvals: 3
  },
  monthly_revenue = [
    { month: "Jan", collected: 380000, outstanding: 42000 },
    { month: "Feb", collected: 380300, outstanding: 68000 },
    { month: "Mar", collected: 412000, outstanding: 74000 }
  ],
  properties = [
    { name: "Greenview Apts", occupancy: 95 },
    { name: "Sunrise Court", occupancy: 88 }
  ],
  payments = [
    {
      tenant: "James Mwangi", unit: "4B", property: "Greenview Apts",
      amount: 18500, mpesa_ref: "QKL7H2MP9X",
      date: "14 Mar 2025", status: "approved"
    }
  ]
}) => {

  const formatCurrency = (val) => {
    return `KES ${val.toLocaleString('en-KE')}`;
  };

  // Chart Data Configuration
  const chartData = {
    labels: monthly_revenue.map(d => d.month),
    datasets: [
      {
        label: 'Collected',
        data: monthly_revenue.map(d => d.collected),
        backgroundColor: '#0C447C', // Navy
        borderRadius: 4,
      },
      {
        label: 'Outstanding',
        data: monthly_revenue.map(d => d.outstanding),
        backgroundColor: '#B5D4F4', // Light Blue
        borderRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Using custom HTML legend as requested
      },
      tooltip: {
        backgroundColor: '#0C447C',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => value / 1000 + 'k'
        }
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ["Tenant,Unit,Property,Amount,M-Pesa Ref,Date,Status"];
    const rows = payments.map(p => 
      `"${p.tenant}","${p.unit}","${p.property}",${p.amount},"${p.mpesa_ref}","${p.date}","${p.status}"`
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Financial_Report_${report_month.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    try {
      // Extract month/year numeric values from report_month string (e.g., "March 2025")
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const parts = report_month.split(' ');
      const monthIndex = monthNames.indexOf(parts[0]) + 1;
      const year = parts[1];

      const response = await adminService.exportReportPDF(year, monthIndex);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Financial_Report_${report_month.replace(' ', '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to generate professional PDF report. Please try again.');
    }
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      const res = await adminService.exportReceiptPDF(paymentId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Receipt download failed:', error);
      alert('Failed to download receipt PDF.');
    }
  };

  return (
    <div className="pms-report">
      {/* Header */}
      <header className="pms-report-header">
        <div className="pms-report-title-section">
          <h1>Financial Report — {report_month}</h1>
          <p className="pms-report-subtitle">Property Pulse PMS · Generated {generated_date}</p>
        </div>
        <div className="pms-report-actions">
          <button onClick={handleExportCSV} className="pms-btn pms-btn-outlined">Export CSV</button>
          <button onClick={handleDownloadPDF} className="pms-btn pms-btn-solid">Download PDF</button>
        </div>
      </header>

      {/* Metric Cards Row */}
      <div className="pms-metrics-grid">
        <div className="pms-metric-card">
          <span className="pms-metric-label">Total Collected</span>
          <div className="pms-metric-value">{formatCurrency(metrics.total_collected)}</div>
          <span className="pms-trend-badge pms-trend-up">↑ 8.4% vs last month</span>
        </div>
        
        <div className="pms-metric-card">
          <span className="pms-metric-label">Outstanding Amount</span>
          <div className="pms-metric-value">{formatCurrency(metrics.outstanding)}</div>
          <span className="pms-trend-badge pms-trend-down">{metrics.outstanding_tenants} tenants overdue</span>
        </div>

        <div className="pms-metric-card">
          <span className="pms-metric-label">Occupancy Rate</span>
          <div className="pms-metric-value">{metrics.occupancy_rate}%</div>
          <span className="pms-trend-badge pms-badge-blue">{metrics.occupied_units} / {metrics.total_units} units</span>
        </div>

        <div className="pms-metric-card">
          <span className="pms-metric-label">Pending Approvals</span>
          <div className="pms-metric-value">{metrics.pending_approvals}</div>
          <span className="pms-trend-badge pms-badge-blue">Awaiting review</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="pms-charts-grid">
        {/* Revenue Chart */}
        <div className="pms-chart-card">
          <h2>Revenue Performance (Last 3 Months)</h2>
          <div className="pms-chart-legend">
            <div className="pms-legend-item">
              <div className="pms-legend-color" style={{background: '#0C447C'}}></div>
              <span>Collected</span>
            </div>
            <div className="pms-legend-item">
              <div className="pms-legend-color" style={{background: '#B5D4F4'}}></div>
              <span>Outstanding</span>
            </div>
          </div>
          <div style={{height: '250px'}}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Occupancy Chart */}
        <div className="pms-chart-card">
          <h2>Occupancy by Property</h2>
          <div className="pms-occupancy-list">
            {properties.map((prop, idx) => (
              <div key={idx} className="pms-occupancy-item">
                <div className="pms-property-name">
                  <span>{prop.name}</span>
                  <span>{prop.occupancy}%</span>
                </div>
                <div className="pms-progress-bg">
                  <div 
                    className="pms-progress-fill" 
                    style={{ width: `${prop.occupancy}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="pms-table-card">
        <h2>Recent Payment Activity</h2>
        <table className="pms-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Unit</th>
              <th>Property</th>
              <th>Amount</th>
              <th>M-Pesa Ref</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((pay, idx) => (
              <tr key={idx}>
                <td style={{fontWeight: 600}}>{pay.tenant}</td>
                <td>{pay.unit}</td>
                <td>{pay.property}</td>
                <td style={{fontWeight: 700}}>{formatCurrency(pay.amount)}</td>
                <td className="pms-ref-code">{pay.mpesa_ref}</td>
                <td>{pay.date}</td>
                <td>
                  <span className={`pms-status-badge status-${pay.status}`}>
                    {pay.status}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => handleDownloadReceipt(pay.id)}
                    className="btn-text"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#185FA5', fontWeight: 'bold', textDecoration: 'none', fontSize: '13px' }}
                  >
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFinancialReport;
