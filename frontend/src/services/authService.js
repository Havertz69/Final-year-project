import api from '../api/axiosInstance';

const authService = {
  login: (email, password) => {
    console.log('🔍 Login attempt:', { email, password });
    console.log('🔍 API endpoint:', '/auth/login/');
    
    return api.post('/auth/login/', { email, password })
      .then(response => {
        console.log('✅ Login response:', response);
        return response;
      })
      .catch(error => {
        console.error('❌ Login error:', error);
        throw error;
      });
  },
  
  getMe: () => api.get('/auth/me/'),
};

export default authService;
