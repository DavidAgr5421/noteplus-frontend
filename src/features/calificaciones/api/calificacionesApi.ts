import { apiClient } from '../../../shared/api/client';
import type { Actividad, FichaNotas, ActividadFormData, CalificacionFormData } from '../types';

export const calificacionesApi = {
  getFichaNotas: async (fichaId: string): Promise<FichaNotas> => {
    const response = await apiClient.get(`/fichas/${fichaId}/notas`);
    return response.data;
  },

  getActividades: async (fichaId: string): Promise<Actividad[]> => {
    const response = await apiClient.get(`/fichas/${fichaId}/actividades`);
    return response.data;
  },

  createActividad: async (fichaId: string, data: ActividadFormData): Promise<Actividad> => {
    const response = await apiClient.post(`/fichas/${fichaId}/actividades`, data);
    return response.data;
  },

  updateActividad: async (fichaId: string, id: string, data: Partial<ActividadFormData>): Promise<Actividad> => {
    const response = await apiClient.patch(`/fichas/${fichaId}/actividades/${id}`, data);
    return response.data;
  },

  deleteActividad: async (fichaId: string, id: string): Promise<void> => {
    await apiClient.delete(`/fichas/${fichaId}/actividades/${id}`);
  },

  saveCalificaciones: async (actividadId: string, calificaciones: CalificacionFormData[]): Promise<void> => {
    const payload = calificaciones.map(({ estudianteId, nota }) => ({ estudianteId, nota }));
    await apiClient.put(`/actividades/${actividadId}/calificaciones`, { calificaciones: payload });
  },

  finalizeFicha: async (fichaId: string): Promise<void> => {
    await apiClient.post(`/fichas/${fichaId}/finalize`);
  },

  reopenFicha: async (fichaId: string): Promise<void> => {
    await apiClient.post(`/fichas/${fichaId}/reopen`);
  },

  updateNotaMinima: async (fichaId: string, notaMinima: number): Promise<void> => {
    await apiClient.patch(`/fichas/${fichaId}`, { notaMinimaAprobacion: notaMinima });
  },

  copiarActividades: async (
    fichaId: string,
    data: { origenFichaId: string; reemplazarExistentes?: boolean }
  ): Promise<Actividad[]> => {
    const response = await apiClient.post(`/fichas/${fichaId}/copiar-actividades`, data);
    return response.data;
  },
};