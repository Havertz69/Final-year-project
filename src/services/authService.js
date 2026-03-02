import api from '../api/axiosInstance';

const authService = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  getMe: () => api.get('/api/auth/me'),
};

export default authService;
