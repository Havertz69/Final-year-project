import api from '../api/axiosInstance';

const tenantService = {
  getDashboard: () => api.get('/smart/dashboard/'),
  getPayments: () => api.get('/my-payments/'),
  submitPayment: (formData) => api.post('/payments/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMaintenance: () => api.get('/smart/health-check/'),
  createMaintenance: (data) => api.post('/smart/health-check/', data),
  sendChatMessage: (data) => api.post('/messages/', data),
};

export default tenantService;
