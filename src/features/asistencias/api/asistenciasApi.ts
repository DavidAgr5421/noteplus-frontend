import { apiClient } from '../../../shared/api/client';
import type { Clase, Asistencia, AsistenciaFormData } from '../types';

export const asistenciasApi = {
  getCalendar: async (from: string, to: string): Promise<Clase[]> => {
    const response = await apiClient.get(`/clases?from=${from}&to=${to}`);
    return response.data;
  },

  getClase: async (claseId: string): Promise<Clase> => {
    const response = await apiClient.get(`/clases/${claseId}`);
    return response.data;
  },

  getToday: async (): Promise<Clase | null> => {
    try {
      const response = await apiClient.get('/clases/today');
      const data = response.data;
      // Backend returns list (multiple classes per day); UI shows the first
      if (Array.isArray(data)) return data[0] ?? null;
      return data;
    } catch {
      return null;
    }
  },

  getAsistencias: async (claseId: string): Promise<Asistencia[]> => {
    const response = await apiClient.get(`/clases/${claseId}/asistencias`);
    return response.data;
  },

  saveAsistencias: async (claseId: string, asistencias: AsistenciaFormData[]): Promise<Asistencia[]> => {
    const response = await apiClient.put(`/clases/${claseId}/asistencias`, { asistencias });
    return response.data;
  },

  updateClase: async (claseId: string, data: { modalidad: 'PRESENCIAL' | 'VIRTUAL'; realizada: boolean; observacion?: string }): Promise<Clase> => {
    const response = await apiClient.patch(`/clases/${claseId}`, data);
    return response.data;
  },
};