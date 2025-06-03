import axios from 'axios';

// Create axios instance with base URL
const API = axios.create({
  baseURL: 'https://meetworldbackend-production.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API calls
export const authAPI = {
  login: async (email, password) => {
    const response = await API.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (username, email, password) => {
    const response = await API.post('/auth/register', { username, email, password });
    return response.data;
  },

  completeProfile: async (profileData) => {
    const response = await API.put('/auth/complete-profile', profileData);
    return response.data;
  },

  getUserProfile: async () => {
    const response = await API.get('/auth/profile');
    return response.data;
  }
};

export default API;
