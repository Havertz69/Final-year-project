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
  sendChatMessage: (data) => api.post('/chatbot/', data),
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
  initiateMpesaStkPush: (data) => api.post('/tenant/payments/mpesa-stk-push/', data),
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

export default tenantService;
