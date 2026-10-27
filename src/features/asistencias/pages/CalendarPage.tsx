import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { useCalendar, useTodayClass } from '../hooks/useAsistencias';
import { useFicha } from '@/features/fichas/hooks/useFichas';
import { ClaseDetailModal } from '../components/AsistenciaComponents';
import {
  formatDate,
  claseHorarioLabel,
  isToday,
  formatDateForInput,
  formatHora,
  classNames,
} from '@/shared/utils/helpers';
import type { Clase } from '../types';

interface CalendarPageProps {
  /** Si se indica, las tarjetas de esta ficha se ven normales y las demás opacas. */
  highlightFichaId?: string;
}

type ViewMode = 'mes' | 'semana' | 'dia';

function programaDescripcion(nombre: string): string {
  const n = (nombre || '').toUpperCase().trim();
  if (n === 'AA') return 'Análisis Administrativo';
  if (n === 'ADSO') return 'Análisis y Desarrollo de Software';
  if (n === 'CGSIG') return 'Gestión y Seguridad de la Información';
  return 'Formación Académica';
}

export function CalendarPage({ highlightFichaId }: CalendarPageProps = {}) {
  const navigate = useNavigate();
  const { formato } = useFormatoHora();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('mes');
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateForInput(new Date()));
  const [selectedClaseId, setSelectedClaseId] = useState<string | null>(null);
  const [modalClase, setModalClase] = useState<Clase | null>(null);

  // Rango de fechas para el mes visible con días de padding
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const mondayFirstDay = (firstDayOfMonth + 6) % 7; // Lunes = 0

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const trailingDays = (7 - ((mondayFirstDay + daysInCurrentMonth) % 7)) % 7;

  const gridStartDate = new Date(year, month, 1 - mondayFirstDay);
  const gridEndDate = new Date(year, month, daysInCurrentMonth + trailingDays);

  const from = formatDateForInput(gridStartDate);
  const to = formatDateForInput(gridEndDate);

  const { data: clases } = useCalendar(from, to);
  const { data: todayClass } = useTodayClass();
  const { data: highlightFicha } = useFicha(highlightFichaId || '');

  const isDimmed = (clase: Clase) => !!highlightFichaId && clase.fichaId !== highlightFichaId;

  // Agrupar clases por fecha YYYY-MM-DD
  const clasesByDate = useMemo(() => {
    const map = new Map<string, Clase[]>();
    clases?.forEach((clase) => {
      const key = clase.fecha.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(clase);
    });
    return map;
  }, [clases]);

  const todayStr = formatDateForInput(new Date());

  const todayClases = useMemo(() => {
    const list = clasesByDate.get(todayStr) || [];
    if (list.length > 0) return list;
    return todayClass ? [todayClass] : [];
  }, [clasesByDate, todayStr, todayClass]);

  // Sesiones del día seleccionado
  const selectedDateClases = useMemo(() => {
    return clasesByDate.get(selectedDate) || [];
  }, [clasesByDate, selectedDate]);

  // Clase activa en el panel lateral
  const activeClase = useMemo(() => {
    if (selectedClaseId) {
      const found = clases?.find((c) => c.id === selectedClaseId);
      if (found) return found;
    }
    if (selectedDateClases.length > 0) {
      return selectedDateClases[0];
    }
    if (selectedDate === todayStr && todayClases.length > 0) {
      return todayClases[0];
    }
    return null;
  }, [selectedClaseId, clases, selectedDateClases, selectedDate, todayStr, todayClases]);

  // Días de la cuadrícula mensual
  const calendarDays = useMemo(() => {
    const totalCells = mondayFirstDay + daysInCurrentMonth + trailingDays;
    return Array.from({ length: totalCells }, (_, i) => {
      const dayOffset = i - mondayFirstDay + 1;
      return new Date(year, month, dayOffset);
    });
  }, [year, month, mondayFirstDay, daysInCurrentMonth, trailingDays]);

  // Días de la semana seleccionada (Lunes a Domingo)
  const weekDays = useMemo(() => {
    const sel = new Date(selectedDate + 'T00:00:00');
    const selDayOfWeek = (sel.getDay() + 6) % 7;
    const mon = new Date(sel);
    mon.setDate(sel.getDate() - selDayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  // Métricas del mes visible
  const totalClasesMes = useMemo(() => {
    return (clases ?? []).filter((c) => {
      const parts = c.fecha.split('-');
      return Number(parts[0]) === year && Number(parts[1]) === month + 1;
    }).length;
  }, [clases, year, month]);

  const realizadasMes = useMemo(() => {
    return (clases ?? []).filter((c) => {
      const parts = c.fecha.split('-');
      return Number(parts[0]) === year && Number(parts[1]) === month + 1 && c.realizada;
    }).length;
  }, [clases, year, month]);

  const pendientesMes = Math.max(0, totalClasesMes - realizadasMes);

  // Navegación temporal
  const handlePrev = () => {
    if (viewMode === 'mes') {
      setCurrentMonth(new Date(year, month - 1, 1));
    } else if (viewMode === 'semana') {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      setSelectedDate(formatDateForInput(d));
      if (d.getMonth() !== month) {
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    } else {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      setSelectedDate(formatDateForInput(d));
      if (d.getMonth() !== month) {
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  };

  const handleNext = () => {
    if (viewMode === 'mes') {
      setCurrentMonth(new Date(year, month + 1, 1));
    } else if (viewMode === 'semana') {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() + 7);
      setSelectedDate(formatDateForInput(d));
      if (d.getMonth() !== month) {
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    } else {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      setSelectedDate(formatDateForInput(d));
      if (d.getMonth() !== month) {
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  };

  const handleHoy = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(formatDateForInput(now));
    setSelectedClaseId(null);
  };

  const handleMarcarAsistencias = (clase: Clase) => {
    setModalClase(null);
    navigate(`/clases/${clase.id}/asistencias`);
  };

  const rawMonthName = currentMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1).replace(' de ', ' ');

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Barra Superior y Controles de Navegación del Calendario */}
      <div className="flex flex-col gap-4 border-b border-slate-200/90 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {highlightFichaId && (
            <Link
              to={`/fichas/${highlightFichaId}`}
              className="group mb-2.5 inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-all hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              <svg className="h-4 w-4 text-slate-500 transition-transform group-hover:-translate-x-0.5 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver a la ficha</span>
            </Link>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {highlightFicha ? `Asistencias — ${highlightFicha.nombre}` : 'Calendario de Clases'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Consulta y gestiona las clases formativas programadas por fecha
          </p>
        </div>

        {/* Controles temporales agrupados a la derecha */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Selector de vista sobrio estilo toggle button segmentado */}
          <div className="inline-flex rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100/90 dark:bg-black p-1 shadow-2xs">
            {(['mes', 'semana', 'dia'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={classNames(
                  'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
                  viewMode === mode
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/90 dark:border-white/10 dark:bg-zinc-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                {mode === 'mes' ? 'Mes' : mode === 'semana' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>

          {/* Botón neutro Hoy */}
          <button
            type="button"
            onClick={handleHoy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-900 shadow-2xs hover:border-slate-400 transition-all"
          >
            Hoy
          </button>

          {/* Flechas de navegación con símbolos SVG */}
          <div className="inline-flex rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black shadow-2xs divide-x divide-slate-200 dark:divide-white/15 overflow-hidden">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-900 focus:outline-none"
              title="Anterior"
              aria-label="Anterior"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-900 focus:outline-none"
              title="Siguiente"
              aria-label="Siguiente"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Layout Principal Asimétrico (70% Calendario / 30% Panel Lateral) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

        {/* COLUMNA IZQUIERDA (~70% - lg:col-span-8): Cuadrícula del Calendario */}
        <div className="min-w-0 lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-white/15 dark:bg-black">

            {/* Cabecera del Mes: Barra de título marcada con fondo azul oscuro (#0B192C) */}
            <div className="flex items-center justify-between bg-[#0B192C] px-5 py-3.5 text-white">
              <div className="flex items-center gap-2.5">
                <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-base font-medium tracking-wide text-white">
                  {viewMode === 'mes'
                    ? monthName
                    : viewMode === 'semana'
                    ? `Semana: ${formatDate(weekDays[0], 'short')} - ${formatDate(weekDays[6], 'short')}`
                    : formatDate(selectedDate, 'long')}
                </span>
              </div>

              {/* Flechas de cambio de mes integradas con estado hover suave */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none"
                  title="Periodo anterior"
                  aria-label="Periodo anterior"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none"
                  title="Periodo siguiente"
                  aria-label="Periodo siguiente"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* VISTA 1: MENSUAL (Grilla Continua con Bordes Compartidos) */}
            {viewMode === 'mes' && (
              <div>
                {/* Encabezado de días de la semana (LUN, MAR, MIÉ...) */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-zinc-950">
                  {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((day) => (
                    <div
                      key={day}
                      className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Cuadrícula continua de celdas con bordes compartidos */}
                <div className="grid grid-cols-7 border-t border-l border-slate-200 dark:border-white/10 bg-white dark:bg-black">
                  {calendarDays.map((date, index) => {
                    const dateStr = formatDateForInput(date);
                    const dayClases = clasesByDate.get(dateStr) || [];
                    const today = isToday(dateStr);
                    const isSelected = selectedDate === dateStr;
                    const isCurrentMonth = date.getMonth() === month;

                    return (
                      <div
                        key={index}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          if (dayClases.length > 0) {
                            setSelectedClaseId(dayClases[0].id);
                          } else {
                            setSelectedClaseId(null);
                          }
                        }}
                        className={classNames(
                          'min-h-[105px] sm:min-h-[115px] p-2 border-r border-b border-slate-200 dark:border-white/10 transition-colors flex flex-col justify-between cursor-pointer select-none',
                          !isCurrentMonth
                            ? 'bg-slate-50/40 text-slate-300 dark:bg-zinc-950/40 dark:text-zinc-600'
                            : isSelected
                            ? 'bg-slate-50/90 dark:bg-zinc-900/60 ring-2 ring-inset ring-[#0B192C]/20 dark:ring-emerald-500/40'
                            : today
                            ? 'bg-emerald-50/40 dark:bg-emerald-500/10'
                            : 'bg-white hover:bg-slate-50/80 dark:bg-black dark:hover:bg-zinc-950'
                        )}
                      >
                        {/* Esquina superior derecha: Número del día o Indicador circular verde de hoy */}
                        <div className="flex items-center justify-between">
                          <span />
                          {today ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 font-mono text-[11px] font-bold text-white shadow-xs">
                              {date.getDate()}
                            </span>
                          ) : (
                            <span
                              className={classNames(
                                'font-mono text-xs',
                                isCurrentMonth
                                  ? 'text-slate-600 dark:text-slate-400 font-medium'
                                  : 'text-slate-300 dark:text-zinc-600'
                              )}
                            >
                              {date.getDate()}
                            </span>
                          )}
                        </div>

                        {/* Bloques de sesiones dentro del día (mini-píldoras compactas) */}
                        <div className="mt-1 space-y-1">
                          {dayClases.slice(0, 2).map((clase) => {
                            const isClassSelected = activeClase?.id === clase.id;
                            return (
                              <button
                                key={clase.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(dateStr);
                                  setSelectedClaseId(clase.id);
                                }}
                                className={classNames(
                                  'w-full text-left rounded-md border-l-[3px] p-1.5 transition-all text-xs shadow-2xs block min-w-0',
                                  isDimmed(clase) ? 'opacity-40 saturate-50' : '',
                                  isClassSelected
                                    ? 'border-l-emerald-600 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/70 dark:text-emerald-100 dark:border-l-emerald-400'
                                    : 'border-l-emerald-500 bg-slate-100 hover:bg-slate-200/90 text-slate-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-slate-200'
                                )}
                                title={`${clase.ficha?.nombre || 'Ficha'} #${clase.ficha?.codigo || ''} · ${claseHorarioLabel(clase, formato)}`}
                              >
                                <div className="font-bold text-[11px] truncate leading-tight">
                                  {clase.ficha?.nombre || 'Ficha'}
                                </div>
                                <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums leading-tight mt-0.5">
                                  {formatHora(clase.hora, formato)}
                                </div>
                              </button>
                            );
                          })}

                          {/* Indicador de desbordamiento limpio */}
                          {dayClases.length > 2 && (
                            <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 pl-1 pt-0.5">
                              +{dayClases.length - 2} más
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VISTA 2: SEMANAL */}
            {viewMode === 'semana' && (
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-zinc-950 text-center">
                  {weekDays.map((d) => {
                    const ds = formatDateForInput(d);
                    const isSel = selectedDate === ds;
                    const isTod = isToday(ds);
                    return (
                      <button
                        key={ds}
                        type="button"
                        onClick={() => setSelectedDate(ds)}
                        className={classNames(
                          'p-3 transition-colors text-center focus:outline-none',
                          isSel ? 'bg-slate-200/70 dark:bg-zinc-800' : 'hover:bg-slate-200/40 dark:hover:bg-zinc-900'
                        )}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {d.toLocaleDateString('es-CO', { weekday: 'short' })}
                        </p>
                        <p className={classNames(
                          'mt-1 font-mono text-base font-bold',
                          isTod ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                        )}>
                          {d.getDate()}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Clases de la semana seleccionada
                  </h3>
                  {weekDays.flatMap((d) => {
                    const ds = formatDateForInput(d);
                    const dClases = clasesByDate.get(ds) || [];
                    return dClases.map((c) => ({ ...c, displayDate: d }));
                  }).length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      No hay clases programadas para esta semana.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {weekDays.flatMap((d) => {
                        const ds = formatDateForInput(d);
                        const dClases = clasesByDate.get(ds) || [];
                        return dClases.map((c) => ({ ...c, displayDate: d, ds }));
                      }).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedDate(c.ds);
                            setSelectedClaseId(c.id);
                          }}
                          className={classNames(
                            'p-3.5 rounded-xl border border-l-4 cursor-pointer transition-all',
                            activeClase?.id === c.id
                              ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30'
                              : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-zinc-950 hover:bg-slate-100',
                            'border-l-emerald-500'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {c.ficha?.nombre} · #{c.ficha?.codigo}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {formatDate(c.displayDate, 'short')}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {claseHorarioLabel(c, formato)} ({c.modalidad})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VISTA 3: DÍA */}
            {viewMode === 'dia' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-white/10">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                      {formatDate(selectedDate, 'long')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedDateClases.length} {selectedDateClases.length === 1 ? 'clase programada' : 'clases programadas'}
                    </p>
                  </div>
                </div>

                {selectedDateClases.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                    No hay clases programadas para este día.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateClases.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedClaseId(c.id)}
                        className={classNames(
                          'p-4 rounded-xl border border-l-4 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                          activeClase?.id === c.id
                            ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30'
                            : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-zinc-950 hover:bg-slate-100',
                          'border-l-emerald-500'
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {c.ficha?.nombre} · #{c.ficha?.codigo}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              · {programaDescripcion(c.ficha?.nombre || '')}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            Horario: {claseHorarioLabel(c, formato)} ({c.modalidad})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarcarAsistencias(c);
                          }}
                          className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors self-start sm:self-auto"
                        >
                          {c.realizada ? 'Modificar' : 'Tomar Asistencia'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* COLUMNA DERECHA (~30% - lg:col-span-4): CENTRO DE SESIÓN DIARIA */}
        <aside className="min-w-0 lg:col-span-4 lg:sticky lg:top-20" aria-label="Centro de sesión diaria">
          {/* Contenedor monolítico estructurado con fondo gris neutro sólido (#F1F5F9 / slate-100) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100/80 shadow-xs dark:border-white/15 dark:bg-black">

            {/* Cabecera de sección marcada con fondo azul oscuro (#0B192C) */}
            <div className="flex items-center justify-between bg-[#0B192C] p-4 text-white">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Sesión Seleccionada
                </span>
              </div>
              {/* Badge discreto con la fecha activa */}
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-slate-200">
                {formatDate(selectedDate, 'short')}
              </span>
            </div>

            {/* Detalle de la clase activa */}
            <div className="p-5 space-y-4">
              {/* Selector de pestañas si hay múltiples clases en el mismo día */}
              {selectedDateClases.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {selectedDateClases.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClaseId(c.id)}
                      className={classNames(
                        'rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors',
                        activeClase?.id === c.id
                          ? 'bg-[#0B192C] text-white dark:bg-emerald-600'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:border-white/10 dark:text-slate-300'
                      )}
                    >
                      {c.ficha?.nombre || 'Ficha'} · {formatHora(c.hora, formato)}
                    </button>
                  ))}
                </div>
              )}

              {activeClase ? (
                <>
                  {/* Nombre del programa completo + sigla */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-white dark:bg-zinc-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                        #{activeClase.ficha?.codigo}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Trimestre {activeClase.ficha?.trimestre ? activeClase.ficha.trimestre.replace(/^T/, '') : '4'}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {activeClase.ficha?.nombre} · {programaDescripcion(activeClase.ficha?.nombre || '')}
                    </h3>
                  </div>

                  {/* Metadatos en lista limpia con separadores sutiles */}
                  <div className="space-y-2.5 divide-y divide-slate-200/80 dark:divide-white/10 text-xs">
                    {/* Horario */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Horario:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-right">
                        {claseHorarioLabel(activeClase, formato)} ({activeClase.modalidad === 'PRESENCIAL' ? 'Presencial · Aula B-204' : 'Virtual · Teams'})
                      </span>
                    </div>

                    {/* Estado */}
                    <div className="flex items-center justify-between gap-2 pt-2.5">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Estado:</span>
                      {activeClase.realizada ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Registrada · Al día
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          1 pendiente de registro
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botón primario de acción en verde esmeralda sólido */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleMarcarAsistencias(activeClase)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 text-xs transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <span>{activeClase.realizada ? 'Modificar Asistencia' : 'Tomar Asistencia'}</span>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8 px-2 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200/60 dark:bg-zinc-900 text-slate-500 dark:text-slate-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="mt-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Sin sesiones programadas
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Selecciona un día con clases en el calendario para gestionar su asistencia.
                  </p>
                </div>
              )}
            </div>

            {/* Bloque inferior: Métricas del Mes (separado por borde interno border-t border-slate-200) */}
            <div className="border-t border-slate-200 dark:border-white/10 p-4 bg-white/60 dark:bg-black">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Resumen del Mes
              </h4>
              <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10 text-center">
                <div className="pr-2">
                  <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {totalClasesMes}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Programadas
                  </p>
                </div>
                <div className="px-2">
                  <p className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {realizadasMes}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Realizadas
                  </p>
                </div>
                <div className="pl-2">
                  <p className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {pendientesMes}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pendientes
                  </p>
                </div>
              </div>
            </div>

          </div>
        </aside>

      </div>

      {modalClase && (
        <ClaseDetailModal
          isOpen={!!modalClase}
          onClose={() => setModalClase(null)}
          clase={modalClase}
          onMarcarAsistencias={handleMarcarAsistencias}
        />
      )}
    </div>
  );
}
