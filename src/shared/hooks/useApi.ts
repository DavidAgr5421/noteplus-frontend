import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { apiClient, clearAuth, getAccessToken } from '../api/client';
import type { ApiError } from '../types/domain';

export function useApiGet<T>(key: QueryKey, url: string, enabled = true) {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: async () => {
      const response = await apiClient.get<T>(url);
      return response.data;
    },
    enabled: enabled && !!getAccessToken(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useApiPost<T, TData = unknown>(url: string) {
  const queryClient = useQueryClient();
  
  return useMutation<T, ApiError, TData>({
    mutationFn: async (data) => {
      const response = await apiClient.post<T>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useApiPatch<T, TData = unknown>(url: string) {
  const queryClient = useQueryClient();
  
  return useMutation<T, ApiError, TData>({
    mutationFn: async (data) => {
      const response = await apiClient.patch<T>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useApiPut<T, TData = unknown>(url: string) {
  const queryClient = useQueryClient();
  
  return useMutation<T, ApiError, TData>({
    mutationFn: async (data) => {
      const response = await apiClient.put<T>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useApiDelete<T>(url: string) {
  const queryClient = useQueryClient();
  
  return useMutation<T, ApiError, void>({
    mutationFn: async () => {
      const response = await apiClient.delete<T>(url);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useAuth() {
  const [user, setUser] = useState<{ id: string; nombre: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const { data, isError, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/me');
      return response.data;
    },
    enabled: !!getAccessToken(),
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (data) {
      setUser(data);
      setIsLoading(false);
    } else if (isError) {
      clearAuth();
      setUser(null);
      setIsLoading(false);
    }
  }, [data, isError]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { accessToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    await refetch();
    return response.data;
  }, [refetch]);

  const register = useCallback(async (nombre: string, email: string, password: string) => {
    const response = await apiClient.post('/auth/register', { nombre, email, password });
    const { accessToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    await refetch();
    return response.data;
  }, [refetch]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearAuth();
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  return { user, isLoading, login, register, logout, refetch };
}