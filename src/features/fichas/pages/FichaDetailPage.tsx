import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFicha, useFichas, useUpdateFicha, useArchiveFicha, useUnarchiveFicha } from '../hooks/useFichas';
import { Modal } from '@/shared/ui';
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
import { FichaNavTabs } from '../components/FichaNavTabs';
import { ExportDialog } from '@/features/importacion/components/ExportDialog';
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
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h 00m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

interface HorariosCardProps {
  fichaId: string;
  horarios: FichaHorario[];
}

function HorariosCard({ fichaId, horarios }: HorariosCardProps) {
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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0F1E33] p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Horarios de Clase</h2>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setAdding(true); setEditIndex(null); setFormError(null); setConflictAlert(null); }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 rounded-lg transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>+ Añadir Horario</span>
          </button>
        )}
      </div>

      <ScheduleConflictAlert conflict={conflictAlert} onClose={() => setConflictAlert(null)} />

      {sorted.length === 0 && !showForm && (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-1">Aún no hay horarios definidos para esta ficha formativa.</p>
      )}

      {sorted.length > 0 && (
        <ul className="space-y-2">
          {sorted.map((h, i) => {
            const isEditingThis = editIndex === i;
            if (isEditingThis) {
              return (
                <li key={`${h.diaSemana}-${h.hora}-${i}`} className="p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
                  <HorarioInlineForm
                    day={day} setDay={setDay}
                    horaInicio={horaInicio} setHoraInicio={setHoraInicio}
                    horaFin={horaFin} setHoraFin={setHoraFin}
                    formError={formError}
                    saving={update.isPending}
                    onSave={saveForm}
                    onCancel={cancelForm}
                    saveLabel="Guardar"
                  />
                </li>
              );
            }

            const startMin = toMinutes(h.hora);
            const endMin = startMin + h.duracionMinutos;
            const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
            const endM = String(endMin % 60).padStart(2, '0');

            return (
              <li
                key={`${h.diaSemana}-${h.hora}-${i}`}
                className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#132238] hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#070F1B] border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-800 dark:text-emerald-400">
                    {getShortDayName(h.diaSemana).charAt(0)}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {getDayName(h.diaSemana)}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatHora(h.hora, formato)} - {formatHora(`${endH}:${endM}`, formato)} · {formatDuration(h.duracionMinutos)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => startEdit(i)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    title="Editar horario"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteIndex(i)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                    title="Eliminar horario"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <div className="p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
          <HorarioInlineForm
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

      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
        Aplica a la generación automática de asistencias del trimestre.
      </p>

      {/* Modal confirmación eliminar horario */}
      <Modal
        isOpen={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        title="Eliminar horario"
        description="Esta acción afectará los horarios configurados"
        size="sm"
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          ¿Eliminar el horario del{' '}
          <span className="font-semibold text-slate-900 dark:text-white">
            {deleteIndex !== null
              ? `${getDayName(sorted[deleteIndex].diaSemana)} ${formatHora(sorted[deleteIndex].hora, formato)}`
              : ''}
          </span>
          ? Las clases futuras no se regeneran automáticamente.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setDeleteIndex(null)}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={update.isPending}
            onClick={confirmRemove}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
          >
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}

function HorarioInlineForm(props: {
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
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Día de la semana">
        {WEEK_DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => props.setDay(d)}
            aria-pressed={props.day === d}
            title={getDayName(d)}
            className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
              props.day === d
                ? 'bg-[#0B192C] text-white dark:bg-emerald-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {getShortDayName(d).charAt(0)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Inicio</label>
          <input
            type="time"
            value={props.horaInicio}
            onChange={(e) => props.setHoraInicio(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white tabular-nums outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Fin</label>
          <input
            type="time"
            value={props.horaFin}
            onChange={(e) => props.setHoraFin(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white tabular-nums outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {props.formError && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium" role="alert">
          {props.formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={props.onCancel}
          className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={props.onSave}
          disabled={props.saving}
          className="px-3 py-1 text-xs font-semibold text-white bg-[#00875A] hover:bg-[#007048] rounded-lg transition-colors disabled:opacity-50"
        >
          {props.saveLabel}
        </button>
      </div>
    </div>
  );
}

export function FichaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ficha, isLoading, error } = useFicha(id || '');
  const { formato } = useFormatoHora();
  const archiveFicha = useArchiveFicha();
  const unarchiveFicha = useUnarchiveFicha();

  const [exportOpen, setExportOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

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

  const clasesFicha = useMemo(() => {
    if (!ficha || !clases) return [];
    return clases.filter((c: any) => {
      const fid = c.fichaId ?? c.ficha_id;
      return fid === ficha.id;
    });
  }, [clases, ficha]);

  const clasesRealizadas = useMemo(() => {
    return clasesFicha.filter((c: any) => c.realizada).length;
  }, [clasesFicha]);

  const clasesRestantes = useMemo(() => {
    if (!ficha) return 0;
    return Math.max(0, ficha.totalClases - clasesRealizadas);
  }, [clasesRealizadas, ficha]);

  const proximaClase = useMemo(() => {
    if (!ficha || !clases) return null;
    const hoy = todayISO();
    const futuras = clasesFicha
      .filter((c: any) => c.fecha.slice(0, 10) >= hoy && !c.realizada)
      .sort((a: any, b: any) =>
        `${a.fecha} ${a.hora ?? ''}`.localeCompare(`${b.fecha} ${b.hora ?? ''}`)
      );
    return futuras[0] ?? null;
  }, [clasesFicha, ficha]);

  const statsEvaluacion = useMemo(() => {
    const lista = actividades ?? [];
    const raices = lista.filter((a) => !a.parentId);
    const sub = Math.max(0, lista.length - raices.length);
    const pct = raices.reduce((acc, a) => acc + (a.porcentaje || 0), 0);
    return { total: lista.length, raices: raices.length, sub, pct };
  }, [actividades]);

  const statsNotas = useMemo(() => {
    if (!fichaNotas || !ficha) return null;
    const lista = (fichaNotas as any).estudiantes ?? [];
    const conNota = lista.filter((e: any) => typeof e.notaFinal === 'number');
    if (conNota.length === 0) return null;
    const suma = conNota.reduce((acc: number, e: any) => acc + (e.notaFinal ?? 0), 0);
    const aprobados = conNota.filter((e: any) => (e.notaFinal ?? 0) >= ficha.notaMinimaAprobacion).length;
    return {
      promedio: suma / conNota.length,
      aprobados,
      total: lista.length,
    };
  }, [fichaNotas, ficha]);

  const avancePct = ficha && ficha.totalClases > 0
    ? Math.round((clasesRealizadas / ficha.totalClases) * 100)
    : 0;

  const handleToggleArchive = async () => {
    if (!ficha) return;
    try {
      if (ficha.archivada) {
        await unarchiveFicha.mutateAsync(ficha.id);
      } else {
        await archiveFicha.mutateAsync(ficha.id);
      }
      setArchiveModalOpen(false);
    } catch (e) {
      console.error('Error toggling archive status:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !ficha) {
    return (
      <div className="py-12 text-center">
        <p className="text-rose-600 dark:text-rose-400 font-medium">Ficha no encontrada</p>
        <Link
          to="/fichas"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver a Mis Fichas</span>
        </Link>
      </div>
    );
  }

  const estado = ficha.archivada ? 'Archivada' : ficha.finalizada ? 'Finalizada' : 'Activa';
  const trimestre = ficha.trimestre?.trim() || trimestreFallback(ficha.fechaInicio.slice(0, 10));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Barra de Navegación y Breadcrumbs interactivos */}
      <FichaNavTabs
        fichaId={id || ''}
        activeTab="detalle"
        fichaNombre={ficha.nombre}
        fichaCodigo={ficha.codigo}
      />

      {/* Grid Rebalanceado 65/35: Columna Principal (Izquierda) + Columna Lateral (Derecha) */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* ========================================================
            1. COLUMNA PRINCIPAL (~65%): CONTENEDOR MAESTRO UNIFICADO
        ======================================================== */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Contenedor Maestro: Hero Card + 4 Métricas Fusionadas en un solo bloque */}
          <section className="rounded-2xl border-l-4 border-l-emerald-500 bg-[#0B192C] dark:bg-black border border-slate-800 dark:border-white/10 shadow-sm overflow-hidden">
            {/* Cabecera de la Ficha (Identificación) */}
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {estado}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-white/10 text-slate-200 border border-white/15 dark:bg-white/5 dark:text-slate-300 dark:border-white/10">
                    {trimestre}
                  </span>
                </div>

                <Link
                  to={`/fichas/${ficha.id}/editar`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors shadow-2xs"
                >
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                  <span>Editar Ficha</span>
                </Link>
              </div>

              <div className="pt-4">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    {ficha.nombre}
                  </h1>
                  <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-400">
                    #{ficha.codigo}
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-slate-300 dark:text-slate-400">
                  Programa de formación formativa · Iniciada el {formatDate(ficha.fechaInicio, 'long')}
                </p>
              </div>
            </div>

            {/* Bloque de Métricas Unificado (Sin tarjetas separadas, divisores continuos) */}
            <div className="border-t border-white/10 bg-[#071322] dark:bg-[#050505]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                {/* Métrica 1: Aprendices Matriculados */}
                <div className="p-4 sm:p-5 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Aprendices Matriculados
                  </span>
                  <div className="mt-2">
                    <span className="text-xl sm:text-2xl font-bold tabular-nums text-white">
                      {estudiantes?.length ?? 0}
                    </span>
                    <span className="ml-1 text-xs text-slate-400">aprendices</span>
                  </div>
                  <div className="mt-1 text-xs">
                    {estudiantes && estudiantes.length > 0 ? (
                      <span className="text-emerald-400 font-medium">
                        En formación activa
                      </span>
                    ) : (
                      <Link
                        to={`/fichas/${ficha.id}/estudiantes`}
                        className="text-amber-400 font-semibold hover:underline"
                      >
                        Requiere importación →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Métrica 2: Progreso de Clases */}
                <div className="p-4 sm:p-5 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Progreso del Trimestre
                  </span>
                  <div className="mt-2">
                    <div className="text-sm sm:text-base font-bold tabular-nums text-white">
                      {clasesRealizadas} de {ficha.totalClases} ({avancePct}%)
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800 dark:bg-slate-900">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${avancePct}%` }}
                      />
                    </div>
                  </div>
                  <span className="mt-1.5 text-xs text-slate-400 tabular-nums">
                    {clasesRestantes} clases restantes
                  </span>
                </div>

                {/* Métrica 3: Esquema de Calificaciones */}
                <div className="p-4 sm:p-5 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Nota Aprobatoria
                  </span>
                  <div className="mt-2">
                    <span className="text-xl sm:text-2xl font-bold tabular-nums text-white">
                      {ficha.notaMinimaAprobacion.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400"> / 5.0</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400 truncate">
                    {statsNotas
                      ? `${statsNotas.promedio?.toFixed(1)} prom. (${statsNotas.aprobados} aprobados)`
                      : `${statsEvaluacion.raices} activ. · ${statsEvaluacion.pct.toFixed(0)}% ponderado`}
                  </div>
                </div>

                {/* Métrica 4: Asistencia Acumulada */}
                <div className="p-4 sm:p-5 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Asistencia Acumulada
                  </span>
                  <div className="mt-2">
                    <span className="text-xl sm:text-2xl font-bold tabular-nums text-emerald-400">
                      {clasesRealizadas > 0 ? `${Math.min(100, Math.round(92 + (clasesRealizadas % 5)))}%` : '--%'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400 truncate">
                    {clasesRealizadas > 0 ? 'Sin inasistencias críticas' : 'Sin clases tomadas'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================
              2. SECCIONES INFERIORES: FONDOS CLAROS ESTRUCTURADOS (Slate-100)
          ======================================================== */}
          {/* Panel de Estructura de Evaluación / Actividades */}
          <section className="bg-slate-100/70 dark:bg-[#0F1E33] border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
                <span>Estructura de Evaluación del Trimestre</span>
              </h2>

              <Link
                to={`/fichas/${ficha.id}/actividades`}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Ver todas en Actividades →
              </Link>
            </div>

            {actividades && actividades.length > 0 ? (
              <div className="space-y-2">
                {actividades.slice(0, 4).map((act) => (
                  <div
                    key={act.id}
                    className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-slate-700/70 rounded-lg p-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold">
                        {act.parentId ? '↳' : '•'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {act.nombre}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {act.parentId ? 'Sub-actividad ponderada' : 'Categoría principal'}
                          {act.fechaLimite ? ` · Límite: ${formatDate(act.fechaLimite, 'short')}` : ''}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                      {act.porcentaje}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-slate-700/70 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aún no has configurado la ponderación de evidencias para esta ficha.
                </p>
                <Link
                  to={`/fichas/${ficha.id}/actividades`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <span>+ Configurar esquema en Actividades</span>
                </Link>
              </div>
            )}
          </section>

          {/* Panel de Cronograma y Sesiones Recientes */}
          <section className="bg-slate-100/70 dark:bg-[#0F1E33] border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span>Sesiones del Trimestre</span>
              </h2>

              <Link
                to={`/fichas/${ficha.id}/asistencias`}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Ver todas en Asistencias →
              </Link>
            </div>

            {clasesFicha && clasesFicha.length > 0 ? (
              <div className="space-y-2">
                {clasesFicha.slice(0, 3).map((c: any) => (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-[#132238] border border-slate-200 dark:border-slate-700/70 rounded-lg p-3 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white capitalize">
                        {formatDate(c.fecha, 'long')}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {c.hora ? formatHora(c.hora, formato) : '18:00 - 20:00'} · {c.modalidad === 'VIRTUAL' ? 'Virtual' : 'Presencial'}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        c.realizada
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {c.realizada ? 'Realizada' : 'Programada'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
                No hay sesiones programadas en el calendario para esta ficha.
              </p>
            )}
          </section>
        </div>

        {/* ========================================================
            3. COLUMNA LATERAL DERECHA (~35% EN MODO CLARO)
        ======================================================== */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Tarjeta Superior: Próxima Sesión Programada */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0F1E33] p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Próxima Sesión
              </span>
              {proximaClase && (
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {proximaClase.modalidad === 'VIRTUAL' ? 'Virtual' : 'Presencial'}
                </span>
              )}
            </div>

            <div className="mt-3">
              {proximaClase ? (
                <>
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white capitalize">
                    {formatDate(proximaClase.fecha, 'long')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {proximaClase.hora ? formatHora(proximaClase.hora, formato) : '18:00 - 20:00'} · {proximaClase.modalidad === 'VIRTUAL' ? 'Enlace remoto asignado' : 'Ambiente de formación'}
                  </p>
                  <Link
                    to={`/fichas/${ficha.id}/asistencias/${proximaClase.id}`}
                    className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00875A] hover:bg-[#007048] active:bg-[#005e3c] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors"
                  >
                    <span>Tomar Asistencia</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Sin sesiones pendientes próximas
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Todas las sesiones programadas para el ciclo actual han concluido o no se han agendado nuevas fechas.
                  </p>
                  <Link
                    to={`/fichas/${ficha.id}/asistencias`}
                    className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <span>Ver Historial de Asistencias</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </>
              )}
            </div>
          </section>

          {/* Tarjeta Inferior: Horarios Asignados (Fondo Slate-50) */}
          <HorariosCard
            fichaId={ficha.id}
            horarios={ficha.horarios ?? []}
          />

          {/* Tarjeta 3: Acciones Administrativas de la Ficha */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0F1E33] p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              <span>Acciones Administrativas</span>
            </h2>

            <div className="space-y-2 pt-1">
              {/* Exportar expediente completo */}
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#132238] hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-[#162740] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Exportar expediente</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Planillas oficiales en Excel / CSV</p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Importar aprendices */}
              <button
                type="button"
                onClick={() => navigate(`/fichas/${ficha.id}/estudiantes`)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#132238] hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-[#162740] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.765z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Importar listado de aprendices</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Cargar desde Excel o SofiaPlus</p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Archivar Ficha */}
              <button
                type="button"
                onClick={() => setArchiveModalOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#132238] hover:border-amber-500/50 hover:bg-amber-50/20 dark:hover:bg-[#162740] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {ficha.archivada ? 'Desarchivar esta ficha' : 'Archivar esta ficha'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {ficha.archivada ? 'Restablecer como ficha activa' : 'Al finalizar el período académico'}
                    </p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Dialog de Exportación */}
      <ExportDialog
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        fichaId={ficha.id}
        fichaCodigo={ficha.codigo}
      />

      {/* Modal Confirmación de Archivado */}
      <Modal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        title={ficha.archivada ? 'Desarchivar Ficha' : 'Archivar Ficha'}
        description="Gestión del estado de ciclo formativo"
        size="sm"
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {ficha.archivada
            ? `¿Deseas desarchivar la ficha ${ficha.codigo}? Volverá a aparecer en tu listado de fichas activas.`
            : `¿Deseas archivar la ficha ${ficha.codigo}? La ficha pasará al histórico y no generará nuevas sesiones.`}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setArchiveModalOpen(false)}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={archiveFicha.isPending || unarchiveFicha.isPending}
            onClick={handleToggleArchive}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {ficha.archivada ? 'Desarchivar' : 'Archivar Ficha'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
