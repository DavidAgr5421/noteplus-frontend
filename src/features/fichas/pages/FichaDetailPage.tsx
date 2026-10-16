import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFicha, useFichas, useUpdateFicha } from '../hooks/useFichas';
import { Button, Modal } from '@/shared/ui';
import { asistenciasApi } from '@/features/asistencias/api/asistenciasApi';
import { estudiantesApi } from '@/features/estudiantes/api/estudiantesApi';
import { calificacionesApi } from '@/features/calificaciones/api/calificacionesApi';
import { formatDate, formatHora, getDayName, getShortDayName } from '@/shared/utils/helpers';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import {
  ScheduleConflictAlert,
  findScheduleConflicts,
  extractScheduleConflictFromError,
  type ScheduleConflictData,
} from '../components/ScheduleConflictAlert';
import type { FichaHorario } from '../types';

function trimestreFallback(fechaInicio: string): string {
  const [year, month] = fechaInicio.split('-').map(Number);
  if (!year || !month) return '—';
  return `T${Math.ceil(month / 3)} ${year}`;
}

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
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-1';

function ActionGlyph({ d }: { d: string }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
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
  const { data: activeFichas = [] } = useFichas(false);
  const { formato } = useFormatoHora();
  const [adding, setAdding] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [day, setDay] = useState<number>(1);
  const [horaInicio, setHoraInicio] = useState('18:00');
  const [horaFin, setHoraFin] = useState('20:00');
  const [formError, setFormError] = useState<string | null>(null);
  const [conflictAlert, setConflictAlert] = useState<ScheduleConflictData | null>(null);
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
    setConflictAlert(null);
    setDay(h.diaSemana);
    setHoraInicio(h.hora);
    const endMin = toMinutes(h.hora) + h.duracionMinutos;
    setHoraFin(`${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`);
  };

  const cancelForm = () => {
    setAdding(false);
    setEditIndex(null);
    setFormError(null);
    setConflictAlert(null);
  };

  const persist = (next: FichaHorario[]) => {
    update.mutate(
      { id: fichaId, data: { horarios: next } },
      {
        onSuccess: cancelForm,
        onError: (err) => {
          const conflict = extractScheduleConflictFromError(err, 'modificar');
          if (conflict) {
            setConflictAlert(conflict);
          }
        },
      },
    );
  };

  const saveForm = () => {
    setFormError(null);
    setConflictAlert(null);
    const dur = toMinutes(horaFin) - toMinutes(horaInicio);
    if (dur <= 0) {
      setFormError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    const entry: FichaHorario = { diaSemana: day, hora: horaInicio, duracionMinutos: dur };
    const next = (
      editIndex !== null
        ? sorted.map((h, i) => (i === editIndex ? entry : h))
        : [...sorted, entry]
    ).sort((a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora));

    const conflict = findScheduleConflicts(next, activeFichas, fichaId, 'modificar');
    if (conflict) {
      setConflictAlert(conflict);
      return;
    }

    persist(next);
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
    <section aria-label="Horarios" className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-white/10 shadow-sm">
      <div className="flex items-center justify-between bg-navy-900 px-5 py-3.5 text-white">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-sm font-semibold tracking-wide text-white">Horarios de clase</h2>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setAdding(true); setEditIndex(null); setFormError(null); setConflictAlert(null); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Añadir horario"
          >
            <ActionGlyph d={PLUS_PATH} />
            <span>Añadir horario</span>
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        <ScheduleConflictAlert conflict={conflictAlert} onClose={() => setConflictAlert(null)} />
        {sorted.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay horarios definidos para esta ficha.</p>
        )}

        {sorted.length > 0 && (
          <ul className="divide-y divide-slate-100 dark:divide-white/10 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-900">
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
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-emerald-400">
                      {getShortDayName(h.diaSemana).charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{getDayName(h.diaSemana)}</p>
                      <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {formatHora(h.hora, formato)} · {formatDuration(h.duracionMinutos)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(i)}
                      className={`${ICON_BTN} border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 focus:ring-slate-300`}
                      aria-label={`Editar horario del ${getDayName(h.diaSemana)}`}
                      title="Editar"
                    >
                      <ActionGlyph d={PENCIL_PATH} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteIndex(i)}
                      className={`${ICON_BTN} bg-[#a16074]/10 text-[#a16074] border border-[#a16074]/30 hover:bg-[#a16074]/20 focus:ring-[#a16074]/40`}
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
          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-4">
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

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Inicio de la ficha: {formatDate(fechaInicio, 'long')}. Los cambios de horario aplican a futuras programaciones.
        </p>
      </div>

      <Modal
        isOpen={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        title="Eliminar horario"
        size="sm"
        headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
        titleClassName="text-base font-semibold text-white"
        closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          ¿Eliminar el horario del{' '}
          <span className="font-semibold text-slate-900 dark:text-white">
            {deleteIndex !== null
              ? `${getDayName(sorted[deleteIndex].diaSemana)} ${formatHora(sorted[deleteIndex].hora, formato)}`
              : ''}
          </span>
          ? Las clases futuras no se regeneran automáticamente.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDeleteIndex(null)}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" loading={update.isPending} onClick={confirmRemove}>
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
              props.day === d ? 'bg-navy-900 text-emerald-400' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:bg-white/10 dark:hover:bg-white/10'
            }`}
          >
            {getShortDayName(d).charAt(0)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          De
          <input
            type="time"
            value={props.horaInicio}
            onChange={(e) => props.setHoraInicio(e.target.value)}
            className="mt-1 block rounded-full border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 px-3.5 py-1.5 text-sm font-semibold tabular-nums focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900 dark:text-slate-100"
          />
        </label>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          A
          <input
            type="time"
            value={props.horaFin}
            onChange={(e) => props.setHoraFin(e.target.value)}
            className="mt-1 block rounded-full border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 px-3.5 py-1.5 text-sm font-semibold tabular-nums focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900 dark:text-slate-100"
          />
        </label>
        <div className="flex gap-2 pb-0.5">
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.saving}
            className={`${ICON_BTN} bg-navy-900 text-emerald-400 hover:bg-navy-800 focus:ring-navy-900 disabled:opacity-50`}
            aria-label={props.saveLabel}
            title={props.saveLabel}
          >
            <ActionGlyph d={CHECK_PATH} />
          </button>
          <button
            type="button"
            onClick={props.onCancel}
            className={`${ICON_BTN} border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 focus:ring-slate-300`}
            aria-label="Cancelar"
            title="Cancelar"
          >
            <ActionGlyph d={X_PATH} />
          </button>
        </div>
      </div>
      {props.formError && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium" role="alert">{props.formError}</p>}
    </div>
  );
}

export function FichaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ficha, isLoading, error } = useFicha(id || '');
  const { formato } = useFormatoHora();

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

  const { data: actividades } = useQuery({
    queryKey: ['actividades', id],
    queryFn: () => calificacionesApi.getActividades(id || ''),
    enabled: !!id,
    retry: 1,
  });

  const { data: fichaNotas } = useQuery({
    queryKey: ['ficha-notas', id],
    queryFn: () => calificacionesApi.getFichaNotas(id || ''),
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

  const proximaClaseTexto = useMemo(() => {
    if (!ficha || !clases) return '—';
    const hoy = todayISO();
    const futuras = clases
      .filter((c: { fichaId?: string; ficha_id?: string; fecha: string; hora?: string }) => {
        const fid = c.fichaId ?? c.ficha_id;
        return fid === ficha.id && c.fecha.slice(0, 10) >= hoy;
      })
      .sort((a: { fecha: string; hora?: string }, b: { fecha: string; hora?: string }) =>
        `${a.fecha} ${a.hora ?? ''}`.localeCompare(`${b.fecha} ${b.hora ?? ''}`)
      );
    if (futuras.length === 0) return 'Sin clases pendientes';
    const next = futuras[0];
    const fechaLabel = formatDate(next.fecha, 'short');
    return next.hora ? `${fechaLabel} · ${formatHora(next.hora, formato)}` : fechaLabel;
  }, [clases, ficha, formato]);

  const statsEvaluacion = useMemo(() => {
    const lista = actividades ?? [];
    const raices = lista.filter((a) => !a.parentId);
    const sub = Math.max(0, lista.length - raices.length);
    const pct = raices.reduce((acc, a) => acc + (a.porcentaje || 0), 0);
    return { total: lista.length, raices: raices.length, sub, pct };
  }, [actividades]);

  const statsNotas = useMemo(() => {
    if (!fichaNotas || !ficha) return null;
    const lista = fichaNotas.estudiantes ?? [];
    const conNota = lista.filter((e) => typeof e.notaFinal === 'number');
    if (conNota.length === 0) return { promedio: null, aprobados: 0, total: lista.length };
    const suma = conNota.reduce((acc, e) => acc + (e.notaFinal ?? 0), 0);
    const aprobados = conNota.filter((e) => (e.notaFinal ?? 0) >= ficha.notaMinimaAprobacion).length;
    return {
      promedio: suma / conNota.length,
      aprobados,
      total: lista.length,
    };
  }, [fichaNotas, ficha]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-900 border-t-transparent" />
      </div>
    );
  }

  if (error || !ficha) {
    return (
      <div className="py-12 text-center">
        <p className="text-rose-600 dark:text-rose-400 font-medium">Ficha no encontrada</p>
        <Link to="/fichas" className="mt-4 inline-block text-sm font-semibold text-navy-900 dark:text-emerald-300 hover:underline">
          Volver a la lista
        </Link>
      </div>
    );
  }

  const estado = ficha.archivada ? 'Archivada' : ficha.finalizada ? 'Finalizada' : 'Activa';
  const estadoDot = ficha.archivada ? 'bg-slate-400' : ficha.finalizada ? 'bg-blue-500' : 'bg-emerald-500';
  const trimestre = ficha.trimestre?.trim() || trimestreFallback(ficha.fechaInicio.slice(0, 10));

  const realizadas = Math.max(0, Math.min(ficha.totalClases, ficha.totalClases - clasesRestantes));
  const avancePct = ficha.totalClases > 0 ? Math.round((realizadas / ficha.totalClases) * 100) : 0;

  const minutosSemanales = (ficha.horarios ?? []).reduce((sum, h) => sum + (h.duracionMinutos || 0), 0);
  const intensidadSemanal =
    (ficha.horarios?.length ?? 0) > 0
      ? `${ficha.horarios!.length} sesión(es) · ${formatDuration(minutosSemanales)} / sem`
      : 'Sin sesiones configuradas';

  const acciones = [
    {
      to: `/fichas/${ficha.id}/estudiantes`,
      label: 'Estudiantes',
      desc: 'Lista de aprendices, contacto y estado',
      d: USERS_PATH,
    },
    {
      to: `/fichas/${ficha.id}/actividades`,
      label: 'Actividades',
      desc: 'Creación y seguimiento de evidencias',
      d: CLIPBOARD_PATH,
    },
    {
      to: `/fichas/${ficha.id}/asistencias`,
      label: 'Asistencias',
      desc: 'Registro diario y porcentaje por aprendiz',
      d: CALCHECK_PATH,
    },
    {
      to: `/fichas/${ficha.id}/actividades#calificaciones`,
      label: 'Calificaciones',
      desc: 'Planilla de notas y promedios finales',
      d: CHART_PATH,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          to="/fichas"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-navy-900 dark:hover:text-emerald-300 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Mis Fichas
        </Link>
      </div>

      {/* Mosaico: Izquierda (Información General unificada) — Derecha (Horarios de clase + Módulos de Gestión) */}
      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* Columna izquierda: Información General (unida con cabecera de ficha y datos clave) */}
        <section
          aria-label="Información General"
          className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-white/10 shadow-sm"
        >
          <div className="flex items-center justify-between bg-navy-900 px-5 py-3.5 text-white">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-sm font-semibold tracking-wide text-white">Información General</h2>
            </div>
            <Link
              to={`/fichas/${ficha.id}/editar`}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <ActionGlyph d={PENCIL_PATH} />
              <span>Editar ficha</span>
            </Link>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Identidad principal de la ficha */}
            <div className="space-y-2 border-b border-slate-100 dark:border-white/10 pb-5">
              <div className="flex flex-wrap items-center gap-4 text-[1.15rem] leading-tight">
                <span
                  className={`inline-flex items-center gap-2 font-semibold ${
                    ficha.archivada
                      ? 'text-slate-600 dark:text-slate-400'
                      : ficha.finalizada
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${estadoDot}`} aria-hidden="true" />
                  {estado}
                </span>
                {trimestre && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <svg
                      className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {trimestre}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-baseline gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {ficha.nombre}
                </h1>
                <span className="text-[1.75rem] leading-tight text-slate-400 dark:text-slate-500 font-semibold" aria-hidden="true">
                  -
                </span>
                <span className="text-[1.75rem] leading-tight font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {ficha.codigo}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Iniciada el {formatDate(ficha.fechaInicio, 'long')}
              </p>
            </div>

            {/* Datos detallados de la ficha */}
            <dl className="space-y-3.5">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-2.5">
                <dt className="text-sm text-slate-500 dark:text-slate-400">Estudiantes matriculados</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {estudiantes?.length ?? '—'} aprendices
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-2.5">
                <dt className="text-sm text-slate-500 dark:text-slate-400">Nota mínima aprobatoria</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {ficha.notaMinimaAprobacion.toFixed(1)} / 5.0
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-2.5">
                <dt className="text-sm text-slate-500 dark:text-slate-400">Intensidad horaria</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {intensidadSemanal}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-2.5">
                <dt className="text-sm text-slate-500 dark:text-slate-400">Clases restantes</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {clasesRestantes} de {ficha.totalClases} sesiones
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-2.5">
                <dt className="text-sm text-slate-500 dark:text-slate-400">Próxima clase</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {proximaClaseTexto}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-2.5">
                <dt className="text-sm text-slate-500 dark:text-slate-400">Actividades evaluativas</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {statsEvaluacion.raices} princ. · {statsEvaluacion.sub} sub ({statsEvaluacion.pct.toFixed(0)}%)
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-2.5">
                <dt className="text-sm text-slate-500 dark:text-slate-400">Promedio y aprobados</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {statsNotas && statsNotas.promedio !== null
                    ? `${statsNotas.promedio.toFixed(1)} prom. · ${statsNotas.aprobados}/${statsNotas.total} aprob.`
                    : 'Sin calificaciones'}
                </dd>
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-slate-500 dark:text-slate-400">Progreso de clases</dt>
                  <dd className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {realizadas} / {ficha.totalClases} ({avancePct}%)
                  </dd>
                </div>
                <div
                  className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
                  role="progressbar"
                  aria-valuenow={avancePct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Avance de clases"
                >
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${avancePct}%` }}
                  />
                </div>
              </div>
            </dl>
          </div>
        </section>

        {/* Columna derecha: Horarios de clase + Módulos de Gestión */}
        <div className="space-y-6">
          <HorariosSection
            fichaId={ficha.id}
            fechaInicio={ficha.fechaInicio.slice(0, 10)}
            horarios={ficha.horarios ?? []}
          />

          <section
            aria-label="Módulos de Gestión"
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-white/10 shadow-sm"
          >
            <div className="flex items-center justify-between bg-navy-900 px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                <h2 className="text-sm font-semibold tracking-wide text-white">Módulos de Gestión</h2>
              </div>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              {acciones.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-3 transition-all hover:border-emerald-300 hover:bg-slate-50/70 dark:bg-white/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:ring-offset-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-emerald-400 group-hover:scale-105 transition-transform">
                      <ActionGlyph d={a.d} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-navy-900 dark:group-hover:text-emerald-300">
                        {a.label}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{a.desc}</p>
                    </div>
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
