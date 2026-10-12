import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { calificacionesApi } from '@/features/calificaciones/api/calificacionesApi';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { formatHora, getShortDayName } from '@/shared/utils/helpers';
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
    etiqueta: now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

interface Recordatorio {
  key: string;
  titulo: string;
  detalle: string;
  to: string;
}

function RecordatorioCard({
  titulo,
  icon,
  recordatorios,
  cargando,
  vacio,
}: {
  titulo: string;
  icon: ReactNode;
  recordatorios: Recordatorio[];
  cargando: boolean;
  vacio: string;
}) {
  return (
    <div className="card-fade rounded-3xl p-4 sm:p-5 transition-colors hover:bg-white">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-white">
          {icon}
        </span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">{titulo}</h3>
        {recordatorios.length > 0 && (
          <span className="ml-auto rounded-full bg-navy-900 px-2 py-0.5 text-xs font-bold text-white">
            {recordatorios.length}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {cargando && recordatorios.length === 0 && (
          <p className="text-sm text-gray-400">Cargando…</p>
        )}
        {!cargando && recordatorios.length === 0 && (
          <p className="text-sm text-gray-500">{vacio}</p>
        )}
        {recordatorios.map((r) => (
          <Link
            key={r.key}
            to={r.to}
            className="block rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5 transition-colors hover:border-navy-800 hover:bg-white"
          >
            <p className="truncate text-sm font-semibold text-gray-900">{r.titulo}</p>
            <p className="truncate text-xs text-gray-500">{r.detalle}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

const ClockIcon = (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const AlertIcon = (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14"
    />
  </svg>
);

export function Recordatorios({ fichas }: { fichas: Ficha[] }) {
  const [hoy] = useState(computeHoy);
  const diaSemanaHoy = hoy.diaSemana;
  const { formato } = useFormatoHora();

  const activas = useMemo(() => fichas.filter((f) => !f.archivada && !f.finalizada), [fichas]);
  const idsActivas = useMemo(() => activas.map((f) => f.id), [activas]);

  const clasesHoy = useMemo<Recordatorio[]>(() => {
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
      .filter((r): r is Recordatorio => r !== null);
  }, [activas, diaSemanaHoy, formato]);

  const actividadQueries = useQueries({
    queries: idsActivas.map((fichaId) => ({
      queryKey: ['actividades', fichaId],
      queryFn: () => calificacionesApi.getActividades(fichaId),
      staleTime: 60_000,
    })),
  });

  const vencenHoy = useMemo<Recordatorio[]>(() => {
    const nombres = new Map(fichas.map((f) => [f.id, f.nombre]));
    return actividadQueries
      .flatMap((q) => q.data ?? [])
      .filter((a) => a.fechaLimite === hoy.iso)
      .map((a) => ({
        key: `actividad-${a.id}`,
        titulo: a.nombre,
        detalle: nombres.get(a.fichaId) ?? a.fichaId,
        to: `/fichas/${a.fichaId}/actividades`,
      }));
  }, [actividadQueries, hoy.iso, fichas]);

  const cargandoActividades = actividadQueries.some((q) => q.isFetching);

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">Recordatorios</h2>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-white px-3.5 py-1.5 text-base font-semibold text-gray-900 shadow-sm">
          {hoy.etiqueta}
        </span>
      </div>

      <div className="mt-5 grid gap-4 border-t border-gray-300 pt-5 lg:grid-cols-2">
        <RecordatorioCard
          titulo="Clases de hoy"
          icon={ClockIcon}
          recordatorios={clasesHoy}
          cargando={false}
          vacio="No tienes clases programadas para hoy."
        />
        <RecordatorioCard
          titulo="Vencen hoy"
          icon={AlertIcon}
          recordatorios={vencenHoy}
          cargando={cargandoActividades}
          vacio="Ninguna actividad vence hoy."
        />
      </div>
    </section>
  );
}
