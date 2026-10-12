import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estudiantesApi } from '../api/estudiantesApi';
import type { EstudianteFormData } from '../types';

export function useEstudiantes(fichaId: string) {
  return useQuery({
    queryKey: ['estudiantes', fichaId],
    queryFn: () => estudiantesApi.list(fichaId),
    enabled: !!fichaId,
  });
}

export function useCreateEstudiante(fichaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EstudianteFormData) => estudiantesApi.create(fichaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes', fichaId] });
    },
  });
}

export function useUpdateEstudiante(fichaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EstudianteFormData> }) =>
      estudiantesApi.update(fichaId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes', fichaId] });
      queryClient.invalidateQueries({ queryKey: ['estudiantes', fichaId, id] });
    },
  });
}

export function useDeleteEstudiante(fichaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => estudiantesApi.delete(fichaId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes', fichaId] });
    },
  });
}

export function useImportEstudiantes(fichaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => estudiantesApi.importCSV(fichaId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes', fichaId] });
    },
  });
}

export function useImportBatch(fichaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      estudiantes: { nombre: string; tipoIdentificacion: string; identificacion: string; email?: string; contacto?: string }[],
    ) => estudiantesApi.importBatch(fichaId, estudiantes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes', fichaId] });
    },
  });
}