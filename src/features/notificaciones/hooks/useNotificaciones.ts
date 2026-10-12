import { useQuery } from '@tanstack/react-query';
import { notificacionesApi } from '../api/notificacionesApi';

const REFETCH_MS = 5 * 60 * 1000;

export function useNotificaciones(enabled = true) {
  return useQuery({
    queryKey: ['notificaciones'],
    queryFn: notificacionesApi.getNotificaciones,
    enabled,
    refetchInterval: REFETCH_MS,
    staleTime: 60 * 1000,
  });
}
