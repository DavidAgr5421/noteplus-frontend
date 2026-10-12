import { apiClient } from '../../../shared/api/client';
import type { Estudiante, EstudianteFormData } from '../types';

export const estudiantesApi = {
  list: async (fichaId: string): Promise<Estudiante[]> => {
    const response = await apiClient.get(`/fichas/${fichaId}/estudiantes`);
    return response.data;
  },

  get: async (fichaId: string, id: string): Promise<Estudiante> => {
    const response = await apiClient.get(`/fichas/${fichaId}/estudiantes/${id}`);
    return response.data;
  },

  create: async (fichaId: string, data: EstudianteFormData): Promise<Estudiante> => {
    const response = await apiClient.post(`/fichas/${fichaId}/estudiantes`, data);
    return response.data;
  },

  update: async (fichaId: string, id: string, data: Partial<EstudianteFormData>): Promise<Estudiante> => {
    const response = await apiClient.patch(`/fichas/${fichaId}/estudiantes/${id}`, data);
    return response.data;
  },

  delete: async (fichaId: string, id: string): Promise<void> => {
    await apiClient.delete(`/fichas/${fichaId}/estudiantes/${id}`);
  },

  importCSV: async (fichaId: string, file: File): Promise<{ imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/fichas/${fichaId}/estudiantes/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  importBatch: async (
    fichaId: string,
    estudiantes: { nombre: string; tipoIdentificacion: string; identificacion: string; email?: string; contacto?: string }[],
  ): Promise<{ created: number; skipped: { index: number; reason: string }[] }> => {
    const response = await apiClient.post(`/fichas/${fichaId}/estudiantes/import-batch`, { estudiantes });
    return response.data;
  },
};