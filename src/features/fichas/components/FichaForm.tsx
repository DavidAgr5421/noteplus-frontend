import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fichaSchema, type Ficha, type FichaFormData, type FichaHorario } from '../types';
import { getDayName, getShortDayName } from '@/shared/utils/helpers';
import {
  ScheduleConflictAlert,
  findScheduleConflicts,
  type ScheduleConflictData,
} from './ScheduleConflictAlert';

export function trimestreDe(fechaInicio: string): string {
  const [year, month] = fechaInicio.split('-').map(Number);
  if (!year || !month) return '';
  return `T${Math.ceil(month / 3)} ${year}`;
}

const formSchema = fichaSchema;

type FormData = FichaFormData;

interface FichaFormProps {
  initialData?: Partial<FichaFormData> & { horarios?: FichaHorario[] };
  activeFichas?: Ficha[];
  currentFichaId?: string;
  externalConflict?: ScheduleConflictData | null;
  onClearExternalConflict?: () => void;
  onSubmit: (data: FormData & { horarios: FichaHorario[] }) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

/** Días en orden Lun–Dom con su diaSemana de backend (0 = domingo). */
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h 00m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Cálculo automático en vivo de proyección de sesiones */
function calcularEstimacion(
  fechaInicioStr: string,
  totalClases: number,
  horarios: FichaHorario[]
): {
  fechaInicioFormateada: string;
  fechaFinFormateada: string;
  diasTexto: string;
  horarioTexto: string;
} | null {
  if (!fechaInicioStr || !totalClases || totalClases <= 0 || horarios.length === 0) {
    return null;
  }

  const parts = fechaInicioStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }

  const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  const scheduledDayNumbers = Array.from(new Set(horarios.map((h) => h.diaSemana)));

  let count = 0;
  let safety = 0;
  let finalDate = new Date(d);

