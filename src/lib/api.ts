import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for logging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`🚀 [API Request] ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params
    });
    return config;
  },
  (error) => {
    console.error('❌ [API Request Error]', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ [API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ [API Response Error]', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      try {
        const response = await axiosInstance.post('/auth/login', {
          email,
          password
        });
        return response.data;
      } catch (error) {
        console.error('[Auth Login Error]', error);
        throw error;
      }
    },
    register: async (email: string, password: string) => {
      try {
        const response = await axiosInstance.post('/auth/register', {
          email,
          password
        });
        return response.data;
      } catch (error) {
        console.error('[Auth Register Error]', error);
        throw error;
      }
    },
    logout: async () => {
      try {
        const response = await axiosInstance.post('/auth/logout');
        return response.data;
      } catch (error) {
        console.error('[Auth Logout Error]', error);
        throw error;
      }
    }
  },
  email: {
    monitor: async (emailData: {
      emailId: string;
      recipient: string;
      type: string;
      status: string;
      error?: string;
    }) => {
      try {
        const response = await axiosInstance.post('/email/monitor', emailData);
        return response.data;
      } catch (error) {
        console.error('[Email Monitor Error]', error);
        throw error;
      }
    },
    getStats: async (startDate: Date, endDate: Date) => {
      try {
        const response = await axiosInstance.get('/email/stats', {
          params: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          }
        });
        return response.data;
      } catch (error) {
        console.error('[Email Stats Error]', error);
        throw error;
      }
    }
  }
};