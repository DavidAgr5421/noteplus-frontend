import { apiClient } from '../../../shared/api/client';
import type { Ficha, FichaFormData, FichaHorario } from '../types';

export const fichasApi = {
  list: async (archivada = false): Promise<Ficha[]> => {
    const response = await apiClient.get(`/fichas?archivada=${archivada}`);
    return response.data;
  },

  get: async (id: string): Promise<Ficha> => {
    const response = await apiClient.get(`/fichas/${id}`);
    return response.data;
  },

  create: async (data: FichaFormData & { horarios: FichaHorario[] }): Promise<Ficha> => {
    const response = await apiClient.post('/fichas', data);
    return response.data;
  },

  update: async (id: string, data: Partial<FichaFormData> & { horarios?: FichaHorario[] }): Promise<Ficha> => {
    const response = await apiClient.patch(`/fichas/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/fichas/${id}`);
  },

  archive: async (id: string): Promise<Ficha> => {
    const response = await apiClient.post(`/fichas/${id}/archive`);
    return response.data;
  },

  unarchive: async (id: string): Promise<Ficha> => {
    const response = await apiClient.post(`/fichas/${id}/unarchive`);
    return response.data;
  },

  finalize: async (id: string): Promise<Ficha> => {
    const response = await apiClient.post(`/fichas/${id}/finalize`);
    return response.data;
  },

  reopen: async (id: string): Promise<Ficha> => {
    const response = await apiClient.post(`/fichas/${id}/reopen`);
    return response.data;
  },
};