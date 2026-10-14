import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, CardFooter } from '@/shared/ui';
import { fichaSchema, type FichaFormData, type FichaHorario } from '../types';
import { getDayName, getShortDayName } from '@/shared/utils/helpers';

/** Barra de título de sección: gradiente azul oscuro → blanco de izq. a derecha. */
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-2.5"
      style={{ background: 'linear-gradient(to right, #05233a 0%, #ffffff 100%)' }}
    >
      <h3 className="text-sm font-semibold text-white">{children}</h3>
    </div>
  );
}

export function trimestreDe(fechaInicio: string): string {
  const [year, month] = fechaInicio.split('-').map(Number);
  if (!year || !month) return '';
  return `T${Math.ceil(month / 3)} ${year}`;
}

const formSchema = fichaSchema;

type FormData = FichaFormData;

interface FichaFormProps {
  initialData?: Partial<FichaFormData> & { horarios?: FichaHorario[] };
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
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Carátula analógica que muestra la hora dada, estilo reloj. */
function ClockFace({ time, label }: { time: string; label: string }) {
  const valid = TIME_RE.test(time);
  const [h, m] = valid ? time.split(':').map(Number) : [0, 0];
  const minAngle = m * 6;
  const hourAngle = ((h % 12) + m / 60) * 30;
  const cx = 50;
  const cy = 50;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" className="h-28 w-28">
        <circle cx={cx} cy={cy} r="46" fill="white" stroke="#bfdbfe" strokeWidth="3" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x1 = cx + 38 * Math.sin(a);
          const y1 = cy - 38 * Math.cos(a);
          const x2 = cx + 42 * Math.sin(a);
          const y2 = cy - 42 * Math.cos(a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#93c5fd" strokeWidth={i % 3 === 0 ? 3 : 1.5} />;
        })}
        <line
          x1={cx}
          y1={cy}
          x2={cx + 24 * Math.sin((hourAngle * Math.PI) / 180)}
          y2={cy - 24 * Math.cos((hourAngle * Math.PI) / 180)}
          stroke="#1d4ed8"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={cx + 34 * Math.sin((minAngle * Math.PI) / 180)}
          y2={cy - 34 * Math.cos((minAngle * Math.PI) / 180)}
          stroke="#60a5fa"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="3.5" fill="#1d4ed8" />
      </svg>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <span className="text-lg font-bold tabular-nums text-gray-900">{valid ? time : '--:--'}</span>
    </div>
  );
}

