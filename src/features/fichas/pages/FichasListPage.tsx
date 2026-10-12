import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Input } from '@/shared/ui';
import { classNames } from '@/shared/utils/helpers';
import {
  useFichas,
  useArchiveFicha,
  useUnarchiveFicha,
  useDeleteFicha,
  useFinalizeFicha,
  useReopenFicha,
} from '../hooks/useFichas';
import { FichaCard } from '../components/FichaCard';
import { Recordatorios } from '../components/Recordatorios';

export function FichasListPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const showArchived = pathname === '/fichas/archivadas';
  const [query, setQuery] = useState('');

  const { data: fichas, isLoading, error } = useFichas(showArchived);
  const archive = useArchiveFicha();
  const unarchive = useUnarchiveFicha();
  const deleteFicha = useDeleteFicha();
  const finalize = useFinalizeFicha();
  const reopen = useReopenFicha();

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
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Mis fichas</h1>
          <p className="mt-1 text-sm text-gray-500">
            {showArchived ? 'Fichas de trimestres pasados' : 'Gestiona tus fichas actuales'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-52">
            <Input
              type="search"
              placeholder="Buscar ficha…"
              aria-label="Buscar ficha por nombre o código"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div
            className="flex rounded-full border border-gray-200 bg-white/70 p-1"
            role="group"
            aria-label="Filtrar fichas"
          >
            <button
              type="button"
              onClick={() => navigate('/fichas')}
              aria-pressed={!showArchived}
              className={classNames(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                !showArchived ? 'bg-navy-900 text-white' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Activas
            </button>
            <button
              type="button"
              onClick={() => navigate('/fichas/archivadas')}
              aria-pressed={showArchived}
              className={classNames(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                showArchived ? 'bg-navy-900 text-white' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Archivadas
            </button>
          </div>

          <Link to="/fichas/nueva" aria-label="Nueva ficha" title="Nueva ficha">
            <Button size="icon" aria-label="Nueva ficha" title="Nueva ficha">
              +
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-5 border-t border-gray-300 pt-5">
        {fichas?.length === 0 ? (
          <Card variant="ghost">
            <CardContent className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 className="mt-2 text-lg font-bold text-gray-900">
                {showArchived ? 'No hay fichas archivadas' : 'No tienes fichas activas'}
              </h3>
              <p className="mt-1 text-gray-500">
                {showArchived ? 'Las fichas archivadas aparecerán aquí' : 'Comienza creando tu primera ficha'}
              </p>
              {!showArchived && (
                <Link to="/fichas/nueva" className="mt-4 inline-block">
                  <Button>Crear primera ficha</Button>
                </Link>
              )}
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
                isArchived={showArchived}
                onClick={() => navigate(`/fichas/${ficha.id}`)}
                onEdit={() => navigate(`/fichas/${ficha.id}/editar`)}
                onArchive={() => {
                  if (showArchived) {
                    unarchive.mutate(ficha.id);
                  } else {
                    archive.mutate(ficha.id);
                  }
                }}
                onDelete={() => {
                  if (confirm('¿Estás seguro de eliminar esta ficha? Esta acción no se puede deshacer.')) {
                    deleteFicha.mutate(ficha.id);
                  }
                }}
                onFinalize={() => {
                  if (confirm('¿Finalizar esta ficha? Se bloquearán las notas y actividades.')) {
                    finalize.mutate(ficha.id);
                  }
                }}
                onReopen={() => {
                  if (confirm('¿Reabrir esta ficha? Se permitirán cambios en notas y actividades.')) {
                    reopen.mutate(ficha.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {fichas && fichas.length > 0 && <Recordatorios fichas={fichas} />}
    </div>
  );
}
