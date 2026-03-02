import api from '../api/axiosInstance';

const tenantService = {
  getDashboard: () => api.get('/api/tenant/dashboard'),
  getPayments: () => api.get('/api/tenant/payments'),
  submitPayment: (formData) => api.post('/api/tenant/payments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMaintenance: () => api.get('/api/tenant/maintenance'),
  createMaintenance: (data) => api.post('/api/tenant/maintenance', data),
  sendChatMessage: (data) => api.post('/api/tenant/chatbot', data),
};

export default tenantService;
