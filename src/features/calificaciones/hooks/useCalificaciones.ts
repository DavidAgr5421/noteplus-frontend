import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calificacionesApi } from '../api/calificacionesApi';
import type { ActividadFormData, CalificacionFormData } from '../types';

export function useFichaNotas(fichaId: string) {
  return useQuery({
    queryKey: ['calificaciones', fichaId],
    queryFn: () => calificacionesApi.getFichaNotas(fichaId),
    enabled: !!fichaId,
  });
}

export function useActividades(fichaId: string) {
  return useQuery({
    queryKey: ['actividades', fichaId],
    queryFn: () => calificacionesApi.getActividades(fichaId),
    enabled: !!fichaId,
  });
}

export function useCreateActividad(fichaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ActividadFormData) => calificacionesApi.createActividad(fichaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actividades', fichaId] });
      queryClient.invalidateQueries({ queryKey: ['calificaciones', fichaId] });
    },
  });
}

export function useUpdateActividad(fichaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ActividadFormData> }) =>
      calificacionesApi.updateActividad(fichaId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actividades', fichaId] });
      queryClient.invalidateQueries({ queryKey: ['calificaciones', fichaId] });
    },
  });
}

export function useDeleteActividad(fichaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => calificacionesApi.deleteActividad(fichaId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actividades', fichaId] });
      queryClient.invalidateQueries({ queryKey: ['calificaciones', fichaId] });
    },
  });
}

export function useSaveCalificaciones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ actividadId, calificaciones }: { actividadId: string; calificaciones: CalificacionFormData[] }) =>
      calificacionesApi.saveCalificaciones(actividadId, calificaciones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calificaciones'] });
    },
  });
}

export function useFinalizeFicha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fichaId: string) => calificacionesApi.finalizeFicha(fichaId),
    onSuccess: (_, fichaId) => {
      queryClient.invalidateQueries({ queryKey: ['calificaciones', fichaId] });
      queryClient.invalidateQueries({ queryKey: ['fichas', fichaId] });
    },
  });
}

export function useReopenFicha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fichaId: string) => calificacionesApi.reopenFicha(fichaId),
    onSuccess: (_, fichaId) => {
      queryClient.invalidateQueries({ queryKey: ['calificaciones', fichaId] });
      queryClient.invalidateQueries({ queryKey: ['fichas', fichaId] });
    },
  });
}

export function useUpdateNotaMinima() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fichaId, notaMinima }: { fichaId: string; notaMinima: number }) =>
      calificacionesApi.updateNotaMinima(fichaId, notaMinima),
    onSuccess: (_, { fichaId }) => {
      queryClient.invalidateQueries({ queryKey: ['calificaciones', fichaId] });
      queryClient.invalidateQueries({ queryKey: ['fichas', fichaId] });
    },
  });
}