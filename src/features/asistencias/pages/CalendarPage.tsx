import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle, CardContent, FormatoHoraToggle } from '@/shared/ui';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { useCalendar, useTodayClass } from '../hooks/useAsistencias';
import { useFicha } from '@/features/fichas/hooks/useFichas';
import { ClaseCard, ClaseDetailModal } from '../components/AsistenciaComponents';
import { formatDate, claseHorarioLabel, isToday, formatDateForInput } from '@/shared/utils/helpers';
import type { Clase } from '../types';

interface CalendarPageProps {
  /** Si se indica, las tarjetas de esta ficha se ven normales y las demás opacas. */
  highlightFichaId?: string;
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

export function CalendarPage({ highlightFichaId }: CalendarPageProps = {}) {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedClase, setSelectedClase] = useState<Clase | null>(null);

  const from = formatDateForInput(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
  const to = formatDateForInput(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

  const { data: clases } = useCalendar(from, to);
  const { data: todayClass } = useTodayClass();
  const { data: highlightFicha } = useFicha(highlightFichaId || '');
  const { formato } = useFormatoHora();

  const isDimmed = (clase: Clase) => !!highlightFichaId && clase.fichaId !== highlightFichaId;

  const handleOpenDetalle = (clase: Clase) => {
    setSelectedClase(clase);
  };

  const handleMarcarAsistencias = (clase: Clase) => {
    setSelectedClase(null);
    navigate(`/clases/${clase.id}/asistencias`);
  };

  const monthName = currentMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  const daysInMonth = Array.from(
    { length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() },
    (_, i) => i + 1
  );
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const calendarDays = [
    ...Array(firstDayOfMonth).fill(null),
    ...daysInMonth.map((day) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)),
  ];

  const clasesByDate = useMemo(() => {
    const map = new Map<string, Clase[]>();
    clases?.forEach((clase) => {
      const key = clase.fecha;
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

  // Metric summary for current month
  const totalClasesMes = clases?.length ?? 0;
  const realizadasMes = useMemo(() => (clases ?? []).filter((c) => c.realizada).length, [clases]);
  const pendientesMes = totalClasesMes - realizadasMes;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          {highlightFichaId && (
            <Link to={`/fichas/${highlightFichaId}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              ← Volver a la ficha
            </Link>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {highlightFicha ? `Asistencias — ${highlightFicha.nombre}` : 'Calendario de Clases'}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Consulta y gestiona las clases programadas por fecha
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FormatoHoraToggle />
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
        </div>
      </div>

      {/* Main Grid: 80% Calendar on Left - 20% Today's classes on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Section (roughly 80% / 9 cols on desktop) */}
        <div className="lg:col-span-8 xl:col-span-9 min-w-0">
          <Card variant="outlined" className="bg-white/95 dark:bg-slate-900/95 shadow-xs">
            <CardHeader className="border-b border-slate-100/90 dark:border-white/10 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold capitalize text-slate-900 dark:text-white">
                  {monthName}
                </CardTitle>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Mes anterior"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Mes siguiente"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((date, index) => {
                  const dateStr = date ? formatDateForInput(date) : '';
                  const dayClases = date ? clasesByDate.get(dateStr) || [] : [];
                  const today = isToday(dateStr);
                  return (
                    <div
                      key={index}
                      className={`min-h-[105px] p-2 border rounded-xl transition-all ${
                        today
                          ? 'bg-emerald-50/70 dark:bg-emerald-500/15 border-emerald-400/80 dark:border-emerald-400/40 shadow-xs'
                          : 'bg-white/80 dark:bg-white/5 border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/25'
                      }`}
                    >
                      {date && (
                        <>
                          <div className={`text-xs font-bold ${today ? 'text-emerald-800 dark:text-emerald-300 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                            {date.getDate()}
                          </div>
                          <div className="mt-1 space-y-1">
                            {dayClases.map((clase) => (
                              <ClaseCard
                                key={clase.id}
                                clase={clase}
                                isToday={today}
                                dimmed={isDimmed(clase)}
                                onClick={() => handleOpenDetalle(clase)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Clases de hoy + Información relevante (roughly 20% / 3 cols) */}
        <aside className="lg:col-span-4 xl:col-span-3 min-w-0 space-y-4 lg:sticky lg:top-20" aria-label="Clases de hoy y resumen">
          {/* Header Clases de Hoy */}
          <div className="flex items-center justify-between gap-2 px-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Clases de hoy</h2>
            <span className="shrink-0 rounded-full border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
              {formatDate(todayStr, 'short')}
            </span>
          </div>

          {/* Cards for each class today */}
          {todayClases.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-5 text-center shadow-xs">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500">
                <CalendarIcon />
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">Sin clases hoy</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                No tienes ninguna clase programada para el día de hoy.
              </p>
            </div>
          ) : (
            todayClases.map((tc) => (
              <div
                key={tc.id}
                className={`rounded-2xl border bg-white/95 dark:bg-slate-900/95 p-4 shadow-xs hover:shadow-md transition-all ${
                  isDimmed(tc) ? 'opacity-40 saturate-50' : 'border-slate-200/80 dark:border-white/10'
                }`}
              >
                {/* Top: Nombre de la ficha arriba del todo y su código */}
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate" title={tc.ficha?.nombre}>
                    {tc.ficha?.nombre || 'Ficha sin nombre'}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                      {tc.ficha?.codigo}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        tc.realizada
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-400/20'
                          : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-400/20'
                      }`}
                    >
                      {tc.realizada ? 'Realizada' : 'Pendiente'}
                    </span>
                    <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      {tc.modalidad}
                    </span>
                  </div>
                </div>

                {/* Below: Horario */}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                    <ClockIcon />
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {claseHorarioLabel(tc, formato)}
                  </span>
                </div>

                {/* Below: Botón para tomar asistencia */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
                  <Button
                    variant="navyGreen"
                    size="sm"
                    fullWidth
                    onClick={() => handleMarcarAsistencias(tc)}
                    className="text-xs font-semibold"
                  >
                    {tc.realizada ? 'Modificar asistencia' : 'Tomar asistencia'}
                  </Button>
                </div>
              </div>
            ))
          )}

          {/* Información relevante adicional: Resumen mensual */}
          <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-emerald-400">
                <ChartIcon />
              </span>
              Resumen del mes
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2 border border-slate-100 dark:border-white/10">
                <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white">{totalClasesMes}</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Programadas</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2 border border-slate-100 dark:border-white/10">
                <p className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{realizadasMes}</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Realizadas</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2 border border-slate-100 dark:border-white/10">
                <p className="text-base font-bold tabular-nums text-amber-700 dark:text-amber-300">{pendientesMes}</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Pendientes</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ClaseDetailModal
        isOpen={!!selectedClase}
        onClose={() => setSelectedClase(null)}
        clase={selectedClase}
        onMarcarAsistencias={handleMarcarAsistencias}
      />
    </div>
  );
}