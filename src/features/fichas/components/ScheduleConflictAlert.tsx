import type { Ficha, FichaHorario } from '../types';
import { formatHora, getDayName } from '@/shared/utils/helpers';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { Button, Modal } from '@/shared/ui';

export interface ScheduleConflictItem {
  fichaId: string;
  fichaNombre: string;
  fichaCodigo: string;
  diaSemana: number;
  diaNombre: string;
  horaExistenteInicio: string;
  horaExistenteFin: string;
  horaPropuestaInicio: string;
  horaPropuestaFin: string;
  isSameFicha?: boolean;
}

export interface ScheduleConflictData {
  accion: 'crear' | 'modificar';
  reasonMessage: string;
  conflicts: ScheduleConflictItem[];
}

function toMinutes(t: string): number {
  const [h, m] = (t || '00:00').slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function findScheduleConflicts(
  horariosPropuestos: FichaHorario[],
  activeFichas: Ficha[],
  currentFichaId?: string,
  accion: 'crear' | 'modificar' = 'crear',
): ScheduleConflictData | null {
  const conflicts: ScheduleConflictItem[] = [];

  // 1. Solapamientos dentro de la misma ficha
  for (let i = 0; i < horariosPropuestos.length; i++) {
    const ha = horariosPropuestos[i];
    const startA = toMinutes(ha.hora);
    const endA = startA + ha.duracionMinutos;
    for (let j = i + 1; j < horariosPropuestos.length; j++) {
      const hb = horariosPropuestos[j];
      if (ha.diaSemana !== hb.diaSemana) continue;
      const startB = toMinutes(hb.hora);
      const endB = startB + hb.duracionMinutos;
      if (startA < endB && startB < endA) {
        conflicts.push({
          fichaId: currentFichaId || '',
          fichaNombre: 'Esta misma ficha',
          fichaCodigo: 'Horario interno',
          diaSemana: ha.diaSemana,
          diaNombre: getDayName(ha.diaSemana),
          horaExistenteInicio: minutesToHHMM(startA),
          horaExistenteFin: minutesToHHMM(endA),
          horaPropuestaInicio: minutesToHHMM(startB),
          horaPropuestaFin: minutesToHHMM(endB),
          isSameFicha: true,
        });
      }
    }
  }

  // 2. Solapamientos con otras fichas activas
  for (const otra of activeFichas) {
    if (currentFichaId && otra.id === currentFichaId) continue;
    if (otra.archivada || otra.finalizada) continue;
    const otrosHorarios = otra.horarios ?? [];
    for (const hp of horariosPropuestos) {
      const startP = toMinutes(hp.hora);
      const endP = startP + hp.duracionMinutos;
      for (const he of otrosHorarios) {
        if (hp.diaSemana !== he.diaSemana) continue;
        const startE = toMinutes(he.hora);
        const endE = startE + he.duracionMinutos;
        if (startP < endE && startE < endP) {
          conflicts.push({
            fichaId: otra.id,
            fichaNombre: otra.nombre,
            fichaCodigo: otra.codigo,
            diaSemana: hp.diaSemana,
            diaNombre: getDayName(hp.diaSemana),
            horaExistenteInicio: minutesToHHMM(startE),
            horaExistenteFin: minutesToHHMM(endE),
            horaPropuestaInicio: minutesToHHMM(startP),
            horaPropuestaFin: minutesToHHMM(endP),
            isSameFicha: false,
          });
        }
      }
    }
  }

  if (conflicts.length === 0) return null;

  const first = conflicts[0];
  const verbo = accion === 'crear' ? 'crear la ficha' : 'modificar el horario de la ficha';
  const reasonMessage = first.isSameFicha
    ? `No se puede ${verbo} porque dos bloques de horario dentro de la misma ficha se cruzan en el mismo día y rango de horas.`
    : `No se puede ${verbo} porque ya tienes otra ficha activa programada en ese mismo día y franja horaria.`;

  return {
    accion,
    reasonMessage,
    conflicts,
  };
}

export function extractScheduleConflictFromError(
  error: unknown,
  defaultAccion: 'crear' | 'modificar' = 'crear',
): ScheduleConflictData | null {
  const err = error as {
    response?: {
      status?: number;
      data?: {
        detail?: string;
        error?: {
          code?: string;
          message?: string;
          details?: {
            accion?: 'crear' | 'modificar';
            conflicts?: ScheduleConflictItem[];
          };
        };
      };
    };
  };

  const apiErr = err?.response?.data?.error;
  const conflicts = apiErr?.details?.conflicts;
  const accion = apiErr?.details?.accion ?? defaultAccion;

  if (Array.isArray(conflicts) && conflicts.length > 0) {
    const first = conflicts[0];
    const verbo = accion === 'crear' ? 'crear la ficha' : 'modificar el horario de la ficha';
    const reasonMessage = first.isSameFicha
      ? `No se puede ${verbo} porque dos bloques de horario dentro de la misma ficha se cruzan en el mismo día y rango de horas.`
      : `No se puede ${verbo} porque ya tienes otra ficha activa programada en ese mismo día y franja horaria.`;
    return {
      accion,
      reasonMessage,
      conflicts,
    };
  }

  const fallbackMsg = apiErr?.message || err?.response?.data?.detail;
  if (fallbackMsg) {
    return {
      accion,
      reasonMessage: fallbackMsg,
      conflicts: [],
    };
  }

  return null;
}

interface ScheduleConflictAlertProps {
  conflict: ScheduleConflictData | null;
  onClose: () => void;
  showModal?: boolean;
}

export function ScheduleConflictAlert({ conflict, onClose, showModal = true }: ScheduleConflictAlertProps) {
  const { formato } = useFormatoHora();

  if (!conflict) return null;

  const title =
    conflict.accion === 'crear'
      ? 'No se puede crear la ficha por cruce de horario'
      : 'No se puede modificar el horario por solapamiento';

  const content = (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {conflict.reasonMessage}
      </p>

      {conflict.conflicts.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#a16074]">
            {conflict.conflicts.length === 1 ? 'Ficha y horario con que se solapa:' : 'Fichas y horarios con que se solapa:'}
          </p>
          <ul className="space-y-2">
            {conflict.conflicts.map((c, idx) => (
              <li
                key={`${c.fichaId}-${c.diaSemana}-${c.horaExistenteInicio}-${idx}`}
                className="rounded-2xl border border-[#a16074]/30 bg-white dark:bg-slate-900 p-3.5 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#a16074]" aria-hidden="true" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {c.fichaNombre}
                    </span>
                    {!c.isSameFicha && c.fichaCodigo && (
                      <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        Código: {c.fichaCodigo}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[#a16074]/15 px-2.5 py-0.5 text-xs font-bold text-[#a16074]">
                    {c.diaNombre}
                  </span>
                </div>

                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {c.isSameFicha ? 'Horario ya agregado en esta ficha' : 'Horario ocupado por esa ficha'}
                    </span>
                    <span className="mt-0.5 block font-bold tabular-nums text-slate-800 dark:text-slate-100">
                      {c.diaNombre}: {formatHora(c.horaExistenteInicio, formato)} – {formatHora(c.horaExistenteFin, formato)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#a16074]/10 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#a16074]">
                      Horario que intentaste asignar
                    </span>
                    <span className="mt-0.5 block font-bold tabular-nums text-[#a16074]">
                      {c.diaNombre}: {formatHora(c.horaPropuestaInicio, formato)} – {formatHora(c.horaPropuestaFin, formato)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div
        role="alert"
        className="rounded-2xl border border-[#a16074]/40 bg-[#a16074]/10 p-4 text-slate-800 dark:text-slate-100"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[#a16074]">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
            <h4 className="text-sm font-bold">{title}</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-white/50 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-white"
            aria-label="Cerrar alerta"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-2">{content}</div>
      </div>

      {showModal && (
        <Modal
          isOpen={true}
          onClose={onClose}
          title={title}
          size="md"
        >
          {content}
          <div className="mt-6 flex justify-end">
            <Button variant="navyGreen" size="sm" onClick={onClose}>
              Entendido, ajustar horario
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
