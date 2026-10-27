import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/shared/ui';
import { useClase, useAsistencias, useSaveAsistencias, useUpdateClase } from '../hooks/useAsistencias';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { useEstudiantes, useCreateEstudiante } from '../../estudiantes/hooks/useEstudiantes';
import { FichaNavTabs } from '@/features/fichas/components/FichaNavTabs';
import { JustificacionModal } from '../components/AsistenciaComponents';
import { formatDate, claseHorarioLabel } from '@/shared/utils/helpers';
import { downloadCSV, downloadXLSX } from '@/features/importacion/lib/export';
import { TIPOS_IDENTIFICACION, estudianteSchema, type EstudianteFormData } from '../../estudiantes/types';
import type { AsistenciaFormData } from '../types';

type Estado = 'ASISTIO' | 'NO_ASISTIO';
type FiltroAsistencia = 'todas' | Estado;
type FiltroJustificacion = 'todas' | 'con' | 'sin';
type FiltroTipoDocumento = 'todas' | string;

/** Encabezado con manija para redimensionar la columna arrastrando. */
function ThAjustable({ k, className, anchos, onResize, children }: {
  k: string;
  className?: string;
  anchos: Record<string, number>;
  onResize: (clave: string, anchoActual: number, e: ReactMouseEvent<HTMLSpanElement>) => void;
  children: ReactNode;
}) {
  return (
    <th
      style={anchos[k] ? { width: anchos[k] } : undefined}
      className={`relative ${className ?? ''}`}
    >
      {children}
      <span
        onMouseDown={(e) => onResize(k, (e.currentTarget.parentElement as HTMLElement).offsetWidth, e)}
        className="absolute right-0 top-0 flex h-full w-3 cursor-col-resize touch-none items-center justify-center opacity-30 hover:opacity-100 transition-opacity"
        title="Arrastrar para cambiar el ancho"
      >
        <span className="h-1/2 w-px bg-slate-400" aria-hidden="true" />
      </span>
    </th>
  );
}

interface ModalCrearAprendizProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EstudianteFormData) => Promise<void>;
  isLoading: boolean;
}

