import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/shared/ui';
import { classNames, formatHora, getShortDayName } from '@/shared/utils/helpers';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import {
  useFichas,
  useArchiveFicha,
  useUnarchiveFicha,
  useDeleteFicha,
  useFinalizeFicha,
  useReopenFicha,
} from '../hooks/useFichas';
import { FichaCard } from '../components/FichaCard';
import type { Ficha } from '../types';

interface PendingAction {
  title: string;
  message: string;
  confirmText: string;
  variant: 'danger' | 'primary';
  action: () => void;
}

type SortOption = 'nombre' | 'codigo' | 'aprendices' | 'clases';
type ViewOption = 'grid' | 'tabla';

export function FichasListPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { formato } = useFormatoHora();
  const showArchived = pathname === '/fichas/archivadas';

  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('nombre');
  const [vista, setVista] = useState<ViewOption>('grid');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Consultar fichas activas y archivadas
  const { data: fichas, isLoading, error } = useFichas(showArchived);
  const { data: todasActivas } = useFichas(false);
  const { data: todasArchivadas } = useFichas(true);

  const totalActivas = todasActivas?.length ?? (showArchived ? 0 : fichas?.length ?? 0);
  const totalArchivadas = todasArchivadas?.length ?? (showArchived ? fichas?.length ?? 0 : 0);

  const archive = useArchiveFicha();
  const unarchive = useUnarchiveFicha();
  const deleteFicha = useDeleteFicha();
  const finalize = useFinalizeFicha();
  const reopen = useReopenFicha();

  // Estadísticas consolidadas calculadas para el Centro de Inteligencia
  const { totalAprendicesGlobal, totalClasesGlobal, clasesImpartidasGlobal, tasaAvanceGlobal } = useMemo(() => {
    const lista = todasActivas ?? fichas ?? [];
    const aprendices = lista.reduce((acc, f) => acc + (f.numeroEstudiantes || 0), 0);
    const clasesTotales = lista.reduce((acc, f) => acc + (f.totalClases || 0), 0);
    const clasesRest = lista.reduce((acc, f) => acc + (f.clasesRestantes ?? f.totalClases), 0);
    const impartidas = Math.max(0, clasesTotales - clasesRest);
    const tasa = clasesTotales > 0 ? Math.round((impartidas / clasesTotales) * 100) : 0;

    return {
      totalAprendicesGlobal: aprendices,
      totalClasesGlobal: clasesTotales,
      clasesImpartidasGlobal: impartidas,
      tasaAvanceGlobal: tasa,
    };
  }, [todasActivas, fichas]);

  // Filtrado y ordenamiento de fichas
  const fichasProcesadas = useMemo(() => {
    const lista = (fichas ?? []).filter((f) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        f.nombre.toLowerCase().includes(q) ||
        f.codigo.toLowerCase().includes(q) ||
        (f.trimestre && f.trimestre.toLowerCase().includes(q))
      );
    });

    return lista.sort((a, b) => {
      if (sortBy === 'nombre') {
        return a.nombre.localeCompare(b.nombre);
      }
      if (sortBy === 'codigo') {
        return a.codigo.localeCompare(b.codigo);
      }
      if (sortBy === 'aprendices') {
        return (b.numeroEstudiantes ?? 0) - (a.numeroEstudiantes ?? 0);
      }
      if (sortBy === 'clases') {
        return (a.clasesRestantes ?? a.totalClases) - (b.clasesRestantes ?? b.totalClases);
      }
      return 0;
    });
  }, [fichas, query, sortBy]);

  const formatearHorario = (ficha: Ficha) => {
    const horarios = [...(ficha.horarios ?? [])].sort(
      (a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora)
    );
    if (horarios.length === 0) return 'Sin horario';
    const partes = horarios.map((h) => `${getShortDayName(h.diaSemana)} ${formatHora(h.hora, formato)}`);
    return partes.join(' · ');
  };

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-base font-semibold text-rose-600 dark:text-rose-400">Error al cargar las fichas</p>
        <p className="mt-1 text-xs text-slate-500">Verifica tu conexión y vuelve a intentar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Encabezado de Sección con Tabs Integradas */}
      <div className="flex flex-col gap-4 border-b border-slate-200/90 pb-4 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {showArchived ? 'Fichas Archivadas' : 'Mis Fichas'}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              {showArchived
                ? 'Historial de fichas finalizadas y periodos formativos culminados'
                : 'Administración académica, control de cupos y seguimiento de programas activos'}
            </p>
          </div>

          {/* Tabs sobrias de estado (Activas / Archivadas) con indicador en verde esmeralda */}
          <nav className="flex space-x-6" aria-label="Filtro de estado de fichas">
            <button
              type="button"
              onClick={() => navigate('/fichas')}
              className={classNames(
                'flex items-center gap-2 pb-1 text-sm font-semibold transition-all border-b-2',
                !showArchived
                  ? 'border-emerald-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <span>Activas</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {totalActivas}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/fichas/archivadas')}
              className={classNames(
                'flex items-center gap-2 pb-1 text-sm font-semibold transition-all border-b-2',
                showArchived
                  ? 'border-emerald-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <span>Archivadas</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {totalArchivadas}
              </span>
            </button>
          </nav>
        </div>

        {/* Botón primario de creación */}
        <Link
          to="/fichas/nueva"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B192C] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/40 dark:bg-emerald-600 dark:hover:bg-emerald-500 self-start sm:self-auto shrink-0"
        >
          <span className="text-emerald-400 font-bold">+</span>
          <span>Nueva Ficha</span>
        </Link>
      </div>

      {/* 2. Estructura en Layout Asimétrico 70/30 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

        {/* COLUMNA PRINCIPAL (~70% - lg:col-span-8): Toolbar + Cuadrícula compacta de Fichas */}
        <div className="space-y-4 lg:col-span-8">
          {/* Toolbar horizontal exclusiva de la columna izquierda */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Input de búsqueda estilizado con icono */}
            <div className="relative min-w-[200px] flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar ficha o código..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8.5 pr-3 text-xs text-slate-800 shadow-2xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-white/15 dark:bg-black dark:text-white"
              />
            </div>

            {/* Selector de ordenamiento */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs font-medium text-slate-700 shadow-2xs focus:border-emerald-500 focus:outline-none dark:border-white/15 dark:bg-black dark:text-slate-200"
            >
              <option value="nombre">Ordenar por: Nombre</option>
              <option value="codigo">Ordenar por: Código</option>
              <option value="aprendices">Ordenar por: Aprendices</option>
              <option value="clases">Ordenar por: Clases restantes</option>
            </select>

            {/* Switch Grid vs Tabla */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-0.5 dark:border-white/15 dark:bg-black">
              <button
                type="button"
                onClick={() => setVista('grid')}
                className={classNames(
                  'rounded-lg p-1.5 text-xs transition-colors',
                  vista === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-zinc-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                )}
                title="Vista en tarjetas (Grid 2 columnas)"
                aria-label="Vista en tarjetas"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setVista('tabla')}
                className={classNames(
                  'rounded-lg p-1.5 text-xs transition-colors',
                  vista === 'tabla'
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-zinc-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                )}
                title="Vista en tabla"
                aria-label="Vista en tabla"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          {fichas?.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-white/15 dark:bg-black">
              <svg className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                {showArchived ? 'No hay fichas archivadas' : 'No tienes fichas activas actualmente'}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {showArchived ? 'Las fichas que culmines se listarán aquí.' : 'Comienza creando tu primera ficha formativa para registrar asistencias.'}
              </p>
              {!showArchived && (
                <Link
                  to="/fichas/nueva"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-500"
                >
                  <span>+ Crear primera ficha</span>
                </Link>
              )}
            </div>
          ) : fichasProcesadas.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                No se encontraron fichas que coincidan con «{query}».
              </p>
            </div>
          ) : vista === 'grid' ? (
            /* VISTA GRID COMPACTA EN 2 COLUMNAS (Sin desperdicio vertical) */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {fichasProcesadas.map((ficha) => (
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
          ) : (
            /* VISTA TABLA COMPACTA */
            <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-white/15 dark:bg-black">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-black dark:text-slate-400">
                    <th scope="col" className="py-2.5 px-3.5 font-semibold">Código</th>
                    <th scope="col" className="py-2.5 px-3.5 font-semibold">Programa</th>
                    <th scope="col" className="py-2.5 px-3.5 font-semibold">Horario</th>
                    <th scope="col" className="py-2.5 px-3.5 font-semibold">Trimestre</th>
                    <th scope="col" className="py-2.5 px-3.5 font-semibold">Aprendices</th>
                    <th scope="col" className="py-2.5 px-3.5 font-semibold">Progreso</th>
                    <th scope="col" className="py-2.5 px-3.5 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {fichasProcesadas.map((f) => {
                    const total = f.totalClases || 1;
                    const restantes = f.clasesRestantes ?? f.totalClases;
                    const realizadas = Math.max(0, total - restantes);
                    const pct = Math.min(100, Math.max(0, Math.round((realizadas / total) * 100)));

                    return (
                      <tr
                        key={f.id}
                        onClick={() => navigate(`/fichas/${f.id}`)}
                        className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-950"
                      >
                        <td className="py-3 px-3.5 font-mono font-medium text-slate-500 dark:text-slate-400">
                          #{f.codigo}
                        </td>

                        <td className="py-3 px-3.5 font-semibold text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                          <div className="flex items-center gap-2">
                            <span>{f.nombre}</span>
                            {(f.archivada || f.finalizada) && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                {f.archivada ? 'Archivada' : 'Finalizada'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300">
                          {formatearHorario(f)}
                        </td>

                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300">
                          {f.trimestre || '—'}
                        </td>

                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300">
                          {f.numeroEstudiantes ?? 0} registrados
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="w-24">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                              <span>{restantes} rest.</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/fichas/${f.id}`);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 dark:border-white/15 dark:bg-black dark:text-slate-200 dark:hover:bg-zinc-900"
                          >
                            Gestionar ↗
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COLUMNA LATERAL (~30% - lg:col-span-4): CENTRO DE INTELIGENCIA MONOLÍTICO */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20" aria-label="Centro de inteligencia de fichas">
          <div className="rounded-2xl border border-slate-200/90 bg-slate-100/80 p-5 shadow-xs dark:border-white/15 dark:bg-black divide-y divide-slate-200/80 dark:divide-white/10 space-y-5">

            {/* Bloque 1: Resumen Consolidado de Formación */}
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Estado Global de Fichas
              </h2>

              <div className="mt-3.5 grid grid-cols-2 gap-3 divide-x divide-slate-200/80 dark:divide-white/10">
                {/* Aprendices Activos */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Aprendices
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                      {totalAprendicesGlobal}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">matriculados</span>
                  </div>
                </div>

                {/* Tasa de Avance Global */}
                <div className="pl-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Avance Global
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {tasaAvanceGlobal}%
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">del trimestre</span>
                  </div>
                </div>
              </div>

              {/* Sesiones impartidas */}
              <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>Sesiones impartidas:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">
                  {clasesImpartidasGlobal} de {totalClasesGlobal} planificadas
                </span>
              </div>
            </div>

            {/* Bloque 2: Próximas Fechas Límite / Novedades de Fichas */}
            <div className="pt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Hitos & Novedades
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Al día
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5 dark:border-white/10 dark:bg-zinc-950">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">CGSIG</span>
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      En 3 días
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                    Cierre de evaluaciones parciales y registro de evidencias
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5 dark:border-white/10 dark:bg-zinc-950">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">ADSO</span>
                    <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      Viernes
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                    Reporte mensual consolidado de inasistencias y deserciones
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5 dark:border-white/10 dark:bg-zinc-950">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">AA</span>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Al día
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                    Actividades académicas y registro de asistencia al 100%
                  </p>
                </div>
              </div>
            </div>

            {/* Bloque 3: Acciones Rápidas de Administración de Fichas */}
            <div className="pt-5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Acciones de Gestión
              </h2>

              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => navigate('/asistencias')}
                  className="group flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 p-2.5 text-left text-xs font-semibold text-slate-700 transition-all hover:bg-white dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200 dark:hover:bg-zinc-900"
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Descargar consolidado general (Excel)</span>
                  </div>
                  <span className="text-slate-400 group-hover:text-slate-800 transition-transform group-hover:translate-x-0.5 dark:group-hover:text-white">›</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(fichas && fichas.length > 0 ? `/fichas/${fichas[0].id}/estudiantes` : '/fichas')}
                  className="group flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 p-2.5 text-left text-xs font-semibold text-slate-700 transition-all hover:bg-white dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200 dark:hover:bg-zinc-900"
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span>Asignar nuevo aprendiz a ficha</span>
                  </div>
                  <span className="text-slate-400 group-hover:text-slate-800 transition-transform group-hover:translate-x-0.5 dark:group-hover:text-white">›</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/calendario')}
                  className="group flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 p-2.5 text-left text-xs font-semibold text-slate-700 transition-all hover:bg-white dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200 dark:hover:bg-zinc-900"
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Ajustar cronograma del trimestre</span>
                  </div>
                  <span className="text-slate-400 group-hover:text-slate-800 transition-transform group-hover:translate-x-0.5 dark:group-hover:text-white">›</span>
                </button>
              </div>
            </div>

          </div>
        </aside>

      </div>

      {/* Diálogo de Confirmación */}
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
