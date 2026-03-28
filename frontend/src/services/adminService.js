import api from '../api/axiosInstance';

const adminService = {
  getDashboard: () => api.get('/smart/dashboard/'),
  getProperties: () => api.get('/properties/'),
  getUnits: () => api.get('/units/'),
  createUnit: (data) => api.post('/units/', data),
  updateUnit: (id, data) => api.patch(`/units/${id}/`, data),
  deleteUnit: (id) => api.delete(`/units/${id}/`),
  getTenants: () => api.get('/tenants/'),
  assignTenant: (data) => api.post('/assign-tenant/', data),
  unassignTenant: (id) => api.post(`/unassign-tenant/${id}/`),
  getPayments: () => api.get('/payments/'),
  confirmPayment: (id) => api.post(`/payments/${id}/confirm/`),
  declinePayment: (id) => api.post(`/payments/${id}/decline/`),
  getReports: (year, month) => api.get('/smart/monthly-report/', { params: { year, month } }),
  getMaintenance: (params) => api.get('/maintenance/', { params }),
  updateMaintenance: (id, data) => api.patch(`/maintenance/${id}/`, data),
  getRevenueTrends: (months = 12) => api.get(`/reports/revenue-trends/?months=${months}`),
  exportPaymentsCSV: (year, month) => api.get(`/reports/export-csv/`, { params: { year, month }, responseType: 'blob' }),
  getChatbot: () => api.get('/chatbot/'),
  sendChatMessage: (data) => api.post('/chatbot/', data),
  getPaymentEvidence: () => api.get('/payment-evidence/'),
  updatePaymentEvidence: (id, data) => api.patch(`/payment-evidence/${id}/`, data),
  exportReportPDF: (year, month) => api.get(`/smart/reports/export-pdf/`, { params: { year, month }, responseType: 'blob' }),
  exportReceiptPDF: (paymentId) => api.get(`/payments/${paymentId}/receipt/`, { responseType: 'blob' }),
  downloadLeasePDF: (leaseId) => api.get(`/leases/${leaseId}/export-pdf/`, { responseType: 'blob' })
    .then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Lease_Agreement_${leaseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    }),
};

export default adminService;
