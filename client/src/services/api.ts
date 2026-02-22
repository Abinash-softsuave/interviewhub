import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// Auth
export const register = (data: { name: string; email: string; password: string; role: string }) =>
  api.post('/auth/register', data);

export const login = (data: { email: string; password: string }) =>
  api.post('/auth/login', data);

// Users
export const getUsers = (role?: string) =>
  api.get('/users', { params: role ? { role } : {} });

export const createUser = (data: { name: string; email: string; password: string; role: string }) =>
  api.post('/users', data);

export const deleteUser = (id: string) => api.delete(`/users/${id}`);

// Interviews
export const createInterview = (data: any) => api.post('/interviews', data);
export const getInterviews = () => api.get('/interviews');
export const getMyInterviews = () => api.get('/interviews/my');
export const getInterview = (id: string) => api.get(`/interviews/${id}`);
export const updateInterview = (id: string, data: any) => api.patch(`/interviews/${id}`, data);
export const deleteInterview = (id: string) => api.delete(`/interviews/${id}`);
export const getAnalytics = () => api.get('/interviews/analytics');

// Submissions
export const submitCode = (data: { interviewId: string; language: string; code: string }) =>
  api.post('/submissions', data);
export const getSubmissions = (interviewId: string) =>
  api.get(`/submissions/interview/${interviewId}`);

// Chat
export const getChatMessages = (interviewId: string) => api.get(`/chat/${interviewId}`);

export default api;
