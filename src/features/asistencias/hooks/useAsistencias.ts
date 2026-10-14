import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { asistenciasApi } from '../api/asistenciasApi';
import type { AsistenciaFormData } from '../types';

export function useCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ['calendar', from, to],
    queryFn: () => asistenciasApi.getCalendar(from, to),
    enabled: !!from && !!to,
  });
}

export function useTodayClass() {
  return useQuery({
    queryKey: ['clases', 'today'],
    queryFn: asistenciasApi.getToday,
  });
}

export function useClase(claseId: string) {
  return useQuery({
    queryKey: ['clases', claseId],
    queryFn: () => asistenciasApi.getClase(claseId),
    enabled: !!claseId,
  });
}

export function useAsistencias(claseId: string) {
  return useQuery({
    queryKey: ['asistencias', claseId],
    queryFn: () => asistenciasApi.getAsistencias(claseId),
    enabled: !!claseId,
  });
}

export function useSaveAsistencias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claseId, asistencias }: { claseId: string; asistencias: AsistenciaFormData[] }) =>
      asistenciasApi.saveAsistencias(claseId, asistencias),
    onSuccess: (_, { claseId }) => {
      queryClient.invalidateQueries({ queryKey: ['asistencias', claseId] });
    },
  });
}

export function useUpdateClase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claseId, data }: { claseId: string; data: { modalidad: 'PRESENCIAL' | 'VIRTUAL'; realizada: boolean; observacion?: string } }) =>
      asistenciasApi.updateClase(claseId, data),
    onSuccess: (_, { claseId }) => {
      queryClient.invalidateQueries({ queryKey: ['asistencias', claseId] });
      queryClient.invalidateQueries({ queryKey: ['clases', claseId] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}