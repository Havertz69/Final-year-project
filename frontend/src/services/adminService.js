import api from '../api/axiosInstance';

const adminService = {
  getDashboard: () => api.get('/dashboard-stats/'),
  getUnits: () => api.get('/units/'),
  createUnit: (data) => api.post('/units/', data),
  updateUnit: (id, data) => api.put(`/units/${id}/`, data),
  deleteUnit: (id) => api.delete(`/units/${id}/`),
  getTenants: () => api.get('/tenants/'),
  createTenant: (data) => api.post('/tenants/', data),
  updateTenant: (id, data) => api.put(`/tenants/${id}/`, data),
  deleteTenant: (id) => api.delete(`/tenants/${id}/`),
  getPayments: (params) => api.get('/payments/', { params }),
  confirmPayment: (id) => api.put(`/payments/${id}/confirm/`),
  getIncomeReports: (params) => api.get('/smart/monthly-report/', { params }),
  getMaintenance: () => api.get('/smart/health-check/'),
  updateMaintenance: (id, data) => api.put(`/smart/health-check/${id}/`, data),
  sendChatMessage: (data) => api.post('/messages/', data),
};

export default adminService;
