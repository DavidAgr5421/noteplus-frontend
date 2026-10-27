import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFichas } from '@/features/fichas/hooks/useFichas';
import { useTodayClass } from '../hooks/useAsistencias';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import {
  formatHora,
  getShortDayName,
  classNames,
} from '@/shared/utils/helpers';
import type { Ficha } from '@/features/fichas/types';

type SortOption = 'pendientes' | 'nombre' | 'codigo' | 'aprendices';

function programaDescripcion(nombre: string): string {
  const n = (nombre || '').toUpperCase().trim();
  if (n === 'AA') return 'Análisis Administrativo';
  if (n === 'ADSO') return 'Análisis y Desarrollo de Software';
  if (n === 'CGSIG') return 'Gestión y Seguridad de la Información';
  return 'Formación Académica';
}

function getHorarioResumen(ficha: Ficha, formato: '12h' | '24h'): string {
  const horarios = [...(ficha.horarios ?? [])].sort(
    (a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora)
  );
  if (horarios.length === 0) return 'Sin horario asignado';
  return horarios
    .map((h) => `${getShortDayName(h.diaSemana)} ${formatHora(h.hora, formato)}`)
    .join(' · ');
}

export function AsistenciasFichasPage() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { formato } = useFormatoHora();

  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('pendientes');

  // Consultar fichas y clase de hoy
  const { data: fichas, isLoading, error } = useFichas(showArchived);
  const { data: todasActivas } = useFichas(false);
  const { data: todasArchivadas } = useFichas(true);
  const { data: todayClass } = useTodayClass();

  const totalActivas = todasActivas?.length ?? (showArchived ? 0 : fichas?.length ?? 0);
  const totalArchivadas = todasArchivadas?.length ?? (showArchived ? fichas?.length ?? 0 : 0);

  // Atajo de teclado '/' para enfocar el buscador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Métricas consolidadas para la franja de micro-datos
  const { totalFichasActivas, totalImpartidasGlobal, totalPendientesHoyGlobal } = useMemo(() => {
    const lista = todasActivas ?? fichas ?? [];
    let impartidas = 0;
    let pendientesHoy = 0;

    lista.forEach((f) => {
      const total = f.totalClases || 1;
      const rest = f.clasesRestantes ?? total;
      impartidas += Math.max(0, total - rest);

      if (todayClass && todayClass.fichaId === f.id && !todayClass.realizada) {
        pendientesHoy += 1;
      }
    });

    return {
      totalFichasActivas: totalActivas,
      totalImpartidasGlobal: impartidas,
      totalPendientesHoyGlobal: pendientesHoy,
    };
  }, [todasActivas, fichas, totalActivas, todayClass]);

  // Filtrado y ordenamiento de fichas
  const fichasProcesadas = useMemo(() => {
    const lista = (fichas ?? []).filter((ficha) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const horario = getHorarioResumen(ficha, formato).toLowerCase();
      return (
        ficha.nombre.toLowerCase().includes(q) ||
        ficha.codigo.toLowerCase().includes(q) ||
        (ficha.trimestre && ficha.trimestre.toLowerCase().includes(q)) ||
        horario.includes(q)
      );
    });

    return lista.sort((a, b) => {
      const aTieneClaseHoy = todayClass && todayClass.fichaId === a.id && !todayClass.realizada;
      const bTieneClaseHoy = todayClass && todayClass.fichaId === b.id && !todayClass.realizada;

      if (sortBy === 'pendientes') {
        if (aTieneClaseHoy && !bTieneClaseHoy) return -1;
        if (!aTieneClaseHoy && bTieneClaseHoy) return 1;
        return (a.clasesRestantes ?? 0) - (b.clasesRestantes ?? 0);
      }
      if (sortBy === 'nombre') {
        return a.nombre.localeCompare(b.nombre);
      }
      if (sortBy === 'codigo') {
        return a.codigo.localeCompare(b.codigo);
      }
      if (sortBy === 'aprendices') {
        return (b.numeroEstudiantes ?? 0) - (a.numeroEstudiantes ?? 0);
      }
      return 0;
    });
  }, [fichas, query, sortBy, todayClass, formato]);

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
        <p className="text-base font-semibold text-rose-600 dark:text-rose-400">
          Error al cargar las asistencias
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Verifica tu conexión y vuelve a intentar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Cabecera Plana Integrada con Franja de Micro-Datos */}
      <div className="flex flex-col gap-4 border-b border-slate-200/90 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Control de Asistencia
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Selecciona una ficha para registrar asistencia diaria, justificaciones y novedades formativas
          </p>
        </div>

        {/* Lado derecho: Franja modular de micro-datos con mini-badges de alto contraste */}
        <div className="flex flex-wrap items-center rounded-xl border border-slate-300/80 dark:border-white/20 bg-white dark:bg-black p-1 shadow-2xs divide-x divide-slate-200 dark:divide-white/10 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="flex h-5 items-center justify-center rounded-md bg-slate-100 dark:bg-white/10 px-2 font-mono font-bold text-slate-900 dark:text-white text-xs">
              {totalFichasActivas}
            </span>
            <span>Fichas Activas</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="flex h-5 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-500/15 px-2 font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs border border-emerald-200/60 dark:border-emerald-500/20">
              {totalImpartidasGlobal}
            </span>
            <span>Sesiones Impartidas</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span
              className={classNames(
                'flex h-5 items-center justify-center rounded-md px-2 font-mono font-bold text-xs border',
                totalPendientesHoyGlobal > 0
                  ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20'
                  : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20'
              )}
            >
              {totalPendientesHoyGlobal > 0 ? totalPendientesHoyGlobal : 0}
            </span>
            <span>
              {totalPendientesHoyGlobal > 0
                ? `${totalPendientesHoyGlobal === 1 ? 'Pendiente' : 'Pendientes'} Hoy`
                : 'Al día hoy'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Barra de Control Unificada (Toolbar de Filtrado) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        {/* Izquierda: Pestañas sobrias tipo switch con conteo */}
        <nav className="flex space-x-6" aria-label="Filtro de fichas para asistencia">
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className={classNames(
              'flex items-center gap-2 pb-2 text-sm font-semibold transition-all border-b-2',
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
            onClick={() => setShowArchived(true)}
            className={classNames(
              'flex items-center gap-2 pb-2 text-sm font-semibold transition-all border-b-2',
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

        {/* Derecha: Buscador compacto con icono y atajo + Selector de ordenamiento */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ficha, código o jornada..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8.5 pr-8 text-xs text-slate-800 shadow-2xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-white/15 dark:bg-black dark:text-white"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200/90 bg-slate-100/80 px-1.5 font-mono text-[10px] text-slate-400 dark:border-white/10 dark:bg-white/10 dark:text-slate-400">
              /
            </kbd>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs font-medium text-slate-700 shadow-2xs focus:border-emerald-500 focus:outline-none dark:border-white/15 dark:bg-black dark:text-slate-200"
          >
            <option value="pendientes">Ordenar por: Sesiones pendientes</option>
            <option value="nombre">Ordenar por: Nombre</option>
            <option value="codigo">Ordenar por: Código</option>
            <option value="aprendices">Ordenar por: Aprendices</option>
          </select>
        </div>
      </div>

      {/* 3. Cuadrícula de Tarjetas Orientadas al Contexto de Asistencias */}
      <div>
        {fichas?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-white/15 dark:bg-black">
            <svg
              className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              {showArchived ? 'No hay fichas archivadas' : 'No tienes fichas activas actualmente'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {showArchived
                ? 'El historial de fichas culminadas aparecerá aquí.'
                : 'Crea tu primera ficha formativa para comenzar a registrar asistencias.'}
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
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center dark:border-white/15 dark:bg-black">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No se encontraron fichas que coincidan con «{query}».
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {fichasProcesadas.map((ficha: Ficha) => {
              const total = ficha.totalClases || 1;
              const restantes = ficha.clasesRestantes ?? ficha.totalClases;
              const realizadas = Math.max(0, total - restantes);
              const porcentaje = Math.min(100, Math.max(0, Math.round((realizadas / total) * 100)));

              const tieneClaseHoy = todayClass && todayClass.fichaId === ficha.id;
              const claseHoyPendiente = tieneClaseHoy && !todayClass.realizada;
              const horarioTexto = getHorarioResumen(ficha, formato);

              return (
                <div
                  key={ficha.id}
                  onClick={() => navigate(`/fichas/${ficha.id}/asistencias`)}
                  className={classNames(
                    'group relative flex flex-col justify-between rounded-xl border border-slate-200/90 border-l-4 bg-white p-4 shadow-2xs transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-white/15 dark:bg-black cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
                    showArchived
                      ? 'border-l-slate-400'
                      : ficha.finalizada
                      ? 'border-l-emerald-600'
                      : 'border-l-emerald-500'
                  )}
                >
                  <div>
                    {/* Cabecera de la Tarjeta: Código + Nombre (sin truncado) + Trimestre */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300 shrink-0">
                          #{ficha.codigo}
                        </span>
                        {/* El acrónimo nunca se trunca (shrink-0) */}
                        <h3 className="shrink-0 font-bold text-sm text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400 transition-colors">
                          {ficha.nombre}
                        </h3>
                        {/* La descripción secundaria sí aplica truncate si el espacio es reducido */}
                        <span className="text-xs text-slate-400 dark:text-slate-500 truncate min-w-0 hidden sm:inline">
                          · {programaDescripcion(ficha.nombre)}
                        </span>
                      </div>

                      {ficha.trimestre && (
                        <span className="shrink-0 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {ficha.trimestre.startsWith('T') ? ficha.trimestre : `T${ficha.trimestre}`}
                        </span>
                      )}
                    </div>

                    {/* Métricas de Asistencia: Avance de Sesiones */}
                    <div className="mt-3 space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                          <span>
                            <strong className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                              {realizadas} de {total}
                            </strong>{' '}
                            sesiones impartidas
                          </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                            {porcentaje}%
                          </span>
                        </div>
                        {/* Barra de progreso lineal delgada */}
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>

                      {/* Estado Operativo de la Sesión */}
                      <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 text-xs dark:border-white/5 dark:bg-zinc-950 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg
                            className="h-3.5 w-3.5 text-slate-400 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="truncate text-slate-600 dark:text-slate-300">
                            {tieneClaseHoy ? (
                              <span>
                                Hoy a las{' '}
                                <strong className="text-slate-800 dark:text-white font-mono">
                                  {formatHora(todayClass.hora, formato)}
                                </strong>{' '}
                                ({todayClass.modalidad})
                              </span>
                            ) : (
                              <span>{horarioTexto}</span>
                            )}
                          </span>
                        </div>

                        {tieneClaseHoy ? (
                          claseHoyPendiente ? (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Pendiente
                            </span>
                          ) : (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Registrada
                            </span>
                          )
                        ) : (
                          <span className="shrink-0 rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 border border-slate-200/80 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                            {restantes} rest.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pie de Tarjeta con Aprendices y Botón de Acción Orientado a Asistencia */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {ficha.numeroEstudiantes ?? 0} aprendices
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (claseHoyPendiente && todayClass) {
                          navigate(`/clases/${todayClass.id}/asistencias`);
                        } else {
                          navigate(`/fichas/${ficha.id}/asistencias`);
                        }
                      }}
                      className={classNames(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
                        claseHoyPendiente
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-[#0B192C] text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500'
                      )}
                    >
                      <span>
                        {showArchived
                          ? 'Consultar'
                          : claseHoyPendiente
                          ? 'Tomar Asistencia'
                          : 'Ver Asistencias'}
                      </span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
