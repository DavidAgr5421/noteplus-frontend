import type { ReactNode } from 'react';
import type { Ficha } from '../types';
import { Card } from '@/shared/ui';
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

const HEADER_ICON_BTN =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

const LINE_ICON_BTN =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-white transition-colors hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-800 focus:ring-offset-2';

function MetaTab({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="flex items-center gap-2.5 pr-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-white">
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-800">{value}</span>
      </span>
    </span>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ActionIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-[18px] w-[18px]"
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
  if (horarios.length === 0) return 'Sin horario';

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
    <Card variant="ghost" padding="none" className="card-fade hover:bg-white" onClick={onClick}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-brand-green" aria-hidden="true" />
              <h3 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">{ficha.nombre}</h3>
              <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
                {ficha.codigo}
              </span>
              {isArchived && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  Archivada
                </span>
              )}
              {isFinalizada && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  Finalizada
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            {onDelete && !ficha.finalizada && !isArchived && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className={`${HEADER_ICON_BTN} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`}
                aria-label={`Eliminar ficha ${ficha.nombre}`}
                title="Eliminar ficha"
              >
                <ActionIcon d={TRASH_PATH} />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className={`${HEADER_ICON_BTN} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                aria-label={`Editar ficha ${ficha.nombre}`}
                title="Editar ficha"
              >
                <ActionIcon d={PENCIL_PATH} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="h-px w-full bg-gray-200" aria-hidden="true" />
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="-mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 pt-3">
              <MetaTab icon={<ClockIcon />} label="Horario" value={horarioResumen(ficha, formato)} />
              <MetaTab icon={<CalendarIcon />} label="Trimestre" value={trimestreDe(ficha)} />
            </div>

            <div className="-mt-2 flex items-start gap-2 pt-3 pl-2">
              {!isArchived && !isFinalizada && onFinalize && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFinalize();
                  }}
                  className={LINE_ICON_BTN}
                  aria-label="Finalizar ficha"
                  title="Finalizar ficha"
                >
                  <ActionIcon d={FINALIZE_PATH} />
                </button>
              )}
              {isFinalizada && !isArchived && onReopen && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReopen();
                  }}
                  className={LINE_ICON_BTN}
                  aria-label="Reabrir ficha"
                  title="Reabrir ficha"
                >
                  <ActionIcon d={REOPEN_PATH} />
                </button>
              )}
              {onArchive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive();
                  }}
                  className={LINE_ICON_BTN}
                  aria-label={isArchived ? 'Desarchivar ficha' : 'Archivar ficha'}
                  title={isArchived ? 'Desarchivar ficha' : 'Archivar ficha'}
                >
                  <ActionIcon d={isArchived ? UNARCHIVE_PATH : ARCHIVE_PATH} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