function ModalCrearAprendiz({ isOpen, onClose, onSubmit, isLoading }: ModalCrearAprendizProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EstudianteFormData>({
    resolver: zodResolver(estudianteSchema),
    defaultValues: {
      nombre: '',
      tipoIdentificacion: 'CC',
      identificacion: '',
      email: '',
      contacto: '',
    },
  });

  const handleFormSubmit = async (data: EstudianteFormData) => {
    await onSubmit(data);
    reset();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      hideCloseButton
      headerClassName="p-0 border-0"
    >
      <div className="-m-5 sm:-m-6">
        {/* Cabecera Unificada en Azul Marino Profundo */}
        <div className="bg-[#0B192C] text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-white">
              Añadir Aprendiz a la Sesión
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Registra un nuevo aprendiz y marca su asistencia de hoy.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Cerrar modal"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Campos del Formulario */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4 bg-white dark:bg-[#0B192C]">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
              Nombre Completo
            </label>
            <input
              type="text"
              placeholder="Ej. Juan David Gómez"
              className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              {...register('nombre')}
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.nombre.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                Tipo de Documento
              </label>
              <select
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                {...register('tipoIdentificacion')}
              >
                {TIPOS_IDENTIFICACION.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
              {errors.tipoIdentificacion && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.tipoIdentificacion.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                Identificación
              </label>
              <input
                type="text"
                placeholder="1098765432"
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                {...register('identificacion')}
              />
              {errors.identificacion && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.identificacion.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
              Correo Electrónico <span className="text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <input
              type="email"
              placeholder="aprendiz@sena.edu.co"
              className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
              Teléfono / Contacto <span className="text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="300 123 4567"
              className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              {...register('contacto')}
            />
            {errors.contacto && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.contacto.message}</p>
            )}
          </div>

          {/* Footer del Modal */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 -mx-6 -mb-6 px-6 py-4 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#00875A] hover:bg-[#007048] active:bg-[#005e3c] rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isLoading && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              <span>Registrar y Asistir</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function MarcarAsistenciasPage() {
  const { claseId } = useParams<{ claseId: string }>();
  const navigate = useNavigate();

  const { data: clase, isLoading: loadingClase, error: errorClase } = useClase(claseId || '');
  const { formato } = useFormatoHora();
  const { data: estudiantes, isLoading: loadingEstudiantes } = useEstudiantes(clase?.fichaId || '');
  const { data: asistenciasPrevias } = useAsistencias(claseId || '');
  const saveAsistencias = useSaveAsistencias();
  const updateClase = useUpdateClase();
  const createEstudiante = useCreateEstudiante(clase?.fichaId || '');
  const [preguntarRealizada, setPreguntarRealizada] = useState(false);
  const [modalNuevoEstudiante, setModalNuevoEstudiante] = useState(false);
  const initializedRef = useRef(false);

  function hoyLocal(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  const [marcas, setMarcas] = useState<Record<string, AsistenciaFormData>>({});
  const [justificando, setJustificando] = useState<{ id: string; nombre: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAsistencia, setFiltroAsistencia] = useState<FiltroAsistencia>('todas');
  const [filtroJustificacion, setFiltroJustificacion] = useState<FiltroJustificacion>('todas');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoDocumento>('todas');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [anchosCol, setAnchosCol] = useState<Record<string, number>>({});
  const [redimensionando, setRedimensionando] = useState(false);
  const resizeRef = useRef<{ clave: string; inicioX: number; anchoInicial: number } | null>(null);

  useEffect(() => {
    if (!estudiantes) return;
    setMarcas((prev) => {
      const next: Record<string, AsistenciaFormData> = {};
      const yaInicializado = initializedRef.current;
      estudiantes.forEach((est) => {
        const existente = prev[est.id];
        if (yaInicializado && existente) {
          next[est.id] = existente;
        } else {
          const previa = asistenciasPrevias?.find((a) => a.estudianteId === est.id);
          next[est.id] = {
            estudianteId: est.id,
            estado: previa?.estado || 'ASISTIO',
            justificacion: previa?.justificacion || '',
          };
        }
      });
      return next;
    });
    if (estudiantes && asistenciasPrevias !== undefined) {
      initializedRef.current = true;
    }
  }, [estudiantes, asistenciasPrevias]);

  const handleCrearEstudiante = async (data: EstudianteFormData) => {
    try {
      const nuevo = await createEstudiante.mutateAsync(data);
      setMarcas((prev) => ({
        ...prev,
        [nuevo.id]: {
          estudianteId: nuevo.id,
          estado: 'ASISTIO',
          justificacion: '',
        },
      }));
      setModalNuevoEstudiante(false);
      setSaved(false);
    } catch (err) {
      console.error('Error al registrar estudiante:', err);
    }
  };

  const counts = useMemo(() => {
    const lista = Object.values(marcas);
    return {
      total: lista.length,
      asistieron: lista.filter((m) => m.estado === 'ASISTIO').length,
      faltaron: lista.filter((m) => m.estado === 'NO_ASISTIO').length,
    };
  }, [marcas]);

  const hayFiltros = busqueda.trim() !== '' || filtroAsistencia !== 'todas' || filtroJustificacion !== 'todas' || filtroTipo !== 'todas';

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (estudiantes || []).filter((est) => {
      if (q && !est.nombre.toLowerCase().includes(q) && !est.identificacion.toLowerCase().includes(q)) return false;
      const marca = marcas[est.id];
      if (filtroAsistencia !== 'todas' && (marca?.estado ?? 'ASISTIO') !== filtroAsistencia) return false;
      const tieneJ = !!(marca?.justificacion?.trim());
      if (filtroJustificacion === 'con' && !tieneJ) return false;
      if (filtroJustificacion === 'sin' && tieneJ) return false;
      if (filtroTipo !== 'todas' && (est.tipoIdentificacion || 'CC') !== filtroTipo) return false;
      return true;
    });
  }, [estudiantes, marcas, busqueda, filtroAsistencia, filtroJustificacion, filtroTipo]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroAsistencia('todas');
    setFiltroJustificacion('todas');
    setFiltroTipo('todas');
  };

  const handleMarcarTodosPresentes = () => {
    setSaved(false);
    setMarcas((prev) => {
      const next = { ...prev };
      visibles.forEach((est) => {
        next[est.id] = {
          ...(next[est.id] || { estudianteId: est.id, justificacion: '' }),
          estado: 'ASISTIO',
        };
      });
      return next;
    });
  };

  const iniciarResize = (clave: string, anchoActual: number, e: ReactMouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    resizeRef.current = { clave, inicioX: e.clientX, anchoInicial: anchoActual };
    setRedimensionando(true);
    const mover = (ev: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const w = Math.max(60, Math.round(r.anchoInicial + (ev.clientX - r.inicioX)));
      setAnchosCol((prev) => ({ ...prev, [r.clave]: w }));
    };
    const terminar = () => {
      resizeRef.current = null;
      setRedimensionando(false);
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', terminar);
    };
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', terminar);
  };

  const setEstado = (estudianteId: string, estado: Estado) => {
    setSaved(false);
    setMarcas((prev) => ({
      ...prev,
      [estudianteId]: { ...prev[estudianteId], estado },
    }));
  };

  const handleSave = () => {
    if (!claseId) return;
    saveAsistencias.mutate(
      { claseId, asistencias: Object.values(marcas) },
      {
        onSuccess: () => {
          setSaved(true);
          if (clase && !clase.realizada && clase.fecha > hoyLocal()) {
            setPreguntarRealizada(true);
          }
        },
      }
    );
  };

  const handleMarcarRealizada = () => {
    if (!claseId || !clase) return;
    updateClase.mutate(
      { claseId, data: { modalidad: clase.modalidad, realizada: true } },
      { onSuccess: () => setPreguntarRealizada(false) },
    );
  };

  const handleExport = async (formatoExport: 'csv' | 'xlsx') => {
    if (!estudiantes || !clase) return;
    const headers = ['Nombre', 'Identificación', 'Estado', 'Justificación'];
    const rows = estudiantes.map((est) => {
      const m = marcas[est.id];
      return [
        est.nombre,
        est.identificacion,
        m?.estado === 'NO_ASISTIO' ? 'No asistió' : 'Asistió',
        m?.justificacion ?? '',
      ];
    });
    const base = `asistencias-${clase.fecha}`;
    if (formatoExport === 'csv') downloadCSV(`${base}.csv`, headers, rows);
    else await downloadXLSX(`${base}.xlsx`, headers, rows);
    setExportOpen(false);
  };

  if (loadingClase || loadingEstudiantes) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (errorClase || !clase) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-600 dark:text-rose-400 font-medium">No se pudo cargar la clase</p>
        <Link
          to="/calendario"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver al calendario</span>
        </Link>
      </div>
    );
  }

  const fichaNombre = clase.ficha?.nombre || 'Ficha';
  const fichaCodigo = clase.ficha?.codigo || '';
  const esHoy = clase.fecha.slice(0, 10) === hoyLocal();
  const estadoClase = clase.realizada ? 'Realizada' : esHoy ? 'En curso' : 'Pendiente de cierre';

  return (
    <div className="space-y-6">
      {/* Pestañas de la Ficha si está asociada */}
      {clase.fichaId && (
        <FichaNavTabs
          fichaId={clase.fichaId}
          activeTab="asistencias"
          fichaNombre={fichaNombre}
          fichaCodigo={fichaCodigo}
        />
      )}

      {/* ========================================================
          1. CABECERA INTEGRADA Y RETORNO UNIFICADO
      ======================================================== */}
      <div>
        {/* Botón único de retorno */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => (clase.fichaId ? navigate(`/fichas/${clase.fichaId}/asistencias`) : navigate(-1))}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors"
          >
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Volver a Sesiones</span>
          </button>
        </div>

        {/* Barra de Título Plano de la Sesión */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight capitalize">
                {formatDate(clase.fecha, 'long')}
              </h1>
              {fichaCodigo && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80">
                  {fichaNombre} #{fichaCodigo}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Registro oficial de asistencia presencial y seguimiento de aprendices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Horario de la sesión */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{claseHorarioLabel(clase, formato)}</span>
            </div>

            {/* Badge de estado de la sesión */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                clase.realizada
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : esHoy
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  clase.realizada ? 'bg-emerald-500' : esHoy ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{estadoClase}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. BARRA DE CONTROL OPERATIVO Y KPIS EN TIEMPO REAL
      ======================================================== */}
      <div className="bg-white dark:bg-[#0F1E33] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-xs">
        {/* Lado izquierdo: Resumen en vivo */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <span className="text-slate-400 uppercase tracking-wider text-[11px]">Total:</span>
            <span className="tabular-nums text-sm font-bold text-slate-900 dark:text-white">
              {counts.total} aprendices
            </span>
          </div>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">|</span>
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span className="tabular-nums text-sm font-bold">{counts.asistieron}</span>
            <span>Asistieron</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">|</span>
          <div className={`flex items-center gap-1.5 font-semibold ${
            counts.faltaron > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
          }`}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="tabular-nums text-sm font-bold">{counts.faltaron}</span>
            <span>Inasistencias</span>
          </div>
        </div>

        {/* Lado derecho: Acciones y Búsqueda */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Buscador de aprendices */}
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar aprendiz..."
              className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs pl-9 pr-3 py-2 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none w-44 sm:w-52 transition-all"
            />
          </div>

          {/* Botón Filtros */}
          <button
            type="button"
            onClick={() => setFiltrosAbiertos(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
          >
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span>Filtros</span>
            {hayFiltros && (
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* Botón Añadir Aprendiz */}
          <button
            type="button"
            onClick={() => setModalNuevoEstudiante(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-slate-800 dark:hover:border-slate-400 rounded-lg transition-colors focus:outline-none"
          >
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.765z" />
            </svg>
            <span>+ Añadir Aprendiz</span>
          </button>

          {/* Acción en Lote: Marcar todos presentes */}
          <button
            type="button"
            onClick={handleMarcarTodosPresentes}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors focus:outline-none"
            title="Marcar a todos los aprendices visibles como asistentes"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Marcar todos presentes</span>
          </button>
        </div>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Asistencias guardadas correctamente en el sistema.</span>
        </div>
      )}

      {/* ========================================================
          3. TABLA DE ASISTENCIAS REDISEÑADA
      ======================================================== */}
      <div className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1E33] shadow-xs ${redimensionando ? 'select-none' : ''}`}>
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="bg-[#0B192C] text-emerald-400 text-left border-b border-[#172a45]">
              <ThAjustable k="fila" className="w-12 px-3 py-3 text-center text-xs font-semibold" anchos={anchosCol} onResize={iniciarResize}>
                <span>#</span>
              </ThAjustable>
              <ThAjustable k="nombre" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-emerald-400" anchos={anchosCol} onResize={iniciarResize}>
                Aprendiz / Documento
              </ThAjustable>
              <ThAjustable k="asistencia" className="w-48 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-emerald-400" anchos={anchosCol} onResize={iniciarResize}>
                Estado de Asistencia
              </ThAjustable>
              <ThAjustable k="justificacion" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-emerald-400" anchos={anchosCol} onResize={iniciarResize}>
                Justificación / Observación
              </ThAjustable>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {visibles.map((est, i) => {
              const marca = marcas[est.id];
              if (!marca) return null;
              const asistio = marca.estado === 'ASISTIO';
              const tieneJustificacion = !!(marca.justificacion && marca.justificacion.trim());

              return (
                <tr
                  key={est.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* # Conteo */}
                  <td className="px-3 py-2 text-center text-xs font-mono text-slate-400">
                    {i + 1}
                  </td>

                  {/* Aprendiz / Documento */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                          {est.nombre}
                        </p>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {est.tipoIdentificacion || 'CC'} · {est.identificacion}
                        </p>
                      </div>

                      {est.totalFallas && est.totalFallas > 3 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-rose-100 dark:bg-rose-950/50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/50"
                          title={`Alerta de deserción: ${est.totalFallas} inasistencias acumuladas`}
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>{est.totalFallas} fallas</span>
                        </span>
                      ) : est.totalFallas === 3 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50"
                          title="Límite preventivo: 3 fallas acumuladas"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>3 fallas</span>
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Estado de Asistencia (Toggle Segmentado Compacto) */}
                  <td className="px-4 py-2">
                    <div
                      className="inline-flex rounded-md border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-2xs"
                      role="group"
                      aria-label={`Asistencia de ${est.nombre}`}
                    >
                      <button
                        type="button"
                        onClick={() => setEstado(est.id, 'ASISTIO')}
                        aria-pressed={asistio}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium leading-none transition-all ${
                          asistio
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                        }`}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span>Asistió</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstado(est.id, 'NO_ASISTIO')}
                        aria-pressed={!asistio}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium leading-none transition-all ${
                          !asistio
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                        }`}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>No asistió</span>
                      </button>
                    </div>
                  </td>

                  {/* Justificación / Observación */}
                  <td className="px-4 py-2">
                    {!asistio ? (
                      tieneJustificacion ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setJustificando({ id: est.id, nombre: est.nombre })}
                            className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors max-w-[200px]"
                            title={marca.justificacion}
                          >
                            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <span className="truncate">{marca.justificacion}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setJustificando({ id: est.id, nombre: est.nombre })}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
                            title="Editar observación"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setJustificando({ id: est.id, nombre: est.nombre })}
                          className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          <span>+ Justificar</span>
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-600 select-none">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(estudiantes || []).length === 0 && (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay aprendices registrados en esta ficha aún.</p>
            <button
              type="button"
              onClick={() => setModalNuevoEstudiante(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#00875A] hover:bg-[#007048] rounded-lg transition-colors"
            >
              + Añadir primer aprendiz
            </button>
          </div>
        )}

        {(estudiantes || []).length > 0 && visibles.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Sin resultados para la búsqueda o filtros aplicados</p>
            <button
              type="button"
              onClick={limpiarFiltros}
              className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Restablecer búsqueda y filtros
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          PIE DE ACCIONES
      ======================================================== */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            disabled={(estudiantes || []).length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Exportar Acta (PDF/Excel)</span>
          </button>

          {exportOpen && (
            <div className="absolute bottom-12 right-0 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1E33] shadow-xl animate-scale-in">
              <button
                type="button"
                onClick={() => handleExport('xlsx')}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <span>Descargar Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
              >
                <span>Descargar CSV (.csv)</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saveAsistencias.isPending}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold shadow-xs bg-[#00875A] hover:bg-[#007048] active:bg-[#005e3c] text-white transition-colors disabled:opacity-50"
        >
          {saveAsistencias.isPending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          <span>Guardar Asistencias</span>
        </button>
      </div>

      {/* ========================================================
          4. MODAL DE FILTROS REDISEÑADO
      ======================================================== */}
      <Modal
        isOpen={filtrosAbiertos}
        onClose={() => setFiltrosAbiertos(false)}
        size="md"
        hideCloseButton
        headerClassName="p-0 border-0"
      >
        <div className="-m-5 sm:-m-6">
          {/* Cabecera del modal */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4.5 bg-[#0B192C] text-white">
            <h2 className="text-base font-semibold text-emerald-400 tracking-tight">
              Filtrar Asistencias
            </h2>
            <button
              type="button"
              onClick={() => setFiltrosAbiertos(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-5 bg-white dark:bg-[#0B192C]">
            {/* Tipo de Documento */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Tipo de Documento
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo de documento">
                <button
                  type="button"
                  onClick={() => setFiltroTipo('todas')}
                  aria-pressed={filtroTipo === 'todas'}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    filtroTipo === 'todas'
                      ? 'bg-[#0B192C] dark:bg-emerald-600 text-white font-medium'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Todos
                </button>
                {TIPOS_IDENTIFICACION.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => setFiltroTipo(t.valor)}
                    aria-pressed={filtroTipo === t.valor}
                    title={t.etiqueta}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      filtroTipo === t.valor
                        ? 'bg-[#0B192C] dark:bg-emerald-600 text-white font-medium'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t.valor}
                  </button>
                ))}
              </div>
            </div>

            {/* Estado de Asistencia */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Estado de Asistencia
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-900 w-full" role="group">
                {([
                  { valor: 'todas', etiqueta: 'Todos' },
                  { valor: 'ASISTIO', etiqueta: 'Asistieron' },
                  { valor: 'NO_ASISTIO', etiqueta: 'No asistieron' },
                ] as const).map((op) => (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => setFiltroAsistencia(op.valor)}
                    aria-pressed={filtroAsistencia === op.valor}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      filtroAsistencia === op.valor
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {op.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {/* Justificación */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Justificación
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-900 w-full" role="group">
                {([
                  { valor: 'todas', etiqueta: 'Todas' },
                  { valor: 'con', etiqueta: 'Con justificación' },
                  { valor: 'sin', etiqueta: 'Sin justificación' },
                ] as const).map((op) => (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => setFiltroJustificacion(op.valor)}
                    aria-pressed={filtroJustificacion === op.valor}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      filtroJustificacion === op.valor
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {op.etiqueta}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer del Modal */}
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Restablecer filtros
            </button>
            <button
              type="button"
              onClick={() => setFiltrosAbiertos(false)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#00875A] hover:bg-[#007048] rounded-lg shadow-xs transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Justificación de Inasistencia */}
      <JustificacionModal
        isOpen={!!justificando}
        estudianteNombre={justificando?.nombre || ''}
        initialValue={justificando ? marcas[justificando.id]?.justificacion || '' : ''}
        onClose={() => setJustificando(null)}
        onSave={(justificacion) => {
          if (!justificando) return;
          setSaved(false);
          setMarcas((prev) => ({
            ...prev,
            [justificando.id]: { ...prev[justificando.id], justificacion },
          }));
        }}
      />

      {/* ========================================================
          5. MODAL DE AÑADIR APRENDIZ REDISEÑADO
      ======================================================== */}
      <ModalCrearAprendiz
        isOpen={modalNuevoEstudiante}
        onClose={() => setModalNuevoEstudiante(false)}
        onSubmit={handleCrearEstudiante}
        isLoading={createEstudiante.isPending}
      />

      {/* Modal Pregunta si marcar realizada la sesión */}
      <Modal
        isOpen={preguntarRealizada}
        onClose={() => setPreguntarRealizada(false)}
        title="Marcar clase como realizada"
        description="La fecha de esta sesión está programada a futuro"
        size="sm"
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Registraste asistencias en una sesión aún no marcada como realizada. ¿Deseas actualizar su estado a <span className="font-semibold text-slate-900 dark:text-white">realizada</span>?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setPreguntarRealizada(false)}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
          >
            Ahora no
          </button>
          <button
            type="button"
            disabled={updateClase.isPending}
            onClick={handleMarcarRealizada}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#00875A] hover:bg-[#007048] rounded-lg transition-colors"
          >
            Sí, marcar realizada
          </button>
        </div>
      </Modal>
    </div>
  );
}
