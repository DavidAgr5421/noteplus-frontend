import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { clearAuth, setAccessToken, getAccessToken } from '../../../shared/api/client';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      window.location.href = '/login';
    },
    onError: () => {
      clearAuth();
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: !!getAccessToken(),
    retry: false,
    staleTime: Infinity,
  });
}

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useMe();
  const login = useLogin();
  const register = useRegister();
  const logout = useLogout();

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    login: login.mutateAsync,
    register: register.mutateAsync,
    logout: logout.mutateAsync,
    isLoginPending: login.isPending,
    isRegisterPending: register.isPending,
    isLogoutPending: logout.isPending,
    refetch,
  };
}