  while (safety < 3650) {
    safety++;
    if (scheduledDayNumbers.includes(d.getDay())) {
      count++;
      finalDate = new Date(d);
      if (count >= totalClases) break;
    }
    d.setDate(d.getDate() + 1);
  }

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const formatFecha = (dateObj: Date) => {
    return `${dateObj.getDate()} de ${meses[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
  };

  const diasNombres = scheduledDayNumbers
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map(getDayName);

  const diasTexto = diasNombres.length === 1
    ? diasNombres[0]
    : diasNombres.slice(0, -1).join(', ') + ' y ' + diasNombres[diasNombres.length - 1];

  const primerHorario = horarios[0];
  const finMinutos = toMinutes(primerHorario.hora) + primerHorario.duracionMinutos;
  const finH = String(Math.floor(finMinutos / 60)).padStart(2, '0');
  const finM = String(finMinutos % 60).padStart(2, '0');
  const horarioTexto = `de ${primerHorario.hora} a ${finH}:${finM}`;

  return {
    fechaInicioFormateada: formatFecha(new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)),
    fechaFinFormateada: formatFecha(finalDate),
    diasTexto,
    horarioTexto,
  };
}

export function FichaForm({
  initialData,
  activeFichas = [],
  currentFichaId,
  externalConflict,
  onClearExternalConflict,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = 'Guardar Ficha',
}: FichaFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      fechaInicio: '',
      trimestre: '',
      totalClases: 10,
      notaMinimaAprobacion: 3.0,
      ...initialData,
    },
  });

  const fechaInicio = watch('fechaInicio') ?? '';
  const trimestre = watch('trimestre') ?? '';
  const totalClases = watch('totalClases') ?? 0;

  useEffect(() => {
    if (!trimestre && fechaInicio) {
      const auto = trimestreDe(fechaInicio);
      if (auto) setValue('trimestre', auto);
    }
  }, [fechaInicio, trimestre, setValue]);

  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [horaInicio, setHoraInicio] = useState('18:00');
  const [horaFin, setHoraFin] = useState('20:00');
  const [horarios, setHorarios] = useState<FichaHorario[]>(initialData?.horarios ?? []);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [localConflict, setLocalConflict] = useState<ScheduleConflictData | null>(null);

  const accion: 'crear' | 'modificar' = currentFichaId ? 'modificar' : 'crear';
  const activeConflict = externalConflict ?? localConflict;

  const clearConflict = () => {
    setLocalConflict(null);
    onClearExternalConflict?.();
  };

  const toggleDay = (dia: number) => {
    setSelectedDays((prev) => (prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]));
  };

  const duracion = TIME_RE.test(horaInicio) && TIME_RE.test(horaFin)
    ? toMinutes(horaFin) - toMinutes(horaInicio)
    : 0;

  const addHorario = () => {
    setScheduleError(null);
    clearConflict();
    if (selectedDays.length === 0) {
      setScheduleError('Selecciona al menos un día para este horario.');
      return;
    }
    if (!TIME_RE.test(horaInicio) || !TIME_RE.test(horaFin)) {
      setScheduleError('Las horas deben tener formato válido (HH:MM).');
      return;
    }
    if (duracion <= 0) {
      setScheduleError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    const nuevos: FichaHorario[] = selectedDays.map((diaSemana) => ({
      diaSemana,
      hora: horaInicio,
      duracionMinutos: duracion,
    }));
    const candidatos = [...horarios, ...nuevos].sort(
      (a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora),
    );
    const conflict = findScheduleConflicts(candidatos, activeFichas, currentFichaId, accion);
    if (conflict) {
      setLocalConflict(conflict);
      return;
    }
    setHorarios(candidatos);
    setSelectedDays([]);
  };

  const removeHorario = (diaSemana: number, hora: string) => {
    clearConflict();
    setHorarios((prev) => prev.filter((h) => !(h.diaSemana === diaSemana && h.hora === hora)));
  };

  const estimacion = calcularEstimacion(fechaInicio, totalClases, horarios);

  const submit = (data: FormData) => {
    if (horarios.length === 0) {
      setScheduleError('Debes agregar al menos un horario de clase para la ficha.');
      return;
    }
    const conflict = findScheduleConflicts(horarios, activeFichas, currentFichaId, accion);
    if (conflict) {
      setLocalConflict(conflict);
      return;
    }
    const trimestreFinal = data.trimestre?.trim() || trimestreDe(data.fechaInicio);
    onSubmit({ ...data, trimestre: trimestreFinal, horarios });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-[#0B192C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 animate-fade-up">
      <form onSubmit={handleSubmit(submit)} className="space-y-8 divide-y divide-slate-200 dark:divide-slate-800">
        <ScheduleConflictAlert conflict={activeConflict} onClose={clearConflict} />

        {/* ========================================================
            SECCIÓN 1: INFORMACIÓN ACADÉMICA
        ======================================================== */}
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="h-4 w-4 text-[#00875A] dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <span>Información Académica</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Identificación oficial del programa y parámetros base de calificación.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Nombre del Programa / Ficha (2/3 de ancho) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5" htmlFor="field-nombre">
                Nombre del Programa / Ficha
              </label>
              <input
                id="field-nombre"
                type="text"
                placeholder="Ej. Análisis y Desarrollo de Software"
                className="w-full rounded-lg bg-slate-50/50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium" role="alert">
                  {errors.nombre.message}
                </p>
              )}
            </div>

            {/* Código de Ficha (1/3 de ancho) */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5" htmlFor="field-codigo">
                Código de Ficha
              </label>
              <input
                id="field-codigo"
                type="text"
                placeholder="Ej. 3573371"
                className="w-full rounded-lg bg-slate-50/50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                {...register('codigo')}
              />
              {errors.codigo && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium" role="alert">
                  {errors.codigo.message}
                </p>
              )}
            </div>

            {/* Fecha de Inicio */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5" htmlFor="field-fechaInicio">
                Fecha de Inicio
              </label>
              <div className="relative">
                <input
                  id="field-fechaInicio"
                  type="date"
                  className="w-full rounded-lg bg-slate-50/50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                  {...register('fechaInicio')}
                />
              </div>
              {errors.fechaInicio && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium" role="alert">
                  {errors.fechaInicio.message}
                </p>
              )}
            </div>

            {/* Trimestre */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5" htmlFor="field-trimestre">
                Trimestre
              </label>
              <input
                id="field-trimestre"
                type="text"
                placeholder="Ej. T4 2026"
                className="w-full rounded-lg bg-slate-50/50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                {...register('trimestre')}
              />
              {errors.trimestre && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium" role="alert">
                  {errors.trimestre.message}
                </p>
              )}
            </div>

            {/* Nota Mínima de Aprobación */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5" htmlFor="field-notaMinima">
                Nota Mínima
              </label>
              <input
                id="field-notaMinima"
                type="number"
                step="0.1"
                min="0"
                max="5"
                placeholder="3.0"
                className="w-full text-center font-semibold rounded-lg bg-slate-50/50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                {...register('notaMinimaAprobacion', { valueAsNumber: true })}
              />
              {errors.notaMinimaAprobacion && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium" role="alert">
                  {errors.notaMinimaAprobacion.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================
            SECCIÓN 2: CONFIGURACIÓN DE HORARIOS Y DÍAS
        ======================================================== */}
        <section className="pt-8 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="h-4 w-4 text-[#00875A] dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Horarios y Días de Formación</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Define los días de la semana y los rangos de tiempo de las clases.
            </p>
          </div>

          <div className="space-y-4">
            {/* Selector de Días */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Días de Clase
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Días de clase">
                {WEEK_DAYS.map((dia) => {
                  const active = selectedDays.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDay(dia)}
                      aria-pressed={active}
                      title={getDayName(dia)}
                      className={`h-10 w-10 sm:h-11 sm:w-11 rounded-lg text-sm font-semibold transition-all border ${
                        active
                          ? 'bg-[#0B192C] text-white border-[#0B192C] dark:bg-emerald-600 dark:border-emerald-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {getShortDayName(dia).charAt(0)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Rango de Hora Técnico y Compacto (Sin relojes analógicos) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              {/* Hora Inicio */}
              <div className="flex-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1" htmlFor="input-hora-inicio">
                  Hora de Inicio
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    id="input-hora-inicio"
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-semibold tabular-nums rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Flecha divisoria */}
              <div className="hidden sm:flex items-center justify-center pt-5 text-slate-400 dark:text-slate-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>

              {/* Hora Fin */}
              <div className="flex-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1" htmlFor="input-hora-fin">
                  Hora de Fin
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    id="input-hora-fin"
                    type="time"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-semibold tabular-nums rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Badge cálculo automático de duración */}
              <div className="sm:self-end sm:mb-0.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs whitespace-nowrap">
                  <span className="text-slate-400">Duración:</span>
                  <span className="font-semibold text-slate-900 dark:text-emerald-400 tabular-nums">
                    {duracion > 0 ? formatDuration(duracion) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Botón "+ Agregar otro horario / día" con borde punteado */}
            <button
              type="button"
              onClick={addHorario}
              className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-800 dark:hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2.5 rounded-lg w-full flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Agregar este horario a la ficha</span>
            </button>

