import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent, Input, Modal } from '@/shared/ui';
import { formatDate } from '@/shared/utils/helpers';
import {
  useActividades,
  useCreateActividad,
  useUpdateActividad,
  useDeleteActividad,
  useFichaNotas,
  useSaveCalificaciones,
  useCopiarActividades,
} from '../hooks/useCalificaciones';
import { useFicha, useFichas } from '@/features/fichas/hooks/useFichas';
import { FichaHeaderCard } from '@/features/fichas/components/FichaHeaderCard';
import { ActividadModal, NotasTable } from '../components/CalificacionesComponents';
import { ExportDialog, ImportHint } from '@/features/importacion';
import type { Actividad, ActividadFormData } from '../types';

function StatGlyph({ d }: { d: string }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const STAT_ICONS = {
  actividades: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  estudiantes: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.87M15.5 3.13a3.5 3.5 0 010 6.74',
  promedio: 'M4 20V10M10 20V4M16 20v-7M21 20H3',
  aprobacion: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
};

/** Bloque de métrica limpio dentro de la tarjeta superior organizada (sin tags). */
function StatItem({ icon, value, label, sublabel, title, valueClassName }: {
  icon: ReactNode;
  value: string;
  label: string;
  sublabel?: string;
  title?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0 px-2 py-1" title={title ?? label}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-green-400" aria-hidden="true">
        {icon}
      </span>
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 truncate">
          {label}
        </span>
        <span className={`text-base font-bold tabular-nums truncate ${valueClassName ?? 'text-gray-900 dark:text-white'}`}>
          {value}
        </span>
        {sublabel && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function ActividadesPage() {
  const { fichaId } = useParams<{ fichaId: string }>();
  const navigate = useNavigate();
  const [actividadModalOpen, setActividadModalOpen] = useState(false);
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null);
  const [isSubactividad, setIsSubactividad] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [deletingActividad, setDeletingActividad] = useState<Actividad | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'principales' | 'sub'>('todas');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Modal para copiar formato de actividades desde otra ficha
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [origenFichaId, setOrigenFichaId] = useState('');
  const [reemplazarExistentes, setReemplazarExistentes] = useState(true);
  const [copyError, setCopyError] = useState<string | null>(null);

  const LAYOUT_STORAGE_KEY = 'noteplus:actividades-layout';
  const [vertical, setVertical] = useState(() => {
    try {
      return localStorage.getItem(LAYOUT_STORAGE_KEY) === 'vertical';
    } catch {
      return false;
    }
  });
  const toggleLayout = () => {
    setVertical((v) => {
      const next = !v;
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, next ? 'vertical' : 'horizontal');
      } catch {
        /* almacenamiento no disponible */
      }
      return next;
    });
  };

  const { data: actividades, isLoading } = useActividades(fichaId || '');
  const { data: ficha } = useFicha(fichaId || '');
  const { data: fichaNotas, isLoading: notasLoading, error: notasError } = useFichaNotas(fichaId || '');
  const createActividad = useCreateActividad(fichaId || '');
  const updateActividad = useUpdateActividad(fichaId || '');
  const deleteActividad = useDeleteActividad(fichaId || '');
  const saveCalificaciones = useSaveCalificaciones();
  const copiarActividades = useCopiarActividades(fichaId || '');

  // Fichas disponibles para copiar formato
  const { data: fichasActivas } = useFichas(false);
  const { data: fichasArchivadas } = useFichas(true);
  const fichasOrigen = useMemo(() => {
    const todas = [...(fichasActivas ?? []), ...(fichasArchivadas ?? [])];
    return todas.filter((f) => f.id !== fichaId);
  }, [fichasActivas, fichasArchivadas, fichaId]);

  const { data: actividadesOrigen, isLoading: loadingOrigen } = useActividades(
    copyModalOpen ? origenFichaId : ''
  );

  const finalizada = ficha?.finalizada || ficha?.archivada || false;
  const pendingChanges = useRef<Record<string, { actividadId: string; estudianteId: string; nota: number }>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // `mutate` es estable entre renders (el objeto del hook no), así se evita
  // que el efecto de flush se re-ejecute en bucle.
  const { mutate: saveMutate } = saveCalificaciones;
  const [estadoGuardado, setEstadoGuardado] = useState<'idle' | 'pendiente' | 'guardando' | 'guardado'>('idle');

  const location = useLocation();

  // Al llegar con #calificaciones (botón del detalle de ficha), baja a la sección.
  // Se re-ejecuta al terminar de cargar porque la altura cambia con los datos.
  useEffect(() => {
    if (location.hash === '#calificaciones') {
      document.getElementById('seccion-calificaciones')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, isLoading, notasLoading]);

  const handleNotaChange = (actividadId: string, estudianteId: string, nota: number) => {
    const key = `${actividadId}-${estudianteId}`;
    pendingChanges.current[key] = { actividadId, estudianteId, nota };
    setEstadoGuardado('pendiente');
    if (saveTimers.current[actividadId]) clearTimeout(saveTimers.current[actividadId]);
    saveTimers.current[actividadId] = setTimeout(() => flushActividad(actividadId), 800);
  };

  const flushActividad = (actividadId: string) => {
    const changes = Object.values(pendingChanges.current).filter((c) => c.actividadId === actividadId);
    if (changes.length === 0) return;
    const keys = new Set(changes.map((c) => `${c.actividadId}-${c.estudianteId}`));
    setEstadoGuardado('guardando');
    saveMutate(
      { actividadId, calificaciones: changes },
      {
        onSuccess: () => {
          keys.forEach((k) => { delete pendingChanges.current[k]; });
          setEstadoGuardado(Object.keys(pendingChanges.current).length === 0 ? 'guardado' : 'pendiente');
        },
        onError: () => setEstadoGuardado('pendiente'),
      },
    );
  };

  const flushTodas = () => {
    const ids = [...new Set(Object.values(pendingChanges.current).map((c) => c.actividadId))];
    ids.forEach((id) => {
      if (saveTimers.current[id]) {
        clearTimeout(saveTimers.current[id]);
        delete saveTimers.current[id];
      }
      flushActividad(id);
    });
  };

  // Al cambiar de ficha o salir, intenta guardar lo pendiente (una sola vez).
  useEffect(() => {
    const timers = saveTimers.current;
    const pending = pendingChanges.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      const changes = Object.values(pending);
      if (changes.length === 0) return;
      const grouped: Record<string, typeof changes> = {};
      changes.forEach((c) => {
        if (!grouped[c.actividadId]) grouped[c.actividadId] = [];
        grouped[c.actividadId].push(c);
      });
      pendingChanges.current = {};
      Object.entries(grouped).forEach(([actividadId, calificaciones]) => {
        saveMutate({ actividadId, calificaciones });
      });
    };
  }, [fichaId, saveMutate]);

  const parentOptions = actividades?.filter(a => !a.parentId).map(a => ({ value: a.id, label: a.nombre })) || [];

  const childrenMap = useMemo(() => {
    const map = new Map<string, Actividad[]>();
    actividades?.forEach(a => {
      if (a.parentId) {
        if (!map.has(a.parentId)) map.set(a.parentId, []);
        map.get(a.parentId)!.push(a);
      }
    });
    return map;
  }, [actividades]);

  const rootActividades = useMemo(
    () => actividades?.filter(a => !a.parentId) || [],
    [actividades],
  );

  const totalPorcentaje = rootActividades.reduce((sum, a) => sum + a.porcentaje, 0);

  const statsNotas = useMemo(() => {
    const est = fichaNotas?.estudiantes ?? [];
    if (est.length === 0) return null;
    const prom = est.reduce((s, e) => s + e.notaFinal, 0) / est.length;
    const aprobCount = est.filter((e) => e.estado === 'APROBADO').length;
    const aprob = (aprobCount / est.length) * 100;
    return { prom, aprob, aprobCount, total: est.length };
  }, [fichaNotas]);

  function BotonEditarFecha({ onClick, label }: { onClick: () => void; label: string }) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title="Editar fecha límite"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white focus:outline-none focus:ring-2 focus:ring-green-600"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    );
  }

  const hayFiltros = busqueda.trim() !== '' || filtroTipo !== 'todas';

  const nombresPadre = useMemo(() => {
    const map = new Map<string, string>();
    actividades?.forEach(a => map.set(a.id, a.nombre));
    return map;
  }, [actividades]);

  const actividadesVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (actividades || []).filter(a => {
      if (q && !a.nombre.toLowerCase().includes(q)) return false;
      if (filtroTipo === 'principales' && a.parentId) return false;
      if (filtroTipo === 'sub' && !a.parentId) return false;
      return true;
    });
  }, [actividades, busqueda, filtroTipo]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroTipo('todas');
  };

  const toggleCollapsed = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderAcciones = (actividad: Actividad) => (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        aria-label={`Editar ${actividad.nombre}`}
        title="Editar"
        onClick={() => handleEditActividad(actividad)}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white focus:outline-none focus:ring-2 focus:ring-green-600"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={`Eliminar ${actividad.nombre}`}
        title="Eliminar"
        onClick={() => setDeletingActividad(actividad)}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#a16074] text-white hover:bg-[#8e5063] focus:outline-none focus:ring-2 focus:ring-[#a16074]/50 shadow-xs"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  type ColKey = 'nombre' | 'fecha' | 'accion' | 'porcentaje';
  const DEFAULT_COL_WIDTHS: Record<ColKey, number> = { nombre: 280, fecha: 135, accion: 90, porcentaje: 105 };
  const COL_WIDTHS_STORAGE_KEY = 'noteplus:actividades-col-widths';
  const colMinWidths: Record<ColKey, number> = { nombre: 140, fecha: 85, accion: 65, porcentaje: 75 };

  const loadColWidths = (): Record<ColKey, number> => {
    try {
      const raw = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
      if (!raw) return DEFAULT_COL_WIDTHS;
      const parsed = JSON.parse(raw) as Partial<Record<ColKey, unknown>>;
      const next = { ...DEFAULT_COL_WIDTHS };
      (Object.keys(DEFAULT_COL_WIDTHS) as ColKey[]).forEach((k) => {
        const v = parsed[k];
        if (typeof v === 'number' && Number.isFinite(v)) {
          next[k] = Math.max(colMinWidths[k], Math.min(800, v));
        }
      });
      return next;
    } catch {
      return DEFAULT_COL_WIDTHS;
    }
  };

  const persistColWidths = (widths: Record<ColKey, number>) => {
    try {
      localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(widths));
    } catch {
      /* almacenamiento no disponible: se ignora y se usan los valores en memoria */
    }
  };

  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(loadColWidths);

  // Anchos proporcionales en porcentaje para que la tabla siempre ocupe el 100% de la tarjeta
  // y permita redimensionar columnas tanto en vista apilada como en modo mosaico.
  const totalColWeight = colWidths.nombre + colWidths.fecha + colWidths.accion + colWidths.porcentaje;
  const colPct = (key: ColKey) => `${((colWidths[key] / totalColWeight) * 100).toFixed(2)}%`;

  const resetColWidth = (key: ColKey) => {
    setColWidths((prev) => {
      const next = { ...prev, [key]: DEFAULT_COL_WIDTHS[key] };
      persistColWidths(next);
      return next;
    });
  };

  const startResize = (key: ColKey) => (e: ReactMouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[key];
    let latest = startWidth;
    const onMove = (ev: MouseEvent) => {
      latest = Math.max(colMinWidths[key], startWidth + ev.clientX - startX);
      setColWidths(prev => ({ ...prev, [key]: latest }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      persistColWidths({ ...colWidths, [key]: latest });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const ResizeHandle = ({ onMouseDown, onDoubleClick }: {
    onMouseDown: (e: ReactMouseEvent<HTMLSpanElement>) => void;
    onDoubleClick: (e: ReactMouseEvent<HTMLSpanElement>) => void;
  }) => (
    <span
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      className="absolute right-0 top-0 flex h-full w-3 cursor-col-resize items-center justify-center"
      aria-hidden="true"
      title="Arrastrar para redimensionar · doble clic para restablecer"
    >
      <span className="h-6 w-0.5 rounded bg-white/40 hover:bg-green-400 transition-colors" />
    </span>
  );

  const renderActividad = (actividad: Actividad) => {
    const children = childrenMap.get(actividad.id) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsed.has(actividad.id);
    const subtotal = children.reduce((sum, c) => sum + c.porcentaje, 0);

    return (
      <Fragment key={actividad.id}>
        <tr className="group border-b border-gray-100 dark:border-white/10 dark:bg-black align-middle">
          <td className="py-3 pl-4 pr-2">
            <div className="relative flex flex-col min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                {hasChildren ? (
                  <button
                    onClick={() => toggleCollapsed(actividad.id)}
                    aria-expanded={!isCollapsed}
                    aria-label={isCollapsed ? `Mostrar subactividades de ${actividad.nombre}` : `Ocultar subactividades de ${actividad.nombre}`}
                    className="p-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 shrink-0"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  <div className="w-6 shrink-0" />
                )}
                <span className="h-2 w-2 shrink-0 rounded-full border-2 border-green-600" aria-hidden="true" />
                <span className="font-medium truncate dark:text-slate-100" title={actividad.nombre}>{actividad.nombre}</span>
                {hasChildren && (
                  <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${subtotal === 100 ? 'bg-green-100 text-green-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                    {subtotal.toFixed(1)}% / 100%
                  </span>
                )}
              </div>
              {!finalizada && (
                <button
                  onClick={() => handleAddActividad(actividad.id)}
                  aria-label={`Añadir subactividad a ${actividad.nombre}`}
                  className="absolute left-7 top-full z-10 hidden w-fit items-center gap-1 rounded-b-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 shadow-sm hover:text-green-800 dark:hover:text-green-200 hover:underline group-hover:inline-flex group-focus-within:inline-flex"
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-xs leading-none text-white" aria-hidden="true">
                    +
                  </span>
                  Añadir subactividad
                </button>
              )}
            </div>
          </td>
          <td className="px-2 py-3 text-center">
            <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap tabular-nums text-sm text-gray-500 dark:text-slate-400">
              <span className="truncate">{actividad.fechaLimite ? formatDate(actividad.fechaLimite) : '—'}</span>
              {!finalizada && (
                <BotonEditarFecha onClick={() => handleEditActividad(actividad)} label={`Editar fecha límite de ${actividad.nombre}`} />
              )}
            </span>
          </td>
          <td className="px-2 py-3">{renderAcciones(actividad)}</td>
          <td className="px-2 py-3 text-center">
            <span className="whitespace-nowrap tabular-nums text-sm text-gray-700 dark:text-slate-200">
              {actividad.porcentaje.toFixed(1)}%
            </span>
          </td>
        </tr>
        {hasChildren && !isCollapsed && children.map(child => (
          <tr key={child.id} className="border-b border-gray-100 dark:border-white/10 dark:bg-black align-middle">
            <td className="py-2 pl-4 pr-2">
              <div className="ml-8 border-l-2 border-gray-200 dark:border-white/10 pl-4">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full border-2 border-green-400" aria-hidden="true" />
                  <span className="truncate text-gray-800 dark:text-slate-100" title={child.nombre}>{child.nombre}</span>
                </span>
              </div>
            </td>
            <td className="px-2 py-2 text-center">
              <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap tabular-nums text-sm text-gray-500 dark:text-slate-400">
                <span className="truncate">{child.fechaLimite ? formatDate(child.fechaLimite) : '—'}</span>
                {!finalizada && (
                  <BotonEditarFecha onClick={() => handleEditActividad(child)} label={`Editar fecha límite de ${child.nombre}`} />
                )}
              </span>
            </td>
            <td className="px-2 py-2">{renderAcciones(child)}</td>
            <td className="px-2 py-2 text-center">
              <span className="whitespace-nowrap tabular-nums text-sm text-gray-700 dark:text-slate-200">
                {child.porcentaje.toFixed(1)}%
              </span>
            </td>
          </tr>
        ))}
      </Fragment>
    );
  };

  const handleAddActividad = (parentId: string | null) => {
    setIsSubactividad(!!parentId);
    setSelectedParentId(parentId);
    setEditingActividad(null);
    setActividadModalOpen(true);
  };

  const handleEditActividad = (actividad: Actividad) => {
    setIsSubactividad(!!actividad.parentId);
    setSelectedParentId(actividad.parentId);
    setEditingActividad(actividad);
    setActividadModalOpen(true);
  };

  const handleDeleteActividad = () => {
    if (!deletingActividad) return;
    deleteActividad.mutate(deletingActividad.id, {
      onSuccess: () => setDeletingActividad(null),
    });
  };

  const handleActividadSubmit = (data: ActividadFormData) => {
    if (editingActividad) {
      updateActividad.mutate({ id: editingActividad.id, data });
    } else {
      createActividad.mutate(data);
    }
    setActividadModalOpen(false);
  };

  const closeModal = () => {
    setActividadModalOpen(false);
    setEditingActividad(null);
    setSelectedParentId(null);
  };

  const handleCopySubmit = () => {
    if (!origenFichaId) {
      setCopyError('Selecciona una ficha de origen.');
      return;
    }
    setCopyError(null);
    copiarActividades.mutate(
      {
        origenFichaId,
        reemplazarExistentes: (actividades?.length ?? 0) > 0 ? reemplazarExistentes : false,
      },
      {
        onSuccess: () => {
          setCopyModalOpen(false);
          setOrigenFichaId('');
        },
        onError: (err: any) => {
          const detail =
            err?.response?.data?.detail ||
            err?.response?.data?.error?.message ||
            'No se pudo copiar el formato de actividades.';
          setCopyError(typeof detail === 'string' ? detail : 'Error al copiar formato.');
        },
      }
    );
  };

  // Previsualización de actividades de la ficha de origen en el modal
  const origenRoots = useMemo(
    () => (actividadesOrigen ?? []).filter((a) => !a.parentId),
    [actividadesOrigen]
  );
  const origenChildrenMap = useMemo(() => {
    const map = new Map<string, Actividad[]>();
    (actividadesOrigen ?? []).forEach((a) => {
      if (a.parentId) {
        if (!map.has(a.parentId)) map.set(a.parentId, []);
        map.get(a.parentId)!.push(a);
      }
    });
    return map;
  }, [actividadesOrigen]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ImportHint ctaLabel="Ir a estudiantes" onCta={() => navigate(`/fichas/${fichaId}/estudiantes`)} />

      {/* Encabezado superior: FichaHeaderCard + Tarjeta organizada de resumen (sin tags) */}
      <div className="flex flex-col gap-4 px-4 lg:flex-row lg:items-stretch">
        {ficha && (
          <div className="min-w-0 lg:w-[32%] lg:shrink-0 flex">
            <FichaHeaderCard
              ficha={ficha}
              onBack={() => navigate(-1)}
              onOpenDetalle={() => navigate(`/fichas/${fichaId}`)}
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 px-5 py-3.5 shadow-xs">
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5 sm:divide-x sm:divide-slate-100 dark:sm:divide-white/10">
            <StatItem
              icon={<span className="text-sm font-bold" aria-hidden="true">%</span>}
              value={`${totalPorcentaje.toFixed(1)}%`}
              label="Total"
              sublabel="Meta 100%"
              title="Porcentaje total asignado"
              valueClassName={`tabular-nums ${totalPorcentaje === 100 ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}
            />
            <StatItem
              icon={<StatGlyph d={STAT_ICONS.actividades} />}
              value={String((actividades || []).length)}
              label="Actividades"
              sublabel={`${rootActividades.length} princ. · ${Math.max(0, (actividades || []).length - rootActividades.length)} sub`}
              title={`${rootActividades.length} principales · ${(actividades || []).length - rootActividades.length} subactividades`}
            />
            <StatItem
              icon={<StatGlyph d={STAT_ICONS.estudiantes} />}
              value={fichaNotas ? String(fichaNotas.estudiantes.length) : '…'}
              label="Estudiantes"
              sublabel="En la ficha"
            />
            <StatItem
              icon={<StatGlyph d={STAT_ICONS.promedio} />}
              value={statsNotas ? statsNotas.prom.toFixed(1) : '—'}
              label="Promedio"
              sublabel="General"
            />
            <StatItem
              icon={<StatGlyph d={STAT_ICONS.aprobacion} />}
              value={statsNotas ? `${statsNotas.aprob.toFixed(0)}%` : '—'}
              label="Aprobados"
              sublabel={statsNotas ? `${statsNotas.aprobCount} de ${statsNotas.total}` : 'Sin notas'}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 border-l border-slate-100 dark:border-white/10 pl-3">
            <button
              type="button"
              onClick={toggleLayout}
              aria-pressed={vertical}
              title={vertical ? 'Ver apilado' : 'Modo mosaico (ver lado a lado)'}
              aria-label={vertical ? 'Ver actividades y calificaciones apiladas' : 'Ver actividades y calificaciones lado a lado'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-green-400 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-900"
            >
              {vertical ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <rect x="4" y="4" width="16" height="7" rx="1.5" />
                  <rect x="4" y="13" width="16" height="7" rx="1.5" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <rect x="4" y="4" width="7" height="16" rx="1.5" />
                  <rect x="13" y="4" width="7" height="16" rx="1.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Al activar el modo mosaico (vertical=true), ampliamos el ancho más allá del contenedor actual */}
      <div
        className={
          vertical
            ? 'relative left-1/2 -translate-x-1/2 w-[min(96vw,1780px)] grid items-start gap-6 px-4 lg:grid-cols-12'
            : 'space-y-6 px-4'
        }
      >
        <div className={`min-w-0 space-y-4 ${vertical ? 'lg:col-span-5' : ''}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Actividades</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {hayFiltros
                  ? `${actividadesVisibles.length} de ${(actividades || []).length} actividades`
                  : `${(actividades || []).length} actividades`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                </svg>
                <Input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar..."
                  aria-label="Buscar actividad por nombre"
                  className={`py-1.5 pl-10 text-sm ${vertical ? 'sm:w-44' : 'sm:w-56'}`}
                />
              </div>
              {!finalizada && (
                <button
                  type="button"
                  onClick={() => {
                    setCopyError(null);
                    setCopyModalOpen(true);
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-900 shadow-xs"
                  aria-label="Copiar formato de actividades"
                  title="Copiar formato de actividades desde otra ficha"
                >
                  <svg className="h-4 w-4 text-navy-900 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copiar formato</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltrosAbiertos(true)}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-green-400 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-900"
                aria-label="Filtros"
                title="Filtros"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {filtroTipo !== 'todas' && (
                  <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" aria-hidden="true" />
                )}
              </button>
              {!finalizada && (
                <button
                  type="button"
                  onClick={() => handleAddActividad(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                  aria-label="Nueva actividad"
                  title="Nueva actividad"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <Card variant="default" padding="none" className="dark:bg-black">
            <CardContent className="p-0">
              <div className="border-y border-gray-200 dark:border-white/10 p-4 pb-8 dark:bg-black rounded-2xl">
                <table className="w-full table-fixed border-collapse text-sm dark:bg-black">
                  <colgroup>
                    <col style={{ width: colPct('nombre') }} />
                    <col style={{ width: colPct('fecha') }} />
                    <col style={{ width: colPct('accion') }} />
                    <col style={{ width: colPct('porcentaje') }} />
                  </colgroup>
                  <thead>
                    <tr className="rounded-xl bg-navy-900 dark:bg-[#071626] text-sm font-semibold text-white">
                      <th className="relative rounded-l-xl px-4 py-3 text-left truncate">
                        Nombre
                        <ResizeHandle onMouseDown={startResize('nombre')} onDoubleClick={() => resetColWidth('nombre')} />
                      </th>
                      <th className="relative px-2 py-3 text-center truncate">
                        Fecha límite
                        <ResizeHandle onMouseDown={startResize('fecha')} onDoubleClick={() => resetColWidth('fecha')} />
                      </th>
                      <th className="relative px-2 py-3 text-center truncate">
                        Acción
                        <ResizeHandle onMouseDown={startResize('accion')} onDoubleClick={() => resetColWidth('accion')} />
                      </th>
                      <th className="relative rounded-r-xl px-2 py-3 text-center truncate">
                        Porcentaje
                        <ResizeHandle onMouseDown={startResize('porcentaje')} onDoubleClick={() => resetColWidth('porcentaje')} />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="dark:bg-black">
                    {!hayFiltros && rootActividades.map(actividad => renderActividad(actividad))}
                    {hayFiltros && actividadesVisibles.map(a => (
                      <tr key={a.id} className="border-b border-gray-100 dark:border-white/10 dark:bg-black align-middle">
                        <td className="py-3 pl-4 pr-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full border-2 border-green-600" aria-hidden="true" />
                            <div className="min-w-0">
                              <span className="block truncate font-medium">{a.nombre}</span>
                              {a.parentId && (
                                <span className="block truncate text-xs text-gray-500 dark:text-slate-400">Sub de {nombresPadre.get(a.parentId) || '…'}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap tabular-nums text-sm text-gray-500 dark:text-slate-400">
                            <span className="truncate">{a.fechaLimite ? formatDate(a.fechaLimite) : '—'}</span>
                            {!finalizada && (
                              <BotonEditarFecha onClick={() => handleEditActividad(a)} label={`Editar fecha límite de ${a.nombre}`} />
                            )}
                          </span>
                        </td>
                        <td className="px-2 py-3">{renderAcciones(a)}</td>
                        <td className="px-2 py-3 text-center">
                          <span className="whitespace-nowrap tabular-nums text-sm text-gray-700 dark:text-slate-200">
                            {a.porcentaje.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!hayFiltros && rootActividades.length === 0 && (
                      <tr className="dark:bg-black">
                        <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-slate-400">
                          <p>No hay actividades definidas</p>
                          {!finalizada && (
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                              <Button
                                onClick={() => {
                                  setIsSubactividad(false);
                                  setSelectedParentId(null);
                                  setEditingActividad(null);
                                  setActividadModalOpen(true);
                                }}
                              >
                                Crear primera actividad
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setCopyError(null);
                                  setCopyModalOpen(true);
                                }}
                              >
                                Copiar formato de otra ficha
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    {hayFiltros && actividadesVisibles.length === 0 && (
                      <tr className="dark:bg-black">
                        <td colSpan={4} className="py-8 text-center">
                          <p className="text-gray-500 dark:text-slate-400">Sin resultados para la búsqueda o filtros aplicados</p>
                          <button
                            type="button"
                            onClick={limpiarFiltros}
                            className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Limpiar búsqueda y filtros
                          </button>
                        </td>
                      </tr>
                    )}
                    {!hayFiltros && rootActividades.length > 0 && (
                      <tr className="dark:bg-black">
                        <td className="px-4 pt-3 font-bold text-gray-900 dark:text-white">Total</td>
                        <td />
                        <td />
                        <td className="px-2 pt-3 text-center">
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-[10px] font-bold text-green-400" aria-hidden="true">%</span>
                            <span className={`font-bold tabular-nums ${totalPorcentaje === 100 ? 'text-green-700 dark:text-emerald-400' : 'text-yellow-700 dark:text-amber-400'}`}>
                              {totalPorcentaje.toFixed(1)}%
                            </span>
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={vertical ? 'min-w-0 space-y-4 lg:col-span-7' : 'space-y-6'}>
          <div id="seccion-calificaciones" className="flex scroll-mt-24 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Calificaciones</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {fichaNotas
                  ? `${fichaNotas.estudiantes.length} estudiante${fichaNotas.estudiantes.length === 1 ? '' : 's'}`
                  : 'Cargando…'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => { if (estadoGuardado === 'pendiente') flushTodas(); }}
                disabled={estadoGuardado !== 'pendiente'}
                title={estadoGuardado === 'pendiente' ? 'Guardar ahora' : 'Estado del guardado automático'}
                aria-label={estadoGuardado === 'pendiente' ? 'Guardar cambios ahora' : `Guardado automático: ${estadoGuardado === 'guardando' ? 'guardando' : estadoGuardado === 'guardado' ? 'guardado' : 'sin cambios'}`}
                className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/80 px-3 text-xs font-semibold text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-navy-900 disabled:cursor-default dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300"
              >
                {estadoGuardado === 'guardando' ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" aria-hidden="true" />
                ) : (
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${estadoGuardado === 'guardado' ? 'bg-green-500' : estadoGuardado === 'pendiente' ? 'animate-pulse bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    aria-hidden="true"
                  />
                )}
                {estadoGuardado === 'guardando' ? 'Guardando…' : estadoGuardado === 'guardado' ? 'Guardado' : estadoGuardado === 'pendiente' ? 'Sin guardar' : 'Sin cambios'}
              </button>
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                disabled={!fichaNotas}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-green-400 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-900 disabled:opacity-40"
                aria-label="Exportar"
                title="Exportar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
              <ExportDialog
                isOpen={exportOpen}
                onClose={() => setExportOpen(false)}
                fichaId={fichaId || ''}
                fichaCodigo={ficha?.codigo}
                initialDataset="notas"
              />
            </div>
          </div>

          <Card variant="default" padding="none" className="dark:bg-black">
            <CardContent className="p-0">
              <div className="border-y border-gray-200 dark:border-white/10 overflow-x-auto p-4 dark:bg-black rounded-2xl">
                {notasLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                  </div>
                ) : notasError || !fichaNotas ? (
                  <div className="py-8 text-center text-gray-500 dark:text-slate-400">
                    <p>No hay datos de notas</p>
                  </div>
                ) : (
                  <NotasTable
                    data={fichaNotas}
                    finalizada={finalizada}
                    onNotaChange={handleNotaChange}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Copiar formato de actividades */}
      <Modal
        isOpen={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        title="Copiar formato de actividades"
        size="md"
        headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
        titleClassName="text-lg font-semibold text-white"
        closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Selecciona una ficha para copiar todas sus actividades principales, subactividades y sus porcentajes a{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{ficha?.nombre || 'esta ficha'}</span>.
          </p>

          <div>
            <label htmlFor="select-ficha-origen" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
              Ficha de origen
            </label>
            <select
              id="select-ficha-origen"
              value={origenFichaId}
              onChange={(e) => {
                setOrigenFichaId(e.target.value);
                setCopyError(null);
              }}
              className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/20"
            >
              <option value="">Selecciona una ficha…</option>
              {fichasOrigen.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre} ({f.codigo}) {f.archivada ? '· Archivada' : ''}
                </option>
              ))}
            </select>
          </div>

          {origenFichaId && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Vista previa de estructura
              </p>
              {loadingOrigen ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">Cargando actividades de la ficha…</p>
              ) : origenRoots.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-300 py-2">Esta ficha no tiene actividades configuradas para copiar.</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto space-y-2 text-sm">
                  {origenRoots.map((root) => {
                    const subs = origenChildrenMap.get(root.id) || [];
                    return (
                      <li key={root.id} className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200/60 dark:border-white/10">
                        <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-100">
                          <span className="truncate">{root.nombre}</span>
                          <span className="tabular-nums text-green-700 dark:text-green-400 ml-2">{root.porcentaje.toFixed(1)}%</span>
                        </div>
                        {subs.length > 0 && (
                          <ul className="mt-1.5 space-y-1 border-l-2 border-slate-200 dark:border-white/10 pl-3 text-xs text-slate-600 dark:text-slate-300">
                            {subs.map((s) => (
                              <li key={s.id} className="flex items-center justify-between">
                                <span className="truncate">{s.nombre}</span>
                                <span className="tabular-nums font-medium">{s.porcentaje.toFixed(1)}%</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {(actividades?.length ?? 0) > 0 && (
            <label className="flex items-start gap-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reemplazarExistentes}
                onChange={(e) => setReemplazarExistentes(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-900 focus:ring-navy-900"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                <strong className="font-semibold text-slate-800 dark:text-white block">Reemplazar actividades actuales</strong>
                Elimina las actividades existentes en esta ficha antes de copiar el nuevo formato (solo disponible si aún no hay notas registradas).
              </span>
            </label>
          )}

          {copyError && (
            <p className="rounded-xl bg-[#a16074]/10 border border-[#a16074]/30 px-3 py-2 text-xs font-medium text-[#a16074]" role="alert">
              {copyError}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => setCopyModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="navyGreen"
              size="sm"
              loading={copiarActividades.isPending}
              disabled={!origenFichaId || origenRoots.length === 0}
              onClick={handleCopySubmit}
            >
              Copiar formato
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={filtrosAbiertos}
        onClose={() => setFiltrosAbiertos(false)}
        title="Filtros"
        size="sm"
        headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
        titleClassName="text-lg font-semibold text-white"
        closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Tipo</p>
          <div className="inline-flex rounded-full bg-gray-100 p-1" role="group" aria-label="Filtrar por tipo de actividad">
            {([
              { valor: 'todas', etiqueta: 'Todas' },
              { valor: 'principales', etiqueta: 'Principales' },
              { valor: 'sub', etiqueta: 'Subactividades' },
            ] as const).map((op) => (
              <button
                key={op.valor}
                type="button"
                onClick={() => setFiltroTipo(op.valor)}
                aria-pressed={filtroTipo === op.valor}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filtroTipo === op.valor ? 'bg-navy-900 text-green-400' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {op.etiqueta}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={limpiarFiltros}>Limpiar</Button>
          <Button variant="danger" onClick={() => setFiltrosAbiertos(false)}>Cerrar</Button>
        </div>
      </Modal>

      <Modal
        isOpen={deletingActividad !== null}
        onClose={() => setDeletingActividad(null)}
        title="Eliminar actividad"
        size="sm"
        headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
        titleClassName="text-lg font-semibold text-white"
        closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <p className="text-sm text-gray-700 dark:text-slate-200">
          ¿Eliminar <span className="font-bold text-gray-900 dark:text-white">“{deletingActividad?.nombre}”</span>?
          Se eliminarán también sus subactividades y calificaciones.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setDeletingActividad(null)}>Cancelar</Button>
          <Button type="button" variant="danger" loading={deleteActividad.isPending} onClick={handleDeleteActividad}>Eliminar</Button>
        </div>
      </Modal>

      <ActividadModal
        isOpen={actividadModalOpen}
        onClose={closeModal}
        onSubmit={handleActividadSubmit}
        initialData={editingActividad ? {
          parentId: editingActividad.parentId,
          nombre: editingActividad.nombre,
          fechaLimite: editingActividad.fechaLimite,
          porcentaje: editingActividad.porcentaje,
          orden: editingActividad.orden,
        } : (isSubactividad && selectedParentId ? { parentId: selectedParentId } : undefined)}
        isLoading={createActividad.isPending || updateActividad.isPending}
        title={editingActividad ? 'Editar actividad' : (isSubactividad ? 'Nueva subactividad' : 'Nueva actividad principal')}
        parentOptions={parentOptions}
        isSubactividad={isSubactividad}
      />
    </div>
  );
}
