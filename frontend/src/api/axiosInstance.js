import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
});

// ── Request interceptor: attach access token ──────────────────────────────
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

// ── Response interceptor: handle errors + silent token refresh ────────────
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response ? error.response.status : null;
    const data = error.response?.data;

    // Build a clean error message for downstream use
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
    error.errorMessage = message;

    // ── 401: try silent token refresh before giving up ──────────────────
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh');

      if (refreshToken) {
        if (isRefreshing) {
          // Queue the request until the refresh completes
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axiosInstance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/auth/token/refresh/`,
            { refresh: refreshToken }
          );
          const newAccessToken = res.data.access;
          localStorage.setItem('token', newAccessToken);
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          // Refresh failed — clear session and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refresh');
          localStorage.removeItem('role');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token — clear and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    console.error(`[API Error] ${status || 'Network'}: ${message}`);
    return Promise.reject(error);
  }
);

export default axiosInstance;
