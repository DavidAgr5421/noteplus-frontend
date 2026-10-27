import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    enabled,
    refetchInterval: 60000, // refrescar cada minuto
  });
}
