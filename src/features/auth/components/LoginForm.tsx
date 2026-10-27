import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useModoOscuro } from '../../../shared/hooks/useModoOscuro';
import logoNoteplusNavbar from '../../../assets/logo_noteplus_navbar.png';
import logoNoteplusNavbarLight from '../../../assets/logo_noteplus_navbar_light.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login, isLoginPending } = useAuth();
  const { oscuro } = useModoOscuro();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      await login(data);
    } catch (err) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      setErrorMessage(apiError.response?.data?.error?.message || 'Credenciales inválidas. Revisa tu correo y contraseña.');
    }
  };

  return (
    <div className="w-full">
      {/* 1. Unificación de Identidad: Solo Logo NotePlus (centrado, tamaño destacado y animación de entrada) */}
      <div className="mb-8 flex justify-center">
        <img
          src={oscuro ? logoNoteplusNavbarLight : logoNoteplusNavbar}
          alt="NotePlus"
          className="h-14 sm:h-16 md:h-20 w-auto object-contain transition-all animate-logo-entrance select-none"
        />
      </div>

      {/* 2. Encabezado del Formulario */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Iniciar Sesión
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Ingresa tus credenciales para acceder a tu panel académico
        </p>
      </div>

      {/* Alerta de Error */}
      {errorMessage && (
        <div
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300"
          role="alert"
        >
          <svg className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Campo Correo */}
        <div>
          <label
            htmlFor="login-email"
            className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 block"
          >
            Correo Electrónico
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <input
              id="login-email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              {...register('email')}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm pl-10 pr-3.5 py-2.5 shadow-xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Campo Contraseña */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Contraseña
            </label>
            <a
              href="/forgot-password"
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm pl-10 pr-10 py-2.5 shadow-xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Botón Principal */}
        <button
          type="submit"
          disabled={isLoginPending}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-2.5 px-4 text-sm shadow-sm transition-colors disabled:opacity-50 mt-2"
        >
          {isLoginPending && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          <span>Iniciar Sesión</span>
        </button>
      </form>

      {/* Pie del Formulario */}
      <div className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400">
        ¿No tienes cuenta aún?{' '}
        <a
          href="/register"
          className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline transition-colors"
        >
          Regístrate
        </a>
      </div>
    </div>
  );
}