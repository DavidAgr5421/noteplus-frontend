import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { formatHora } from '@/shared/utils/helpers';
import type { DashboardFichaResumen } from '../types';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useDashboard();
  const { formato } = useFormatoHora();
  const [bannerVisible, setBannerVisible] = useState(true);

  // Estado para el mini calendario interactivo
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);

  const hoy = useMemo(() => new Date(), []);

  const { fechaMesAno, diasMes } = useMemo(() => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + calendarMonthOffset, 1);
    const ano = fecha.getFullYear();
    const mes = fecha.getMonth();

    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const primerDiaSemana = (new Date(ano, mes, 1).getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(ano, mes, 0).getDate();

    const celdas: { dia: number; esMesActual: boolean; esHoy: boolean }[] = [];

    // Días del mes anterior para rellenar la primera semana
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      celdas.push({
        dia: totalDiasMesAnterior - i,
        esMesActual: false,
        esHoy: false,
      });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDiasMes; d++) {
      const esHoy =
        calendarMonthOffset === 0 &&
        d === hoy.getDate() &&
        mes === hoy.getMonth() &&
        ano === hoy.getFullYear();

      celdas.push({
        dia: d,
        esMesActual: true,
        esHoy,
      });
    }

    // Días del mes siguiente para completar cuadrícula de 35 o 42 celdas
    const resto = 7 - (celdas.length % 7);
    if (resto < 7) {
      for (let d = 1; d <= resto; d++) {
        celdas.push({
          dia: d,
          esMesActual: false,
          esHoy: false,
        });
      }
    }

    return {
      fechaMesAno: `${nombresMeses[mes]} ${ano}`,
      diasMes: celdas,
    };
  }, [hoy, calendarMonthOffset]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-base font-semibold text-rose-600 dark:text-rose-400">No se pudo cargar el dashboard</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verifica tu conexión con el servidor.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { instructorNombre, fechaActual, kpis, clasesHoy, alertasDesercion, fichas } = data;

  const formatearHoraClase = (horaStr: string | null) => {
    if (!horaStr) return '18:00';
    const partes = horaStr.split('-');
    if (partes.length === 2) {
      return formatHora(partes[0].trim(), formato);
    }
    return formatHora(horaStr, formato);
  };

  const hayRiesgoDesercion = kpis.estudiantesEnRiesgo > 0;
  const proximaClase = clasesHoy.find((c) => !c.realizada) || clasesHoy[0];

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Encabezado institucional */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Hola, {instructorNombre}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Instructor Activo
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{fechaActual} · Panel de Control Académico NotePlus</span>
          </div>
        </div>

        {/* Acciones principales del encabezado estandarizadas */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/fichas/nueva')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B192C] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/40 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <span className="text-emerald-400 font-bold">+</span>
            <span>Nueva Ficha</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/calendario')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B192C] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/40 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <svg className="h-4 w-4 text-emerald-400 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Ver Calendario</span>
          </button>
        </div>
      </div>

      {/* 2. Barra Superior de Métricas (Superficie gris estructurada `#F1F5F9` / slate-100 con números en deep navy) */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-100/70 p-5 shadow-xs dark:border-white/15 dark:bg-black">
        <div className="grid grid-cols-2 divide-y divide-slate-200/90 sm:grid-cols-4 sm:divide-y-0 sm:divide-x dark:divide-white/10">
          {/* Fichas Activas */}
          <div className="py-2 pr-4 sm:py-0 sm:pr-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fichas Activas
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white">
                {kpis.totalFichasActivas}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">· En curso</span>
            </div>
          </div>

          {/* Total Aprendices */}
          <div className="py-2 px-0 sm:py-0 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Aprendices
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white">
                {kpis.totalEstudiantes}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">· En formación</span>
            </div>
          </div>

          {/* Clases Hoy */}
          <div className="py-2 px-0 sm:py-0 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Clases de Hoy
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white">
                {kpis.clasesHoy}
              </span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {kpis.clasesHoyPendientes > 0
                  ? `· ${kpis.clasesHoyPendientes} pendiente`
                  : kpis.clasesHoy > 0
                  ? '· Al día'
                  : '· Sin sesiones'}
              </span>
            </div>
          </div>

          {/* Riesgo Deserción */}
          <div className="py-2 pl-0 sm:py-0 sm:pl-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Riesgo Deserción
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-3xl font-extrabold tracking-tight tabular-nums ${
                  hayRiesgoDesercion ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {kpis.estudiantesEnRiesgo}
              </span>
              <span
                className={`text-xs font-medium ${
                  hayRiesgoDesercion ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {hayRiesgoDesercion ? '· Críticos (>3 fallas)' : '· Al día'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Banner Informativo */}
      {bannerVisible && (
        <>
          {!hayRiesgoDesercion ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200/90 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-900 shadow-2xs dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <div className="flex items-center gap-2.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>
                  <strong>Sin alertas críticas:</strong> 0 aprendices en riesgo acumulado de deserción y todas las actividades al día para los próximos 7 días.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBannerVisible(false)}
                className="text-emerald-700 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-200"
                aria-label="Cerrar aviso"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-rose-200/90 bg-rose-50 px-4 py-2.5 text-xs text-rose-900 shadow-2xs dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              <div className="flex items-center gap-2.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                  !
                </span>
                <span>
                  <strong>Atención requerida:</strong> {alertasDesercion.length} aprendiz(ces) superan las 3 fallas acumuladas.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/asistencias" className="font-semibold underline hover:text-rose-950 dark:hover:text-white">
                  Ver detalle →
                </Link>
                <button
                  type="button"
                  onClick={() => setBannerVisible(false)}
                  className="text-rose-700 hover:text-rose-950 dark:text-rose-400 dark:hover:text-rose-200"
                  aria-label="Cerrar aviso"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. Estructura Asimétrica 70/30 con Fuerte Identidad Institucional */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* COLUMNA PRINCIPAL (lg:col-span-8 - 70%) */}
        <div className="space-y-6 lg:col-span-8">

          {/* TARJETA HERO: CLASES DE HOY (Fondo Azul Oscuro Institucional Dark Navy) */}
          <div className="relative overflow-hidden rounded-2xl bg-[#0B192C] p-5 text-white shadow-lg border border-slate-800/90 sm:p-6 dark:bg-[#071220]">
            {/* Resplandor sutil de marca en la esquina */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />

            {/* Encabezado de la Tarjeta Hero */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  Clases de Hoy
                </h2>
                <span className="text-xs text-slate-300 font-normal">
                  · {clasesHoy.length} sesión{clasesHoy.length === 1 ? '' : 'es'} programada{clasesHoy.length === 1 ? '' : 's'}
                </span>
              </div>
              <Link
                to="/calendario"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-white/20 hover:text-white"
              >
                <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Ver Calendario</span>
                <span aria-hidden="true">›</span>
              </Link>
            </div>

            {/* Contenido Clases de Hoy */}
            <div className="relative z-10 mt-4">
              {clasesHoy.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 py-6 text-center">
                  <p className="text-xs font-medium text-slate-300">
                    No tienes clases programadas para hoy · Día libre de sesiones académicas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clasesHoy.map((clase) => (
                    <div
                      key={clase.id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs transition-all hover:bg-white/[0.08] sm:flex-row sm:items-center"
                    >
                      {/* Bloque Izquierdo: Insignia de Hora en fondo semitransparente + Datos */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Caja de hora: fondo semitransparente oscuro con borde sutil */}
                        <div className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white shadow-inner">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                            Hora
                          </span>
                          <span className="font-mono text-sm font-bold text-white">
                            {formatearHoraClase(clase.hora)}
                          </span>
                        </div>

                        {/* Textos informativos de la sesión */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-white truncate">
                              {clase.fichaNombre}
                            </span>
                            <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-xs font-medium text-slate-200">
                              #{clase.fichaCodigo}
                            </span>
                            <span className="rounded-md border border-white/20 bg-white/5 px-2 py-0.5 text-xs font-medium capitalize text-slate-200">
                              {clase.modalidad.toLowerCase()}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-300">
                            <span>Aula B-204 · Sede Central</span>
                            <span>|</span>
                            <span className="font-semibold text-emerald-300">
                              {clase.asistenciasRegistradas} de {clase.totalEstudiantes} registrados
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botón CTA Verde Esmeralda Vibrante (Foco visual principal) */}
                      <div className="shrink-0">
                        {clase.realizada ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/clases/${clase.id}/asistencias`)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                          >
                            <svg className="h-3.5 w-3.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Ver Asistencia</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/clases/${clase.id}/asistencias`)}
                            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition-all hover:bg-emerald-400 hover:shadow-emerald-500/25 active:scale-98"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Tomar Asistencia</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TARJETA B: MIS FICHAS ACTIVAS (Borde izquierdo grueso border-l-4 y fondos slate-50 estructurados) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 dark:border-white/15 dark:bg-black">
            {/* Encabezado */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Mis Fichas Activas
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {fichas.length} programas en formación académica activa
                </p>
              </div>
              <Link
                to="/fichas"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                Ver todas ({fichas.length}) ›
              </Link>
            </div>

            {/* Lista de Filas de Fichas con Borde Lateral Izquierdo Grueso (border-l-4) */}
            <div className="mt-4 space-y-3">
              {fichas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center dark:border-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No tienes fichas activas registradas.</p>
                </div>
              ) : (
                fichas.map((f: DashboardFichaResumen) => (
                  <div
                    key={f.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200/90 border-l-4 border-l-emerald-500 bg-slate-50/90 p-4 shadow-2xs transition-all hover:bg-slate-100/90 hover:border-slate-300 sm:flex-row sm:items-center dark:border-white/15 dark:border-l-emerald-400 dark:bg-black dark:hover:bg-zinc-950"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Fila superior: Punto + Nombre + Código + Subtítulo de programa */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {f.nombre}
                        </span>
                        <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                          #{f.codigo}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          · {f.nombre === 'AA' ? 'Análisis Administrativo' : f.nombre === 'ADSO' ? 'Análisis y Desarrollo de Software' : 'Gestión y Seguridad de la Información'}
                        </span>
                      </div>

                      {/* Fila inferior: Horario, Estudiantes, Trimestre, Clases restantes */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{f.horarioResumen || 'Sin horario'}</span>
                        </span>

                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span>{f.totalEstudiantes} estudiantes</span>
                        </span>

                        <span>Trimestre {f.trimestre ? (f.trimestre.toString().includes('T') ? f.trimestre.toString().replace('T', '') : f.trimestre) : '4 (2026)'}</span>

                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          · {f.clasesRestantes ?? 8} clases rest.
                        </span>
                      </div>
                    </div>

                    {/* Botón Gestionar con Borde Definido y Hover Invertido */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/fichas/${f.id}`)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-800 hover:bg-slate-900 hover:text-white dark:border-white/15 dark:bg-black dark:text-slate-200 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-900"
                      >
                        Gestionar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* COLUMNA LATERAL DERECHA (lg:col-span-4 - 30% - Calendario Estructurado y Atajos Rápidos) */}
        <div className="space-y-6 lg:col-span-4">

          {/* Widget 1: Calendario con Marco Estructurado */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-white/15 dark:bg-black">
            {/* Encabezado del Mes con Marco Gris Estructurado */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-100/80 px-3.5 py-2.5 dark:border-white/10 dark:bg-zinc-950">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                {fechaMesAno}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCalendarMonthOffset((v) => v - 1)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  title="Mes anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonthOffset((v) => v + 1)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  title="Mes siguiente"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Cabecera días de la semana */}
            <div className="mt-3.5 grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              <span>L</span>
              <span>M</span>
              <span>M</span>
              <span>J</span>
              <span>V</span>
              <span>S</span>
              <span>D</span>
            </div>

            {/* Días del mes */}
            <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-xs">
              {diasMes.map((item, idx) => (
                <div key={idx} className="flex items-center justify-center py-1">
                  {item.esHoy ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white shadow-xs">
                      {item.dia}
                    </span>
                  ) : (
                    <span
                      className={`h-7 w-7 flex items-center justify-center rounded-lg ${
                        item.esMesActual
                          ? 'text-slate-800 dark:text-slate-200 font-medium'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      {item.dia}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Próxima sesión: Contenedor con fondo verde institucional suave */}
            <div className="mt-4 rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>
                  Próxima sesión: {proximaClase ? proximaClase.fichaNombre : 'Sin sesiones'}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                {proximaClase
                  ? `Hoy a las ${formatearHoraClase(proximaClase.hora)} (${proximaClase.modalidad})`
                  : 'No hay clases pendientes para hoy'}
              </p>
            </div>
          </div>

          {/* Widget 2: ATAJOS RÁPIDOS (Bloques interactivos con fondo neutro `#F8FAFC` y hover esmeralda) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-white/15 dark:bg-black">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Atajos Rápidos
            </h3>

            <div className="mt-3.5 space-y-2">
              <button
                type="button"
                onClick={() => navigate('/calendario')}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50 p-3 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-white/10 dark:bg-black dark:hover:border-emerald-500/30 dark:hover:bg-zinc-950 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/70 text-slate-700 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:bg-white/10 dark:text-slate-300 dark:group-hover:bg-emerald-500/20 dark:group-hover:text-emerald-300">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold text-slate-800 transition-colors group-hover:text-slate-950 dark:text-slate-200 dark:group-hover:text-white">
                    Agenda de Sesiones
                  </span>
                </div>
                <span className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600">
                  ›
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/asistencias')}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50 p-3 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-white/10 dark:bg-black dark:hover:border-emerald-500/30 dark:hover:bg-zinc-950 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/70 text-slate-700 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:bg-white/10 dark:text-slate-300 dark:group-hover:bg-emerald-500/20 dark:group-hover:text-emerald-300">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold text-slate-800 transition-colors group-hover:text-slate-950 dark:text-slate-200 dark:group-hover:text-white">
                    Historial de Inasistencias
                  </span>
                </div>
                <span className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600">
                  ›
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/asistencias')}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50 p-3 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-white/10 dark:bg-black dark:hover:border-emerald-500/30 dark:hover:bg-zinc-950 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/70 text-slate-700 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:bg-white/10 dark:text-slate-300 dark:group-hover:bg-emerald-500/20 dark:group-hover:text-emerald-300">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold text-slate-800 transition-colors group-hover:text-slate-950 dark:text-slate-200 dark:group-hover:text-white">
                    Exportar Asistencias (Excel)
                  </span>
                </div>
                <span className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600">
                  ›
                </span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