            {scheduleError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium" role="alert">
                {scheduleError}
              </p>
            )}

            {/* Lista de Horarios Agregados */}
            {horarios.length > 0 && (
              <div className="pt-2">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Horarios Configurados ({horarios.length})
                </span>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden">
                  {horarios.map((h) => {
                    const startMin = toMinutes(h.hora);
                    const endMin = startMin + h.duracionMinutos;
                    const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
                    const endM = String(endMin % 60).padStart(2, '0');

                    return (
                      <li key={`${h.diaSemana}-${h.hora}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white dark:hover:bg-slate-900/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#0B192C] text-xs font-bold text-emerald-400 border border-slate-800">
                            {getShortDayName(h.diaSemana).charAt(0)}
                          </span>
                          <div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {getDayName(h.diaSemana)}
                            </span>
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              {h.hora} – {endH}:{endM} ({formatDuration(h.duracionMinutos)})
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeHorario(h.diaSemana, h.hora)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                          aria-label={`Quitar horario del ${getDayName(h.diaSemana)}`}
                          title="Eliminar horario"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================
            SECCIÓN 3: CÁLCULO DE CLASES Y ESTIMACIÓN DE SESIONES
        ======================================================== */}
        <section className="pt-8 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="h-4 w-4 text-[#00875A] dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span>Planificación de Sesiones y Estimación</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Configura el número previsto de clases para calcular automáticamente el calendario.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5" htmlFor="field-totalClases">
                Total de Sesiones Planificadas
              </label>
              <div className="relative">
                <input
                  id="field-totalClases"
                  type="number"
                  min="1"
                  placeholder="10"
                  className="w-full rounded-lg bg-slate-50/50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                  {...register('totalClases', { valueAsNumber: true })}
                />
              </div>
              {errors.totalClases && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium" role="alert">
                  {errors.totalClases.message}
                </p>
              )}
            </div>

            {/* Panel de Previsualización Dinámico Compacto */}
            <div className="md:col-span-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Proyección de Calendario en Vivo
                    </p>
                    {estimacion ? (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Se generarán <span className="font-semibold text-slate-900 dark:text-white">{totalClases} clases</span> entre el{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">{estimacion.fechaInicioFormateada}</span> y el{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">{estimacion.fechaFinFormateada}</span>, los días{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">{estimacion.diasTexto}</span> {estimacion.horarioTexto}.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Ingresa la fecha de inicio, horarios y total de sesiones para calcular la duración y fecha final del período académico.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            FOOTER: PIE DE ACCIONES
        ======================================================== */}
        <div className="pt-6 flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold shadow-xs bg-[#00875A] hover:bg-[#007048] active:bg-[#005e3c] text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {isLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>{submitLabel}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
