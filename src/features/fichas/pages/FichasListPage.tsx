import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Input, ConfirmDialog } from '@/shared/ui';
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

interface PendingAction {
  title: string;
  message: string;
  confirmText: string;
  variant: 'danger' | 'primary';
  action: () => void;
}

export function FichasListPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const showArchived = pathname === '/fichas/archivadas';
  const [query, setQuery] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-900 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-rose-600 dark:text-rose-400 font-medium">Error al cargar las fichas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Split layout: Left (Header + Mosaic of Fichas) - Right (Recordatorios & Actividades) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Main Left Section */}
        <section className="lg:col-span-7 xl:col-span-8 min-w-0 space-y-4" aria-label="Lista de fichas">
          {/* Header Mis Fichas */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Mis fichas</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {showArchived ? 'Fichas de trimestres archivados' : 'Gestiona y consulta tus fichas actuales'}
            </p>
          </div>

          {/* Controls bar: spans same width as mosaic, divided in two */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left half: Filter pills */}
            <div
              className="flex rounded-full border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-0.5 shadow-xs w-fit"
              role="group"
              aria-label="Filtrar fichas"
            >
              <button
                type="button"
                onClick={() => navigate('/fichas')}
                aria-pressed={!showArchived}
                className={classNames(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                  !showArchived
                    ? 'bg-navy-900 text-emerald-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                )}
              >
                Activas
              </button>
              <button
                type="button"
                onClick={() => navigate('/fichas/archivadas')}
                aria-pressed={showArchived}
                className={classNames(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                  showArchived
                    ? 'bg-navy-900 text-emerald-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                )}
              >
                Archivadas
              </button>
            </div>

            {/* Right half: Search bar + "+" button beside it */}
            <div className="flex items-center gap-2 flex-1 sm:max-w-xs justify-end">
              <div className="flex-1 min-w-0">
                <Input
                  type="search"
                  placeholder="Buscar ficha o código…"
                  aria-label="Buscar ficha por nombre o código"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {/* Botón nueva ficha: "+" a menos que haya hover */}
              <Link
                to="/fichas/nueva"
                aria-label="Nueva ficha"
                title="Nueva ficha"
                className="group relative inline-flex items-center shrink-0"
              >
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-navy-900 text-emerald-400 font-semibold h-9.5 px-3 transition-all duration-300 hover:bg-navy-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-navy-900/40"
                >
                  <span className="text-xl leading-none font-bold">+</span>
                  <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap text-xs font-semibold group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300">
                    Nueva ficha
                  </span>
                </button>
              </Link>
            </div>
          </div>
          {fichas?.length === 0 ? (
            <Card variant="outlined">
              <CardContent className="py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                  {showArchived ? 'No hay fichas archivadas' : 'No tienes fichas activas'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {showArchived ? 'Las fichas que archives aparecerán aquí' : 'Comienza creando tu primera ficha formativa'}
                </p>
                {!showArchived && (
                  <Link to="/fichas/nueva" className="mt-4 inline-block">
                    <Button variant="navyGreen" size="sm">Crear primera ficha</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : filtradas.length === 0 ? (
            <Card variant="outlined">
              <CardContent className="py-10 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">No hay fichas que coincidan con “{query}”.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    setPendingAction({
                      title: 'Eliminar ficha',
                      message: `¿Estás seguro de eliminar la ficha "${ficha.nombre}"? Esta acción no se puede deshacer.`,
                      confirmText: 'Eliminar',
                      variant: 'danger',
                      action: () => deleteFicha.mutate(ficha.id),
                    });
                  }}
                  onFinalize={() => {
                    setPendingAction({
                      title: 'Finalizar ficha',
                      message: `¿Finalizar la ficha "${ficha.nombre}"? Se bloquearán los cambios en notas y actividades.`,
                      confirmText: 'Finalizar',
                      variant: 'primary',
                      action: () => finalize.mutate(ficha.id),
                    });
                  }}
                  onReopen={() => {
                    setPendingAction({
                      title: 'Reabrir ficha',
                      message: `¿Reabrir la ficha "${ficha.nombre}"? Se permitirán cambios nuevamente.`,
                      confirmText: 'Reabrir',
                      variant: 'primary',
                      action: () => reopen.mutate(ficha.id),
                    });
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right Sidebar Section: Recordatorios y Actividades */}
        <aside className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20" aria-label="Recordatorios y actividades">
          {fichas && <Recordatorios fichas={fichas} />}
        </aside>
      </div>

      {/* Confirmation Dialog */}
      {pendingAction && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setPendingAction(null)}
          onConfirm={() => {
            pendingAction.action();
            setPendingAction(null);
          }}
          title={pendingAction.title}
          message={pendingAction.message}
          confirmText={pendingAction.confirmText}
          variant={pendingAction.variant}
        />
      )}
    </div>
  );
}
