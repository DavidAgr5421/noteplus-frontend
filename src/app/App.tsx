import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { FormatoHoraProvider } from '@/shared/hooks/useFormatoHora';
import { AuthLayout } from '@/features/auth/layouts/AuthLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { FichasListPage } from '@/features/fichas/pages/FichasListPage';
import { FichaFormPage } from '@/features/fichas/pages/FichaFormPage';
import { FichaDetailPage } from '@/features/fichas/pages/FichaDetailPage';
import { CalendarPage } from '@/features/asistencias/pages/CalendarPage';
import { MarcarAsistenciasPage } from '@/features/asistencias/pages/MarcarAsistenciasPage';
import { AsistenciasPage } from '@/features/asistencias/pages/AsistenciasPage';
import { ActividadesPage } from '@/features/calificaciones/pages/ActividadesPage';
import { ActividadesFichasPage } from '@/features/calificaciones/pages/ActividadesFichasPage';
import { AsistenciasFichasPage } from '@/features/asistencias/pages/AsistenciasFichasPage';
import { EstudiantesPage } from '@/features/estudiantes/pages/EstudiantesPage';
import { Navbar } from './components/Navbar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/fichas" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/fichas" element={<FichasListPage />} />
        <Route path="/fichas/archivadas" element={<FichasListPage />} />
        <Route path="/fichas/nueva" element={<FichaFormPage />} />
        <Route path="/fichas/:id" element={<FichaDetailPage />} />
        <Route path="/fichas/:id/editar" element={<FichaFormPage />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/clases/:claseId/asistencias" element={<MarcarAsistenciasPage />} />
        <Route path="/fichas/:fichaId/asistencias" element={<AsistenciasPage />} />
        <Route path="/fichas/:fichaId/estudiantes" element={<EstudiantesPage />} />
        <Route path="/fichas/:fichaId/actividades" element={<ActividadesPage />} />
        <Route path="/actividades" element={<ActividadesFichasPage />} />
        <Route path="/asistencias" element={<AsistenciasFichasPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/fichas" replace />} />
      <Route path="*" element={<Navigate to="/fichas" replace />} />
    </Routes>
  );
}

const PAGE_GRADIENT = {
  backgroundImage: 'linear-gradient(160deg, #d3e3f4 0%, #e8f0f9 45%, #f5f8f7 100%)',
};

function MainLayout() {
  return (
    <div className="min-h-screen" style={PAGE_GRADIENT}>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FormatoHoraProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </FormatoHoraProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}