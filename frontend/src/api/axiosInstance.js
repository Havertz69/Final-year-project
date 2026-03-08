import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const data = error.response?.data;
    let message = error.message;

    if (data) {
      if (typeof data === 'string') message = data;
      else if (data.message) message = data.message;
      else if (data.detail) message = data.detail;
      else if (data.non_field_errors) message = data.non_field_errors[0];
      else if (data.error) message = data.error;
      else if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        message = Array.isArray(val) ? val[0] : val;
      }
    }

    console.error(`[API Error] ${status || 'Network'}: ${message}`);
    // Inject the cleaned message back into the error object for downstream use
    error.errorMessage = message;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      // Only redirect if not already on login page to avoid loops
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
