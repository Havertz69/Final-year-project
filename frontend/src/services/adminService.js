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
  getReports: () => api.get('/smart/monthly-report/'),
  getMaintenance: (params) => api.get('/maintenance/', { params }),
  updateMaintenance: (id, data) => api.patch(`/maintenance/${id}/`, data),
  getRevenueTrends: (months = 12) => api.get(`/reports/revenue-trends/?months=${months}`),
  exportPaymentsCSV: (year, month) => api.get(`/reports/export-csv/`, { params: { year, month }, responseType: 'blob' }),
  getChatbot: () => api.get('/messages/'),
  sendChatMessage: (data) => api.post('/messages/', data),
  getPaymentEvidence: () => api.get('/payment-evidence/'),
  updatePaymentEvidence: (id, data) => api.patch(`/payment-evidence/${id}/`, data),
};

export default adminService;
