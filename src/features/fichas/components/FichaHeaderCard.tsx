import type { Ficha } from '../types';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { formatHora, getShortDayName, type FormatoHoraOption } from '@/shared/utils/helpers';

interface FichaHeaderCardProps {
  ficha: Ficha;
  onOpenDetalle: () => void;
  onBack?: () => void;
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function horarioResumen(ficha: Ficha, formato: FormatoHoraOption): string {
  const horarios = [...(ficha.horarios ?? [])].sort(
    (a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora),
  );
  if (horarios.length === 0) return 'Sin horario programado';

  const partes = horarios.map((h) => `${getShortDayName(h.diaSemana)} ${formatHora(h.hora, formato)}`);
  const max = 2;
  if (partes.length > max) {
    return `${partes.slice(0, max).join(' · ')} +${partes.length - max}`;
  }
  return partes.join(' · ');
}

function trimestreDe(ficha: Ficha): string {
  if (ficha.trimestre?.trim()) return ficha.trimestre;
  const [year, month] = ficha.fechaInicio.split('-').map(Number);
  if (!year || !month) return '—';
  return `T${Math.ceil(month / 3)} ${year}`;
}

/**
 * Tarjeta compacta de la ficha para los encabezados de Actividades/Asistencias.
 * Replica el estilo de la FichaCard del inicio (nombre - código, horario y
 * trimestre en una fila) y es clicable: lleva al detalle de la ficha.
 */
export function FichaHeaderCard({ ficha, onOpenDetalle, onBack }: FichaHeaderCardProps) {
  const { formato } = useFormatoHora();
  const resumen = horarioResumen(ficha, formato);
  const trimestre = trimestreDe(ficha);

  return (
    <div
      onClick={onOpenDetalle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetalle();
        }
      }}
      title={`Ir al detalle de ${ficha.nombre}`}
      aria-label={`Ir al detalle de la ficha ${ficha.nombre}`}
      className="group w-full rounded-2xl border border-slate-200/70 dark:border-white/15 bg-white/95 dark:bg-black p-4 text-left shadow-xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:border-navy-900/40 hover:shadow-md hover:ring-1 hover:ring-navy-900/20 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label="Volver"
            title="Volver"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-navy-900/40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <span className="h-3 w-3 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
        <p className="truncate text-lg font-bold leading-tight text-gray-900 dark:text-white group-hover:text-navy-900 transition-colors">
          {ficha.nombre}
        </p>
        <span className="text-lg font-bold leading-tight text-gray-400 dark:text-slate-500" aria-hidden="true">-</span>
        <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 text-sm font-medium text-gray-700">
          {ficha.codigo}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <span className="flex min-w-0 items-center gap-1.5" title={resumen}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
            <ClockIcon />
          </span>
          <span className="truncate font-medium">{resumen}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5" title={trimestre}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
            <CalendarIcon />
          </span>
          <span className="truncate font-medium text-slate-700 dark:text-slate-200">{trimestre}</span>
        </span>
        <span className="ml-auto shrink-0 text-[11px] font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
          Ver detalle →
        </span>
      </div>
    </div>
  );
}
