import { apiClient } from '../../../shared/api/client';
import type { NotificacionesResponse } from '../types';

export const notificacionesApi = {
  getNotificaciones: async (): Promise<NotificacionesResponse> => {
    const response = await apiClient.get('/notificaciones');
    return response.data;
  },
};
