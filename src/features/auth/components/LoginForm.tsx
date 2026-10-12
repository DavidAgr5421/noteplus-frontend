import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../shared/ui';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// TODO temporal: modo admin permite la clave corta del seed (5421).
// Quitar cuando el admin tenga una contraseña definitiva de 8+ caracteres.
const adminLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const ADMIN_EMAIL = 'admin@noteplus.local';

export function LoginForm() {
  const { login, isLoginPending } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(adminMode ? adminLoginSchema : loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const toggleAdminMode = () => {
    const next = !adminMode;
    setAdminMode(next);
    setErrorMessage(null);
    clearErrors();
    if (next) {
      setValue('email', ADMIN_EMAIL);
      setValue('password', '');
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      await login(data);
    } catch (err) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      setErrorMessage(apiError.response?.data?.error?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <Card variant="outlined" className="mx-auto mt-0 w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
        <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMessage && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl" role="alert">
              {errorMessage}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            placeholder="tu@email.com"
            error={errors.email?.message}
            {...register('email')}
            autoComplete="email"
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
          <Button type="submit" fullWidth loading={isLoginPending} className="mt-2">
            Iniciar Sesión
          </Button>
          <Button
            type="button"
            variant={adminMode ? 'outline' : 'ghost'}
            fullWidth
            onClick={toggleAdminMode}
          >
            {adminMode ? 'Salir del modo admin' : 'Modo admin'}
          </Button>
          {adminMode && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-2 text-center">
              Modo admin temporal: usa {ADMIN_EMAIL} con su clave corta.
            </p>
          )}
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="text-blue-600 hover:underline font-medium">
            Regístrate
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}