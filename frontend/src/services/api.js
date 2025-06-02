import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/updateprofile', data),
  changePassword: (data) => api.put('/auth/changepassword', data)
};

// Code API
export const codeAPI = {
  create: (data) => api.post('/code', data),
  getAll: (params) => api.get('/code', { params }),
  getOne: (id) => api.get(`/code/${id}`),
  update: (id, data) => api.put(`/code/${id}`, data),
  delete: (id) => api.delete(`/code/${id}`),
  analyze: (id) => api.post(`/code/${id}/analyze`)
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getStudents: (params) => api.get('/admin/students', { params }),
  getStudentCodes: (studentId, params) => api.get(`/admin/students/${studentId}/codes`, { params }),
  addFeedback: (codeId, data) => api.post(`/admin/codes/${codeId}/feedback`, data),
  createUser: (data) => api.post('/admin/users', data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`)
};

export default api;