import { apiClient } from '../../../shared/api/client';
import type { LoginFormData, RegisterFormData, AuthResponse } from '../types';

export const authApi = {
  login: async (data: LoginFormData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterFormData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', {
      nombre: data.nombre,
      email: data.email,
      password: data.password,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refresh: async (): Promise<{ accessToken: string }> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  me: async (): Promise<{ id: string; nombre: string; email: string }> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};