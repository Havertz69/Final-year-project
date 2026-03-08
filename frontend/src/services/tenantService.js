import api from '../api/axiosInstance';

const tenantService = {
  getDashboard: () => api.get('/tenant/dashboard/'),
  getProfile: () => api.get('/my-unit/'),
  getFullProfile: () => api.get('/tenant/profile/'),
  getPayments: () => api.get('/my-payments/'),
  submitPayment: (formData) => api.post('/my-payments/submit/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMaintenance: () => api.get('/my-maintenance/'),
  createMaintenance: (data) => api.post('/my-maintenance/', data),
  sendChatMessage: (data) => api.post('/messages/', data),
  getPaymentEvidence: () => api.get('/my-payment-evidence/'),
  uploadPaymentEvidence: (formData) => api.post('/my-payment-evidence/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  downloadPaymentReceipt: (paymentId) => api.get(`/payments/${paymentId}/receipt/`, {
    responseType: 'blob', // crucial for handling PDF downloads
  }),
  getLeaseDocument: () => api.get('/my-lease-document/'),
  getNotifications: () => api.get('/my-notifications/'),
  markNotificationsRead: (data) => api.post('/my-notifications/mark-read/', data),
  updateProfile: (data) => api.patch('/my-profile/update/', data),
  changePassword: (data) => api.post('/my-profile/change-password/', data),
};

export default tenantService;
