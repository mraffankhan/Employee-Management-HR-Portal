import { api } from './client';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (current_password, new_password) => 
    api.post('/auth/change-password', { current_password, new_password }),
};

