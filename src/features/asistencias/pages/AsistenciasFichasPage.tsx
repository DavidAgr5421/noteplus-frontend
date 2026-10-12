import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Input } from '@/shared/ui';
import { useFichas } from '@/features/fichas/hooks/useFichas';
import { FichaCard } from '@/features/fichas/components/FichaCard';

export function AsistenciasFichasPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { data: fichas, isLoading, error } = useFichas(false);

  const filtradas = (fichas ?? []).filter((ficha) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return ficha.nombre.toLowerCase().includes(q) || ficha.codigo.toLowerCase().includes(q);
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-navy-900 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">Error al cargar las fichas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-3xl px-5 py-4"
        style={{ background: 'linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0))' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-green-500" aria-hidden="true"></span>
              <p className="truncate text-[1.8rem] font-bold leading-tight text-gray-900">
                Asistencias <span className="text-gray-400">- Fichas</span>
              </p>
            </div>
            <p className="mt-1 text-sm text-gray-500">Elegí una ficha para gestionar sus asistencias</p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pr-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-green-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Fichas</span>
              <span className="text-sm font-semibold tabular-nums text-gray-800">
                {(fichas ?? []).length}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-gray-900">Fichas</h3>
          <p className="text-sm text-gray-500">
            {`${filtradas.length} de ${(fichas ?? []).length} fichas`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </svg>
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              aria-label="Buscar ficha por nombre o código"
              className="py-1.5 pl-10 text-sm sm:w-56"
            />
          </div>
        </div>
      </div>

      <div>
        {fichas?.length === 0 ? (
          <Card variant="ghost">
            <CardContent className="py-12 text-center">
              <h3 className="mt-2 text-lg font-bold text-gray-900">No tienes fichas activas</h3>
              <p className="mt-1 text-gray-500">Comienza creando tu primera ficha</p>
              <Link to="/fichas/nueva" className="mt-4 inline-block">
                <Button>Crear primera ficha</Button>
              </Link>
            </CardContent>
          </Card>
        ) : filtradas.length === 0 ? (
          <Card variant="ghost">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No hay fichas que coincidan con “{query}”.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtradas.map((ficha) => (
              <FichaCard
                key={ficha.id}
                ficha={ficha}
                onClick={() => navigate(`/fichas/${ficha.id}/asistencias`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
