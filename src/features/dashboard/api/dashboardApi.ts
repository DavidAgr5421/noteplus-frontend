import { apiClient } from '@/shared/api/client';
import type { DashboardData } from '../types';

export const dashboardApi = {
  get: async (): Promise<DashboardData> => {
    const response = await apiClient.get('/dashboard');
    return response.data;
  },
};
