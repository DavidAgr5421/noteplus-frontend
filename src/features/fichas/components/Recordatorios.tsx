import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { calificacionesApi } from '@/features/calificaciones/api/calificacionesApi';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { formatHora, getShortDayName, formatDate } from '@/shared/utils/helpers';
import type { Ficha } from '../types';

function localISODate(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

interface Hoy {
  iso: string;
  diaSemana: number;
  etiqueta: string;
}

function computeHoy(): Hoy {
  const now = new Date();
  return {
    iso: localISODate(now),
    diaSemana: now.getDay(),
    etiqueta: now.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }),
  };
}

interface ClaseRecordatorio {
  key: string;
  titulo: string;
  detalle: string;
  to: string;
}

interface ActividadRecordatorio {
  key: string;
  titulo: string;
  detalle: string;
  fecha: string;
  esHoy: boolean;
  porcentaje?: number;
  to: string;
}

function PanelCard({
  titulo,
  icon,
  badge,
  children,
}: {
  titulo: string;
  icon: ReactNode;
  badge?: number | string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-4 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-white/10">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-emerald-400">
          {icon}
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">{titulo}</h3>
        {badge !== undefined && (
          <span className="ml-auto rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

const ClockIcon = (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const DocumentIcon = (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  </svg>
);

export function Recordatorios({ fichas }: { fichas: Ficha[] }) {
  const [hoy] = useState(computeHoy);
  const diaSemanaHoy = hoy.diaSemana;
  const { formato } = useFormatoHora();

  const activas = useMemo(() => fichas.filter((f) => !f.archivada && !f.finalizada), [fichas]);
  const idsActivas = useMemo(() => activas.map((f) => f.id), [activas]);

  const clasesHoy = useMemo<ClaseRecordatorio[]>(() => {
    return activas
      .map((ficha) => {
        const horarios = (ficha.horarios ?? [])
          .filter((h) => h.diaSemana === diaSemanaHoy)
          .sort((a, b) => a.hora.localeCompare(b.hora));
        if (horarios.length === 0) return null;
        return {
          key: `clase-${ficha.id}`,
          titulo: ficha.nombre,
          detalle: `${ficha.codigo} · ${horarios
            .map((h) => `${getShortDayName(h.diaSemana)} ${formatHora(h.hora, formato)}`)
            .join(' · ')}`,
          to: `/fichas/${ficha.id}`,
        };
      })
      .filter((r): r is ClaseRecordatorio => r !== null);
  }, [activas, diaSemanaHoy, formato]);

  const actividadQueries = useQueries({
    queries: idsActivas.map((fichaId) => ({
      queryKey: ['actividades', fichaId],
      queryFn: () => calificacionesApi.getActividades(fichaId),
      staleTime: 60_000,
    })),
  });

  const actividades = useMemo<ActividadRecordatorio[]>(() => {
    const nombres = new Map(fichas.map((f) => [f.id, { nombre: f.nombre, codigo: f.codigo }]));
    return actividadQueries
      .flatMap((q) => q.data ?? [])
      .filter((a): a is typeof a & { fechaLimite: string } => Boolean(a.fechaLimite && a.fechaLimite >= hoy.iso))
      .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite))
      .slice(0, 5)
      .map((a) => {
        const fichaInfo = nombres.get(a.fichaId);
        const esHoy = a.fechaLimite === hoy.iso;
        return {
          key: `actividad-${a.id}`,
          titulo: a.nombre,
          detalle: fichaInfo ? `${fichaInfo.codigo} · ${fichaInfo.nombre}` : a.fichaId,
          fecha: a.fechaLimite,
          esHoy,
          porcentaje: a.porcentaje,
          to: `/fichas/${a.fichaId}/actividades`,
        };
      });
  }, [actividadQueries, hoy.iso, fichas]);

  const cargandoActividades = actividadQueries.some((q) => q.isFetching);

  return (
    <div className="space-y-4">
      {/* Sidebar Header */}
      <div className="space-y-3 px-1">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Agenda & Resumen</h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Información relevante de hoy</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 px-3.5 py-2 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
          <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="truncate">{formatDate(new Date(), 'long')}</span>
        </div>
      </div>

      {/* Clases de hoy */}
      <PanelCard titulo="Clases de hoy" icon={ClockIcon} badge={clasesHoy.length}>
        {clasesHoy.length === 0 ? (
          <p className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">
            No tienes clases programadas para hoy.
          </p>
        ) : (
          clasesHoy.map((c) => (
            <Link
              key={c.key}
              to={c.to}
              className="group block rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-2.5 transition-all hover:border-slate-300 dark:hover:border-white/25 hover:bg-white dark:hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white group-hover:text-navy-900 dark:group-hover:text-emerald-300">
                  {c.titulo}
                </p>
                <span className="shrink-0 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform text-xs">
                  →
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{c.detalle}</p>
            </Link>
          ))
        )}
      </PanelCard>

      {/* Actividades */}
      <PanelCard titulo="Próximas actividades" icon={DocumentIcon} badge={actividades.length}>
        {cargandoActividades && actividades.length === 0 ? (
          <p className="py-2 text-center text-xs text-slate-400 dark:text-slate-500">Cargando actividades…</p>
        ) : actividades.length === 0 ? (
          <p className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">
            No hay actividades próximas a vencer.
          </p>
        ) : (
          actividades.map((a) => (
            <Link
              key={a.key}
              to={a.to}
              className="group block rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 p-2.5 transition-all hover:border-slate-300 dark:hover:border-white/25 hover:bg-white dark:hover:bg-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white group-hover:text-navy-900 dark:group-hover:text-emerald-300">
                  {a.titulo}
                </p>
                {a.esHoy ? (
                  <span className="shrink-0 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-400/20 px-1.5 py-0.2 text-[10px] font-semibold">
                    Vence hoy
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    {formatDate(a.fecha, 'short')}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate">{a.detalle}</span>
                {a.porcentaje !== undefined && (
                  <span className="shrink-0 font-medium text-emerald-700 dark:text-emerald-300">
                    {a.porcentaje}%
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </PanelCard>

      {/* Resumen rápido de fichas */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-4 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
          Resumen
        </h3>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5 border border-slate-100 dark:border-white/10">
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{activas.length}</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Fichas activas</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2.5 border border-slate-100 dark:border-white/10">
            <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{clasesHoy.length}</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Clases hoy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