export function FichaForm({ initialData, onSubmit, onCancel, isLoading, submitLabel = 'Guardar' }: FichaFormProps) {
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

  const totalClases = watch('totalClases') ?? 0;

  const toggleDay = (dia: number) => {
    setSelectedDays((prev) => (prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]));
  };

  const duracion = TIME_RE.test(horaInicio) && TIME_RE.test(horaFin)
    ? toMinutes(horaFin) - toMinutes(horaInicio)
    : 0;

  const addHorario = () => {
    setScheduleError(null);
    if (selectedDays.length === 0) {
      setScheduleError('Marca al menos un día de la semana.');
      return;
    }
    if (!TIME_RE.test(horaInicio) || !TIME_RE.test(horaFin)) {
      setScheduleError('Las horas deben tener formato HH:MM.');
      return;
    }
    if (duracion <= 0) {
      setScheduleError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    const duplicates = selectedDays.filter((dia) =>
      horarios.some((h) => h.diaSemana === dia && h.hora === horaInicio)
    );
    if (duplicates.length > 0) {
      setScheduleError(
        `Ya existe un horario a las ${horaInicio} para: ${duplicates.map(getDayName).join(', ')}.`
      );
      return;
    }
    const nuevos: FichaHorario[] = selectedDays.map((diaSemana) => ({
      diaSemana,
      hora: horaInicio,
      duracionMinutos: duracion,
    }));
    setHorarios((prev) =>
      [...prev, ...nuevos].sort((a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora))
    );
    setSelectedDays([]);
  };

  const removeHorario = (diaSemana: number, hora: string) => {
    setHorarios((prev) => prev.filter((h) => !(h.diaSemana === diaSemana && h.hora === hora)));
  };

  const distinctDays = new Set(horarios.map((h) => h.diaSemana)).size;
  const estimatedWeeks = distinctDays > 0 && totalClases > 0
    ? Math.ceil(totalClases / distinctDays)
    : 0;

  const submit = (data: FormData) => {
    if (horarios.length === 0) {
      setScheduleError('Agrega al menos un horario de clase.');
      return;
    }
    const trimestreFinal = data.trimestre?.trim() || trimestreDe(data.fechaInicio);
    onSubmit({ ...data, trimestre: trimestreFinal, horarios });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-8">
      {/* Datos de la ficha */}
      <div>
        <SectionTitle>Datos de la ficha</SectionTitle>
        <div className="grid gap-4 pt-4 md:grid-cols-2">
          <Input
            label="Nombre de la ficha"
            placeholder="Ej: Programación de Software"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <Input
            label="Código de la ficha"
            placeholder="Ej: 123456"
            error={errors.codigo?.message}
            {...register('codigo')}
          />
          <Input
            label="Fecha de inicio"
            type="date"
            error={errors.fechaInicio?.message}
            {...register('fechaInicio')}
          />
          <Input
            label="Trimestre"
            placeholder="Ej: T2 2026"
            error={errors.trimestre?.message}
            {...register('trimestre')}
          />
          <Input
            label="Nota mínima de aprobación"
            type="number"
            step="0.1"
            min="0"
            max="5"
            error={errors.notaMinimaAprobacion?.message}
            {...register('notaMinimaAprobacion', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div aria-hidden="true" className="h-px bg-gray-200" />

      {/* Horario */}
      <div>
        <SectionTitle>Horario de clases</SectionTitle>
        <p className="pt-3 text-center text-sm text-gray-500 mb-3">
          Marca los días, elige de qué hora a qué hora es la clase y agrégalo al horario.
        </p>

        {/* Días estilo reloj de Android */}
        <span className="block text-center text-sm font-medium text-gray-700 mb-2">Días de clase</span>
        <div className="flex justify-center gap-2 mb-5" role="group" aria-label="Días de clase">
          {WEEK_DAYS.map((dia) => {
            const active = selectedDays.includes(dia);
            return (
              <button
                key={dia}
                type="button"
                onClick={() => toggleDay(dia)}
                aria-pressed={active}
                title={getDayName(dia)}
                className={`h-11 w-11 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getShortDayName(dia).charAt(0)}
              </button>
            );
          })}
        </div>

        {/* Reloj: de qué hora a qué hora */}
        <span className="block text-center text-sm font-medium text-gray-700 mb-2">Hora de la clase</span>
        <div className="mx-auto flex w-fit max-w-full flex-col sm:flex-row items-center gap-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <ClockFace time={horaInicio} label="Inicio" />
          <div className="flex sm:flex-col items-center gap-2">
            <div className="w-full">
              <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="hora-inicio">
                De
              </label>
              <input
                id="hora-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-center text-lg font-semibold tabular-nums focus:border-blue-500 focus:outline-none"
              />
            </div>
            <span className="text-gray-400 font-bold">→</span>
            <div className="w-full">
              <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="hora-fin">
                A
              </label>
              <input
                id="hora-fin"
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-center text-lg font-semibold tabular-nums focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <ClockFace time={horaFin} label="Fin" />
          <div className="text-center sm:text-left">
            <p className="text-sm text-gray-600">Duración por clase</p>
            <p className="text-xl font-bold text-navy-900">
              {duracion > 0 ? formatDuration(duracion) : '—'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col items-center">
          <Button type="button" variant="outline" size="sm" onClick={addHorario}>
            + Agregar horario
          </Button>
          {scheduleError && (
            <p className="mt-2 text-center text-xs text-rose-600 font-medium" role="alert">{scheduleError}</p>
          )}
        </div>

        {/* Horarios agregados */}
        {horarios.length > 0 && (
          <ul className="mx-auto mt-4 max-w-xl divide-y divide-slate-100 rounded-2xl border border-slate-200/60 bg-white">
            {horarios.map((h) => (
              <li key={`${h.diaSemana}-${h.hora}`} className="flex items-center gap-3 px-4 py-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-emerald-400">
                  {getShortDayName(h.diaSemana).charAt(0)}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{getDayName(h.diaSemana)}</p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {h.hora} – {formatDuration(h.duracionMinutos)} por clase
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeHorario(h.diaSemana, h.hora)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  aria-label={`Quitar horario del ${getDayName(h.diaSemana)}`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div aria-hidden="true" className="h-px bg-gray-200" />

      {/* Cantidad de clases */}
      <div>
        <SectionTitle>Cantidad de clases</SectionTitle>
        <div className="mx-auto max-w-xs pt-4">
          <Input
            label="Días con clase en total"
            type="number"
            min="1"
            error={errors.totalClases?.message}
            {...register('totalClases', { valueAsNumber: true })}
          />
        </div>
        {estimatedWeeks > 0 && distinctDays > 0 && (
          <p className="mt-2 text-center text-sm text-gray-600">
            {distinctDays} {distinctDays === 1 ? 'día' : 'días'} por semana × {totalClases} clases
            ≈ {estimatedWeeks} {estimatedWeeks === 1 ? 'semana' : 'semanas'} de clase.
          </p>
        )}
      </div>

      <CardFooter className="justify-end">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" variant="navyGreen" loading={isLoading}>{submitLabel}</Button>
      </CardFooter>
    </form>
  );
}
