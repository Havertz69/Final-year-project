import api from '../api/axiosInstance';

const adminService = {
  getDashboard: () => api.get('/api/admin/dashboard'),
  getUnits: () => api.get('/api/admin/units'),
  createUnit: (data) => api.post('/api/admin/units', data),
  updateUnit: (id, data) => api.put(`/api/admin/units/${id}`, data),
  deleteUnit: (id) => api.delete(`/api/admin/units/${id}`),
  getTenants: () => api.get('/api/admin/tenants'),
  createTenant: (data) => api.post('/api/admin/tenants', data),
  updateTenant: (id, data) => api.put(`/api/admin/tenants/${id}`, data),
  deleteTenant: (id) => api.delete(`/api/admin/tenants/${id}`),
  getPayments: (params) => api.get('/api/admin/payments', { params }),
  confirmPayment: (id) => api.put(`/api/admin/payments/${id}/confirm`),
  getIncomeReports: (params) => api.get('/api/admin/reports/income', { params }),
  getMaintenance: () => api.get('/api/admin/maintenance'),
  updateMaintenance: (id, data) => api.put(`/api/admin/maintenance/${id}`, data),
  sendChatMessage: (data) => api.post('/api/admin/chatbot', data),
};

export default adminService;
