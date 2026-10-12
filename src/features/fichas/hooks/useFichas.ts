import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fichasApi } from '../api/fichasApi';
import type { FichaFormData, FichaHorario } from '../types';

export function useFichas(archivada = false) {
  return useQuery({
    queryKey: ['fichas', { archivada }],
    queryFn: () => fichasApi.list(archivada),
  });
}

export function useFicha(id: string) {
  return useQuery({
    queryKey: ['fichas', id],
    queryFn: () => fichasApi.get(id),
    enabled: !!id,
  });
}

export function useCreateFicha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FichaFormData & { horarios: FichaHorario[] }) => fichasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas'] });
    },
  });
}

export function useUpdateFicha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FichaFormData> & { horarios?: FichaHorario[] } }) => fichasApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['fichas'] });
      queryClient.invalidateQueries({ queryKey: ['fichas', id] });
    },
  });
}

export function useDeleteFicha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fichasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas'] });
    },
  });
}

export function useArchiveFicha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fichasApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas'] });
    },
  });
}

export function useUnarchiveFicha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fichasApi.unarchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas'] });
    },
  });
}

export function useFinalizeFicha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fichasApi.finalize(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['fichas'] });
      queryClient.invalidateQueries({ queryKey: ['fichas', id] });
    },
  });
}

export function useReopenFicha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fichasApi.reopen(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['fichas'] });
      queryClient.invalidateQueries({ queryKey: ['fichas', id] });
    },
  });
}