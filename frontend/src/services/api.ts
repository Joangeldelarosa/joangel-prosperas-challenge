import axios from 'axios';
import { API_URL } from '../config';
import type { AuthRequest, AuthResponse, LoginResponse, CreateJobRequest, JobListResponse, Job } from '../types';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// JWT interceptor — attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally (skip auth endpoints)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRoute = url.includes('/api/auth/');
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('username');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (data: AuthRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },
  login: async (data: AuthRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', data);
    return response.data;
  },
};

export const jobsApi = {
  create: async (data: CreateJobRequest): Promise<{ job_id: string; status: string }> => {
    const response = await api.post('/api/jobs', data);
    return response.data;
  },
  get: async (jobId: string): Promise<Job> => {
    const response = await api.get<Job>(`/api/jobs/${jobId}`);
    return response.data;
  },
  list: async (page = 1, perPage = 20): Promise<JobListResponse> => {
    const response = await api.get<JobListResponse>('/api/jobs', {
      params: { page, per_page: perPage },
    });
    return response.data;
  },
  downloadUrl: (jobId: string): string => {
    const token = localStorage.getItem('token');
    return `${API_URL}/api/jobs/${jobId}/download?token=${token}`;
  },
};

export default api;
