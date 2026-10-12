import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFicha, useUpdateFicha } from '../hooks/useFichas';
import { Button, Modal } from '@/shared/ui';
import { asistenciasApi } from '@/features/asistencias/api/asistenciasApi';
import { estudiantesApi } from '@/features/estudiantes/api/estudiantesApi';
import { formatDate, formatHora, getDayName, getShortDayName } from '@/shared/utils/helpers';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import type { FichaHorario } from '../types';

function trimestreFallback(fechaInicio: string): string {
  const [year, month] = fechaInicio.split('-').map(Number);
  if (!year || !month) return '—';
  return `T${Math.ceil(month / 3)} ${year}`;
}

/** Verde oscuro de marca para los encabezados de tarjeta, con brillo blanco superior. */
const CARD_HEADER_STYLE = {
  background: 'linear-gradient(to bottom, rgba(255,255,255,0.14), rgba(255,255,255,0) 55%), #14532d',
} as const;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

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

const ICON_BTN =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

function ActionGlyph({ d }: { d: string }) {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const USERS_PATH = 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.87M15.5 3.13a3.5 3.5 0 010 6.74';
const CLIPBOARD_PATH = 'M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01';
const CALCHECK_PATH = 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM9.5 14.5l2 2 3.5-4';
const CHART_PATH = 'M4 20V10M10 20V4M16 20v-7M21 20H3';
const PENCIL_PATH = 'M4 20h4L19.5 8.5a2.12 2.12 0 00-3-3L5 17v3zM14.5 6.5l3 3M13 20h7';
const TRASH_PATH = 'M3 6h18M8 6V4.5A1.5 1.5 0 019.5 3h5A1.5 1.5 0 0116 4.5V6m-11 0l1 13.1A1.9 1.9 0 006.9 21h10.2a1.9 1.9 0 001.89-1.9L20 6M10 10.5v6M14 10.5v6';
const PLUS_PATH = 'M12 5v14M5 12h14';
const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7';
const X_PATH = 'M6 6l12 12M18 6L6 18';

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

function HorariosSection({ fichaId, fechaInicio, horarios }: { fichaId: string; fechaInicio: string; horarios: FichaHorario[] }) {
  const update = useUpdateFicha();
  const { formato } = useFormatoHora();
  const [adding, setAdding] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [day, setDay] = useState<number>(1);
  const [horaInicio, setHoraInicio] = useState('18:00');
  const [horaFin, setHoraFin] = useState('20:00');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...(horarios ?? [])].sort((a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora)),
    [horarios]
  );

  const startEdit = (index: number) => {
    const h = sorted[index];
    setEditIndex(index);
    setAdding(false);
    setFormError(null);
    setDay(h.diaSemana);
    setHoraInicio(h.hora);
    const endMin = toMinutes(h.hora) + h.duracionMinutos;
    setHoraFin(`${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`);
  };

  const cancelForm = () => {
    setAdding(false);
    setEditIndex(null);
    setFormError(null);
  };

  const persist = (next: FichaHorario[]) => {
    update.mutate({ id: fichaId, data: { horarios: next } }, { onSuccess: cancelForm });
  };

  const saveForm = () => {
    setFormError(null);
    const dur = toMinutes(horaFin) - toMinutes(horaInicio);
    if (dur <= 0) {
      setFormError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    const entry: FichaHorario = { diaSemana: day, hora: horaInicio, duracionMinutos: dur };
    const others = sorted.filter((_, i) => i !== editIndex);
    if (others.some((h) => h.diaSemana === entry.diaSemana && h.hora === entry.hora)) {
      setFormError('Ya existe un horario ese día a esa hora.');
      return;
    }
    const next = editIndex !== null
      ? sorted.map((h, i) => (i === editIndex ? entry : h))
      : [...sorted, entry];
    persist(next.sort((a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora)));
  };

  const confirmRemove = () => {
    if (deleteIndex === null) return;
    const next = sorted.filter((_, i) => i !== deleteIndex);
    update.mutate(
      { id: fichaId, data: { horarios: next } },
      { onSuccess: () => { setDeleteIndex(null); cancelForm(); } }
    );
  };

  const showForm = adding || editIndex !== null;

  return (
    <section aria-label="Horarios" className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-2" style={CARD_HEADER_STYLE}>
        <h2 className="text-sm font-semibold text-white">Horarios</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setAdding(true); setEditIndex(null); setFormError(null); }}
            className={`${ICON_BTN} !h-7 !w-7 border border-white/40 bg-transparent text-white hover:bg-white/10 focus:ring-white`}
            aria-label="Añadir horario"
            title="Añadir horario"
          >
            <ActionGlyph d={PLUS_PATH} />
          </button>
        )}
      </div>

      <div className="p-6">
        {sorted.length === 0 && !showForm && (
          <p className="text-sm text-gray-500">Aún no hay horarios definidos para esta ficha.</p>
        )}

        {sorted.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
            {sorted.map((h, i) => (
              <li key={`${h.diaSemana}-${h.hora}-${i}`} className="flex items-center gap-3 px-4 py-3">
                {editIndex === i ? (
                  <div className="w-full">
                    <HorarioForm
                      day={day} setDay={setDay}
                      horaInicio={horaInicio} setHoraInicio={setHoraInicio}
                      horaFin={horaFin} setHoraFin={setHoraFin}
                      formError={formError}
                      saving={update.isPending}
                      onSave={saveForm}
                      onCancel={cancelForm}
                      saveLabel="Guardar"
                    />
                  </div>
                ) : (
                  <>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                      {getShortDayName(h.diaSemana).charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{getDayName(h.diaSemana)}</p>
                      <p className="text-sm tabular-nums text-gray-500">
                        {formatHora(h.hora, formato)} · {formatDuration(h.duracionMinutos)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(i)}
                      className={`${ICON_BTN} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                      aria-label={`Editar horario del ${getDayName(h.diaSemana)}`}
                      title="Editar"
                    >
                      <ActionGlyph d={PENCIL_PATH} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteIndex(i)}
                      className={`${ICON_BTN} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`}
                      aria-label={`Eliminar horario del ${getDayName(h.diaSemana)}`}
                      title="Eliminar"
                    >
                      <ActionGlyph d={TRASH_PATH} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {adding && (
          <div className="mt-4 rounded-2xl border border-gray-200 p-4">
            <HorarioForm
              day={day} setDay={setDay}
              horaInicio={horaInicio} setHoraInicio={setHoraInicio}
              horaFin={horaFin} setHoraFin={setHoraFin}
              formError={formError}
              saving={update.isPending}
              onSave={saveForm}
              onCancel={cancelForm}
              saveLabel="Añadir"
            />
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          Inicio de la ficha: {formatDate(fechaInicio, 'long')}. Los cambios de horario aplican a futuras programaciones.
        </p>
      </div>

      <Modal
        isOpen={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        title="Eliminar horario"
        size="sm"
        headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
        titleClassName="text-lg font-semibold text-white"
        closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <p className="text-gray-600">
          ¿Eliminar el horario del{' '}
          <span className="font-semibold text-gray-900">
            {deleteIndex !== null
              ? `${getDayName(sorted[deleteIndex].diaSemana)} ${formatHora(sorted[deleteIndex].hora, formato)}`
              : ''}
          </span>
          ? Las clases futuras no se regeneran automáticamente.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteIndex(null)}>Cancelar</Button>
          <Button variant="danger" loading={update.isPending} onClick={confirmRemove}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </section>
  );
}

function HorarioForm(props: {
  day: number; setDay: (d: number) => void;
  horaInicio: string; setHoraInicio: (v: string) => void;
  horaFin: string; setHoraFin: (v: string) => void;
  formError: string | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Día de la semana">
        {WEEK_DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => props.setDay(d)}
            aria-pressed={props.day === d}
            title={getDayName(d)}
            className={`h-9 w-9 rounded-full text-xs font-bold transition-colors ${
              props.day === d ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {getShortDayName(d).charAt(0)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-medium text-gray-600">
          De
          <input
            type="time"
            value={props.horaInicio}
            onChange={(e) => props.setHoraInicio(e.target.value)}
            className="mt-1 block rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold tabular-nums focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          A
          <input
            type="time"
            value={props.horaFin}
            onChange={(e) => props.setHoraFin(e.target.value)}
            className="mt-1 block rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold tabular-nums focus:border-blue-500 focus:outline-none"
          />
        </label>
        <div className="flex gap-2 pb-0.5">
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.saving}
            className={`${ICON_BTN} bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-800 disabled:opacity-50`}
            aria-label={props.saveLabel}
            title={props.saveLabel}
          >
            <ActionGlyph d={CHECK_PATH} />
          </button>
          <button
            type="button"
            onClick={props.onCancel}
            className={`${ICON_BTN} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
            aria-label="Cancelar"
            title="Cancelar"
          >
            <ActionGlyph d={X_PATH} />
          </button>
        </div>
      </div>
      {props.formError && <p className="text-sm text-red-600" role="alert">{props.formError}</p>}
    </div>
  );
}

export function FichaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ficha, isLoading, error } = useFicha(id || '');

  const { data: clases } = useQuery({
    queryKey: ['ficha-clases', id, ficha?.fechaInicio],
    queryFn: () => {
      const from = typeof ficha?.fechaInicio === 'string' ? ficha.fechaInicio.slice(0, 10) : todayISO();
      return asistenciasApi.getCalendar(from, addDaysISO(from, 400));
    },
    enabled: !!ficha,
    retry: 1,
  });

  const { data: estudiantes } = useQuery({
    queryKey: ['estudiantes', id],
    queryFn: () => estudiantesApi.list(id || ''),
    enabled: !!id,
    retry: 1,
  });

  const clasesRestantes = useMemo(() => {
    if (!ficha) return 0;
    if (!clases) return ficha.totalClases;
    const hoy = todayISO();
    const propias = clases.filter((c: { fichaId?: string; ficha_id?: string; fecha: string }) => {
      const fid = c.fichaId ?? c.ficha_id;
      return fid === ficha.id && c.fecha.slice(0, 10) >= hoy;
    });
    return propias.length;
  }, [clases, ficha]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-navy-900 border-t-transparent" />
      </div>
    );
  }

  if (error || !ficha) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">Ficha no encontrada</p>
        <Link to="/fichas" className="mt-4 inline-block text-blue-600 hover:underline">
          Volver a la lista
        </Link>
      </div>
    );
  }

  const estado = ficha.archivada ? 'Archivada' : ficha.finalizada ? 'Finalizada' : 'Activa';
  const estadoDot = ficha.archivada ? 'bg-gray-400' : ficha.finalizada ? 'bg-blue-500' : 'bg-brand-green';
  const trimestre = ficha.trimestre?.trim() || trimestreFallback(ficha.fechaInicio.slice(0, 10));

  const realizadas = Math.max(0, Math.min(ficha.totalClases, ficha.totalClases - clasesRestantes));
  const avancePct = ficha.totalClases > 0 ? Math.round((realizadas / ficha.totalClases) * 100) : 0;

  const acciones = [
    { to: `/fichas/${ficha.id}/estudiantes`, label: 'Estudiantes', d: USERS_PATH },
    { to: `/fichas/${ficha.id}/actividades`, label: 'Actividades', d: CLIPBOARD_PATH },
    { to: `/fichas/${ficha.id}/asistencias`, label: 'Asistencias', d: CALCHECK_PATH },
    { to: `/fichas/${ficha.id}/actividades#calificaciones`, label: 'Calificaciones', d: CHART_PATH },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Encabezado con degradado blanco en su propia sección */}
      <div
        className="rounded-3xl px-5 py-4"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0))' }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">{ficha.nombre}</h1>
            <p className="mt-2 text-base text-gray-500">Código: {ficha.codigo}</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <span className={`h-2.5 w-2.5 rounded-full ${estadoDot}`} aria-hidden="true" />
              {estado}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pr-1 pt-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Trimestre</span>
              <span className="text-sm font-semibold text-gray-800">{trimestre}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Línea blanca afilada (sin bloque de degradado debajo) */}
      <div className="mt-2" aria-hidden="true">
        <div
          className="h-[2px] w-full"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #ffffff 12%, #ffffff 88%, transparent 100%)' }}
        />
      </div>

      {/* Dos tarjetas hermanas */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section aria-label="Información" className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="px-5 py-2" style={CARD_HEADER_STYLE}>
            <h2 className="text-sm font-semibold text-white">Información</h2>
          </div>
          <dl className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-gray-500">Inicio</dt>
              <dd className="text-sm font-semibold text-gray-900">{formatDate(ficha.fechaInicio, 'long')}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-gray-500">Trimestre</dt>
              <dd className="text-sm font-semibold text-gray-900">{trimestre}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-gray-500">Estudiantes</dt>
              <dd className="text-sm font-semibold tabular-nums text-gray-900">{estudiantes?.length ?? '—'}</dd>
            </div>
            <div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-gray-500">Total clases / Restantes</dt>
                <dd className="text-sm font-semibold tabular-nums text-gray-900">
                  {ficha.totalClases} / {clasesRestantes}
                </dd>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={avancePct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de clases">
                <div className="h-full rounded-full bg-brand-green" style={{ width: `${avancePct}%` }} />
              </div>
              <p className="mt-1 text-right text-xs tabular-nums text-gray-500">{avancePct}% completado</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-gray-500">Nota mínima</dt>
              <dd className="text-sm font-semibold tabular-nums text-gray-900">
                {ficha.notaMinimaAprobacion.toFixed(1)}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-label="Acciones" className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="px-5 py-2" style={CARD_HEADER_STYLE}>
            <h2 className="text-sm font-semibold text-white">Acciones</h2>
          </div>
          <div className="space-y-3 p-6">
            {acciones.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 font-medium text-gray-800 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-900 focus:ring-offset-2"
                style={{ background: 'linear-gradient(to right, #ffffff 0%, #eef2f7 100%)' }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-white">
                  <ActionGlyph d={a.d} />
                </span>
                {a.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Horarios */}
      <div className="mt-6">
        <HorariosSection fichaId={ficha.id} fechaInicio={ficha.fechaInicio.slice(0, 10)} horarios={ficha.horarios ?? []} />
      </div>
    </div>
  );
}
