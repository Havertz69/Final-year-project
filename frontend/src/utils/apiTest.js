import api from '../api/axiosInstance';

export const testApiConnection = async () => {
  console.log('Testing API connection...');
  
  try {
    // Test basic connectivity
    const response = await api.get('/units/');
    console.log('API Connection successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('API Connection failed:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }
    return { success: false, error: error.message };
  }
};

export const testAuth = async () => {
  console.log('Testing authentication...');
  
  try {
    const response = await api.get('/my-unit/');
    console.log('Auth test successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Auth test failed:', error);
    return { success: false, error: error.message };
  }
};
