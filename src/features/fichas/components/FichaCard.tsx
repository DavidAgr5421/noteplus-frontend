import type { Ficha } from '../types';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { formatHora, getShortDayName, type FormatoHoraOption } from '@/shared/utils/helpers';

interface FichaCardProps {
  ficha: Ficha;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onFinalize?: () => void;
  onReopen?: () => void;
  isArchived?: boolean;
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

function UsersIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function ActionIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const TRASH_PATH = 'M3 6h18M8 6V4.5A1.5 1.5 0 019.5 3h5A1.5 1.5 0 0116 4.5V6m-11 0l1 13.1A1.9 1.9 0 006.9 21h10.2a1.9 1.9 0 001.89-1.9L20 6M10 10.5v6M14 10.5v6';
const PENCIL_PATH = 'M4 20h4L19.5 8.5a2.12 2.12 0 00-3-3L5 17v3zM14.5 6.5l3 3M13 20h7';
const FINALIZE_PATH = 'M5 12.5l4.5 4.5L19 7';
const REOPEN_PATH = 'M20 12a8 8 0 11-2.34-5.66M20 4.5V10h-5.5';
const ARCHIVE_PATH = 'M4 8.5h16V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19V8.5zM4 8.5L5.6 5h12.8L20 8.5M10 12.5h4';
const UNARCHIVE_PATH = 'M4 8.5h16V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19V8.5zM4 8.5L5.6 5h12.8L20 8.5M12 17.5v-5.5M9.5 14.5L12 12l2.5 2.5';

function horarioResumen(ficha: Ficha, formato: FormatoHoraOption): string {
  const horarios = [...(ficha.horarios ?? [])].sort(
    (a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora)
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

export function FichaCard({
  ficha,
  onClick,
  onEdit,
  onArchive,
  onDelete,
  onFinalize,
  onReopen,
  isArchived = false,
}: FichaCardProps) {
  const isFinalizada = ficha.finalizada;
  const { formato } = useFormatoHora();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group relative flex flex-col justify-between rounded-2xl bg-white/95 dark:bg-slate-900/95 p-4 sm:p-4.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 border border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/25 transition-all duration-200 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-navy-900/30"
    >
      <div>
        {/* Top bar: Indicator + Nombre de la ficha + Código + Quick actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                isArchived
                  ? 'bg-slate-400'
                  : isFinalizada
                  ? 'bg-emerald-600'
                  : 'bg-emerald-500'
              }`}
              aria-hidden="true"
            />
            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-navy-900 dark:group-hover:text-emerald-400 transition-colors truncate leading-snug">
              {ficha.nombre}
            </h3>
            <span className="shrink-0 rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {ficha.codigo}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100"
                aria-label={`Editar ficha ${ficha.nombre}`}
                title="Editar ficha"
              >
                <ActionIcon d={PENCIL_PATH} />
              </button>
            )}
            {onDelete && !ficha.finalizada && !isArchived && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#a16074] hover:bg-[#a16074]/10 hover:text-[#8e5063] transition-colors focus:outline-none focus:ring-2 focus:ring-[#a16074]/30"
                aria-label={`Eliminar ficha ${ficha.nombre}`}
                title="Eliminar ficha"
              >
                <ActionIcon d={TRASH_PATH} />
              </button>
            )}
          </div>
        </div>

        {/* Status badges only if archived or finalized */}
        {(isArchived || isFinalizada) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {isArchived && (
              <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Archivada
              </span>
            )}
            {isFinalizada && (
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-400/20 px-2 py-0.5 text-[11px] font-medium">
                Finalizada
              </span>
            )}
          </div>
        )}

        {/* Metadata grid in compact mosaic items: Horario, N° estudiantes, Trimestre, Clases restantes */}
        <div className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 min-w-0" title={horarioResumen(ficha, formato)}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
              <ClockIcon />
            </span>
            <span className="truncate font-medium">{horarioResumen(ficha, formato)}</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0" title={`${ficha.numeroEstudiantes ?? 0} estudiantes`}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
              <UsersIcon />
            </span>
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">
              {ficha.numeroEstudiantes ?? 0} estudiantes
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0" title={trimestreDe(ficha)}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
              <CalendarIcon />
            </span>
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{trimestreDe(ficha)}</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0" title={`${ficha.clasesRestantes ?? ficha.totalClases} clases restantes`}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
              <BookOpenIcon />
            </span>
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">
              {ficha.clasesRestantes ?? ficha.totalClases} clases rest.
            </span>
          </div>
        </div>
      </div>

      {/* Footer bar with actions */}
      <div className="mt-4 pt-3 border-t border-slate-100/90 dark:border-white/10 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
          Ver detalles →
        </span>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {!isArchived && !isFinalizada && onFinalize && (
            <button
              type="button"
              onClick={onFinalize}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-emerald-400 hover:bg-navy-800 transition-colors focus:outline-none focus:ring-2 focus:ring-navy-900/40"
              aria-label="Finalizar ficha"
              title="Finalizar ficha"
            >
              <ActionIcon d={FINALIZE_PATH} />
            </button>
          )}
          {isFinalizada && !isArchived && onReopen && (
            <button
              type="button"
              onClick={onReopen}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-emerald-400 hover:bg-navy-800 transition-colors focus:outline-none focus:ring-2 focus:ring-navy-900/40"
              aria-label="Reabrir ficha"
              title="Reabrir ficha"
            >
              <ActionIcon d={REOPEN_PATH} />
            </button>
          )}
          {onArchive && (
            <button
              type="button"
              onClick={onArchive}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-label={isArchived ? 'Desarchivar ficha' : 'Archivar ficha'}
              title={isArchived ? 'Desarchivar ficha' : 'Archivar ficha'}
            >
              <ActionIcon d={isArchived ? UNARCHIVE_PATH : ARCHIVE_PATH} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
