import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Modal } from '@/shared/ui';
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
import { FichaNavTabs } from '@/features/fichas/components/FichaNavTabs';
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
  const [activeActividadId, setActiveActividadId] = useState<string | null>(null);

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

  const parentOptions = useMemo(() => {
    if (!actividades || actividades.length === 0) return [];

    // Si se está editando, no permitir seleccionarse a sí misma ni a sus descendientes para evitar ciclos
    const invalidIds = new Set<string>();
    if (editingActividad) {
      invalidIds.add(editingActividad.id);
      const queue = [editingActividad.id];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        actividades.forEach((a) => {
          if (a.parentId === curr && !invalidIds.has(a.id)) {
            invalidIds.add(a.id);
            queue.push(a.id);
          }
        });
      }
    }

    const options: Array<{ value: string; label: string }> = [];
    const appendLevel = (parentId: string | null, depth: number) => {
      const items = (actividades || [])
        .filter((a) => a.parentId === parentId && !invalidIds.has(a.id))
        .sort((a, b) => a.orden - b.orden);

      items.forEach((item) => {
        const indent = depth > 0 ? `${'— '.repeat(depth)} ` : '';
        options.push({
          value: item.id,
          label: `${indent}${item.nombre}`,
        });
        appendLevel(item.id, depth + 1);
      });
    };

    appendLevel(null, 0);
    return options;
  }, [actividades, editingActividad]);

  const childrenMap = useMemo(() => {
    const map = new Map<string, Actividad[]>();
    actividades?.forEach(a => {
      if (a.parentId) {
        if (!map.has(a.parentId)) map.set(a.parentId, []);
        map.get(a.parentId)!.push(a);
      }
    });
    map.forEach(list => list.sort((a, b) => a.orden - b.orden));
    return map;
  }, [actividades]);

  const rootActividades = useMemo(
    () => (actividades?.filter(a => !a.parentId) || []).sort((a, b) => a.orden - b.orden),
    [actividades],
  );

  const totalPorcentaje = rootActividades.reduce((sum, a) => sum + a.porcentaje, 0);

  const porcentajeDisponible = useMemo(() => {
    if (editingActividad) {
      if (editingActividad.parentId) {
        const siblings = childrenMap.get(editingActividad.parentId) || [];
        const siblingsTotal = siblings.reduce((s, c) => (c.id === editingActividad.id ? s : s + c.porcentaje), 0);
        return Math.max(0, 100 - siblingsTotal);
      }
      return Math.max(0, 100 - (totalPorcentaje - editingActividad.porcentaje));
    }
    if (isSubactividad && selectedParentId) {
      const currentKids = childrenMap.get(selectedParentId) || [];
      const currentSubtotal = currentKids.reduce((s, c) => s + c.porcentaje, 0);
      return Math.max(0, 100 - currentSubtotal);
    }
    return Math.max(0, 100 - totalPorcentaje);
  }, [editingActividad, isSubactividad, selectedParentId, childrenMap, totalPorcentaje]);

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
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-label={label}
        title="Editar fecha límite"
        className="flex h-6 w-6 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation transition-colors"
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

  const renderAcciones = (actividad: Actividad) => {
    const isSelected = activeActividadId === actividad.id;
    return (
      <div
        className={`flex items-center justify-end gap-0.5 sm:gap-1 transition-opacity ${
          isSelected
            ? 'opacity-100'
            : 'opacity-100 sm:opacity-40 sm:group-hover:opacity-100'
        }`}
      >
        {!finalizada && (
          <button
            type="button"
            aria-label={`Añadir subactividad a ${actividad.nombre}`}
            title="Añadir subactividad"
            onClick={(e) => {
              e.stopPropagation();
              handleAddActividad(actividad.id);
            }}
            className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-lg p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10 transition-colors touch-manipulation"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        )}
        {!finalizada && (
          <button
            type="button"
            aria-label={`Editar ${actividad.nombre}`}
            title="Editar"
            onClick={(e) => {
              e.stopPropagation();
              handleEditActividad(actividad);
            }}
            className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-lg p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-white/10 transition-colors touch-manipulation"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
        {!finalizada && (
          <button
            type="button"
            aria-label={`Eliminar ${actividad.nombre}`}
            title="Eliminar"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingActividad(actividad);
            }}
            className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-lg p-1 text-slate-600 hover:text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-slate-300 dark:hover:text-red-400 dark:hover:bg-red-500/20 transition-colors touch-manipulation"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    );
  };

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

  const renderActividad = (actividad: Actividad, depth = 0): ReactNode => {
    const children = childrenMap.get(actividad.id) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsed.has(actividad.id);
    const subtotal = children.reduce((sum, c) => sum + c.porcentaje, 0);
    const isSelected = activeActividadId === actividad.id;

    return (
      <Fragment key={actividad.id}>
        <tr
          onClick={() => {
            setActiveActividadId((prev) => (prev === actividad.id ? null : actividad.id));
            if (hasChildren && isCollapsed) {
              toggleCollapsed(actividad.id);
            }
          }}
          className={`group border-b border-slate-100 dark:border-white/10 align-middle transition-colors cursor-pointer touch-manipulation ${
            isSelected
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30'
              : hasChildren
              ? 'bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100/60 dark:hover:bg-white/[0.04] active:bg-slate-100'
              : 'hover:bg-slate-50/60 dark:hover:bg-white/[0.03] active:bg-slate-50'
          }`}
        >
          {/* Actividad / Categoría con soporte multinivel responsivo */}
          <td className="py-3 pl-3 pr-2 sm:pl-4 sm:pr-3">
            <div
              className="flex items-center gap-1.5 sm:gap-2 min-w-0"
              style={{ paddingLeft: depth > 0 ? `${Math.min(depth * 1.25, 4)}rem` : undefined }}
            >
              {depth > 0 && (
                <div
                  className="h-4 border-l-2 border-slate-300 dark:border-white/20 mr-1 shrink-0"
                  aria-hidden="true"
                />
              )}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapsed(actividad.id);
                  }}
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? `Mostrar subactividades de ${actividad.nombre}` : `Ocultar subactividades de ${actividad.nombre}`}
                  className="flex h-7 w-7 items-center justify-center -ml-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 shrink-0 rounded transition-colors touch-manipulation"
                >
                  <svg
                    className={`h-4 w-4 transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    depth === 0 ? 'bg-emerald-500 ml-1.5 mr-1' : 'bg-slate-400 dark:bg-slate-500 ml-1 mr-1'
                  }`}
                  aria-hidden="true"
                />
              )}
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span
                  className={`truncate ${
                    depth === 0
                      ? 'font-bold text-slate-900 dark:text-white text-sm'
                      : depth === 1
                      ? 'font-semibold text-slate-800 dark:text-slate-200 text-sm'
                      : 'font-normal text-slate-700 dark:text-slate-300 text-xs sm:text-sm'
                  }`}
                  title={actividad.nombre}
                >
                  {actividad.nombre}
                </span>
                {hasChildren && (
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-semibold tracking-tight border shrink-0 ${
                      subtotal === 100
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
                    }`}
                    title={`Suma de subactividades: ${subtotal.toFixed(1)}%`}
                  >
                    {subtotal.toFixed(0)}% ponderado
                  </span>
                )}
              </div>
            </div>
          </td>

          {/* Fecha Límite */}
          <td className="px-2 py-3 text-center sm:px-3">
            <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap font-mono text-xs text-slate-500 dark:text-slate-400">
              <span className="truncate">{actividad.fechaLimite ? formatDate(actividad.fechaLimite) : '—'}</span>
              {!finalizada && (
                <BotonEditarFecha onClick={() => handleEditActividad(actividad)} label={`Editar fecha límite de ${actividad.nombre}`} />
              )}
            </span>
          </td>

          {/* Ponderación */}
          <td className="px-2 py-3 text-center sm:px-3">
            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
              {actividad.porcentaje.toFixed(1)}%
            </span>
          </td>

          {/* Acciones */}
          <td className="px-2 py-3 text-right sm:px-3">
            {renderAcciones(actividad)}
          </td>
        </tr>

        {/* Recursión: Subactividades multinivel */}
        {hasChildren && !isCollapsed && children.map((child) => renderActividad(child, depth + 1))}
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

      {/* Pestañas de navegación de la ficha */}
      <div className="px-4">
        <FichaNavTabs
          fichaId={fichaId || ''}
          activeTab={location.hash === '#calificaciones' ? 'calificaciones' : 'actividades'}
          fichaNombre={ficha?.nombre}
          fichaCodigo={ficha?.codigo}
        />
      </div>

      {/* Resumen de Métricas de la Ficha a ancho completo */}
      <div className="px-4">
        <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-black px-5 py-3.5 shadow-sm">
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5 sm:divide-x sm:divide-slate-100 dark:sm:divide-white/10">
            <StatItem
              icon={<span className="text-sm font-bold" aria-hidden="true">%</span>}
              value={`${totalPorcentaje.toFixed(1)}%`}
              label="Total"
              sublabel="Meta 100%"
              title="Porcentaje total asignado"
              valueClassName={`tabular-nums ${totalPorcentaje === 100 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/20 bg-white dark:bg-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-900 shadow-2xs transition-colors"
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
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                </svg>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar actividad..."
                  aria-label="Buscar actividad por nombre"
                  className={`h-9 rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/15 dark:bg-black dark:text-white shadow-2xs ${
                    vertical ? 'sm:w-44' : 'sm:w-56'
                  }`}
                />
              </div>
              {!finalizada && (
                <button
                  type="button"
                  onClick={() => {
                    setCopyError(null);
                    setCopyModalOpen(true);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/20 bg-white dark:bg-black px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-zinc-900"
                  aria-label="Copiar formato de actividades"
                  title="Copiar formato de actividades desde otra ficha"
                >
                  <svg className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copiar formato</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltrosAbiertos(true)}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/20 bg-white dark:bg-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 shadow-sm transition-colors"
                aria-label="Filtros"
                title="Filtros de actividades"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {filtroTipo !== 'todas' && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black" aria-hidden="true" />
                )}
              </button>
              {!finalizada && (
                <button
                  type="button"
                  onClick={() => handleAddActividad(null)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs sm:text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  aria-label="Nueva actividad"
                  title="Crear nueva actividad de evaluación"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>+ Nueva Actividad</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabla Rediseñada de Estructura de Evaluación */}
          <div className="rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-black shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] sm:min-w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col style={{ width: colPct('nombre') }} />
                  <col style={{ width: colPct('fecha') }} />
                  <col style={{ width: colPct('porcentaje') }} />
                  <col style={{ width: colPct('accion') }} />
                </colgroup>
                <thead>
                  <tr className="bg-[#0B192C] text-emerald-400 text-xs font-semibold uppercase tracking-wider border-y border-[#172a45]">
                    <th className="relative px-4 py-3 text-left truncate">
                      Actividad / Categoría
                      <ResizeHandle onMouseDown={startResize('nombre')} onDoubleClick={() => resetColWidth('nombre')} />
                    </th>
                    <th className="relative px-3 py-3 text-center truncate">
                      Fecha límite
                      <ResizeHandle onMouseDown={startResize('fecha')} onDoubleClick={() => resetColWidth('fecha')} />
                    </th>
                    <th className="relative px-3 py-3 text-center truncate">
                      Ponderación
                      <ResizeHandle onMouseDown={startResize('porcentaje')} onDoubleClick={() => resetColWidth('porcentaje')} />
                    </th>
                    <th className="relative px-3 py-3 text-right truncate">
                      Acciones
                      <ResizeHandle onMouseDown={startResize('accion')} onDoubleClick={() => resetColWidth('accion')} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10 dark:bg-black">
                  {!hayFiltros && rootActividades.map(actividad => renderActividad(actividad))}
                  {hayFiltros && actividadesVisibles.map(a => (
                    <tr key={a.id} className="border-b border-slate-100 dark:border-white/10 hover:bg-slate-50/60 dark:hover:bg-white/[0.03] align-middle">
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-slate-800 dark:text-slate-200">{a.nombre}</span>
                            {a.parentId && (
                              <span className="block truncate text-xs text-slate-400 dark:text-slate-500">Sub de {nombresPadre.get(a.parentId) || '…'}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap font-mono text-xs text-slate-500 dark:text-slate-400">
                          <span className="truncate">{a.fechaLimite ? formatDate(a.fechaLimite) : '—'}</span>
                          {!finalizada && (
                            <BotonEditarFecha onClick={() => handleEditActividad(a)} label={`Editar fecha límite de ${a.nombre}`} />
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {a.porcentaje.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">{renderAcciones(a)}</td>
                    </tr>
                  ))}
                  {!hayFiltros && rootActividades.length === 0 && (
                    <tr className="dark:bg-black">
                      <td colSpan={4} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <p className="text-sm font-medium">No hay actividades definidas en esta ficha</p>
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
                      <td colSpan={4} className="py-12 text-center">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin resultados para los filtros aplicados</p>
                        <button
                          type="button"
                          onClick={limpiarFiltros}
                          className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Restablecer búsqueda y filtros
                        </button>
                      </td>
                    </tr>
                  )}
                  {!hayFiltros && rootActividades.length > 0 && (
                    <tr className="bg-slate-50/90 dark:bg-white/[0.02] border-t-2 border-slate-300 dark:border-white/20 font-semibold">
                      <td className="px-4 py-3 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold">
                        Total Ponderado
                      </td>
                      <td />
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold ${
                            totalPorcentaje === 100
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {totalPorcentaje === 100 ? (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                          <span>{totalPorcentaje.toFixed(1)}%</span>
                        </span>
                      </td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: CALIFICACIONES (SÁBANA DE NOTAS) */}
        <div className={vertical ? 'min-w-0 space-y-4 lg:col-span-7' : 'space-y-6'}>
          <div id="seccion-calificaciones" className="flex scroll-mt-24 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Calificaciones</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {fichaNotas
                  ? `${fichaNotas.estudiantes.length} estudiante${fichaNotas.estudiantes.length === 1 ? '' : 's'}`
                  : 'Cargando…'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-2xs ${
                  estadoGuardado === 'guardado'
                    ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : estadoGuardado === 'guardando'
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                }`}
                title={estadoGuardado === 'pendiente' ? 'Clic para guardar ahora' : undefined}
                onClick={() => { if (estadoGuardado === 'pendiente') flushTodas(); }}
                role={estadoGuardado === 'pendiente' ? 'button' : undefined}
              >
                {estadoGuardado === 'guardando' ? (
                  <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                ) : estadoGuardado === 'guardado' ? (
                  <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                )}
                <span>
                  {estadoGuardado === 'guardando'
                    ? 'Guardando…'
                    : estadoGuardado === 'guardado'
                    ? 'Todos los cambios guardados'
                    : estadoGuardado === 'pendiente'
                    ? 'Cambios sin guardar'
                    : 'Sin cambios'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                disabled={!fichaNotas}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/20 bg-white dark:bg-black px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-zinc-900 disabled:opacity-40"
                title="Descargar planilla de calificaciones en formato Excel"
              >
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span>Descargar planilla</span>
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

          {notasLoading ? (
            <div className="flex items-center justify-center py-12 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent" />
            </div>
          ) : notasError || !fichaNotas ? (
            <div className="py-12 text-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black text-slate-500 dark:text-slate-400">
              <p>No hay datos de notas disponibles para esta ficha</p>
            </div>
          ) : (
            <NotasTable
              data={fichaNotas}
              finalizada={finalizada}
              onNotaChange={handleNotaChange}
            />
          )}
        </div>
      </div>

      {/* Modal: Copiar formato de actividades */}
      <Modal
        isOpen={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        title="Copiar Formato de Actividades"
        description="Replica la estructura de ponderación y evaluación desde otra ficha"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Selecciona una ficha para copiar todas sus actividades principales, subactividades y porcentajes a{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{ficha?.nombre || 'esta ficha'}</span>.
          </p>

          <div>
            <label htmlFor="select-ficha-origen" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Ficha de origen
            </label>
            <select
              id="select-ficha-origen"
              value={origenFichaId}
              onChange={(e) => {
                setOrigenFichaId(e.target.value);
                setCopyError(null);
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
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
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Vista previa de estructura
              </p>
              {loadingOrigen ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">Cargando actividades de la ficha…</p>
              ) : origenRoots.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-300 py-2">Esta ficha no tiene actividades configuradas para copiar.</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto space-y-2 text-sm">
                  {(() => {
                    const renderSubs = (parentId: string): ReactNode => {
                      const subs = origenChildrenMap.get(parentId) || [];
                      if (subs.length === 0) return null;
                      return (
                        <ul className="mt-1.5 space-y-1 border-l-2 border-slate-200 dark:border-white/10 pl-3 text-xs text-slate-600 dark:text-slate-300">
                          {subs.map((s) => (
                            <li key={s.id} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="truncate">{s.nombre}</span>
                                <span className="tabular-nums font-medium">{s.porcentaje.toFixed(1)}%</span>
                              </div>
                              {renderSubs(s.id)}
                            </li>
                          ))}
                        </ul>
                      );
                    };

                    return origenRoots.map((root) => (
                      <li key={root.id} className="rounded-lg bg-white dark:bg-slate-900/90 p-2.5 border border-slate-200/80 dark:border-white/10">
                        <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-100">
                          <span className="truncate">{root.nombre}</span>
                          <span className="tabular-nums text-emerald-600 dark:text-emerald-400 ml-2">{root.porcentaje.toFixed(1)}%</span>
                        </div>
                        {renderSubs(root.id)}
                      </li>
                    ));
                  })()}
                </ul>
              )}
            </div>
          )}

          {(actividades?.length ?? 0) > 0 && (
            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reemplazarExistentes}
                onChange={(e) => setReemplazarExistentes(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                <strong className="font-semibold text-slate-800 dark:text-white block">Reemplazar actividades actuales</strong>
                Elimina las actividades existentes en esta ficha antes de copiar el nuevo formato (solo disponible si aún no hay notas registradas).
              </span>
            </label>
          )}

          {copyError && (
            <p className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-400" role="alert">
              {copyError}
            </p>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4 mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setCopyModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!origenFichaId || origenRoots.length === 0 || copiarActividades.isPending}
              onClick={handleCopySubmit}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {copiarActividades.isPending && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              <span>Copiar Formato</span>
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={filtrosAbiertos}
        onClose={() => setFiltrosAbiertos(false)}
        title="Filtros"
        description="Filtra las actividades por tipo o categoría"
        size="sm"
      >
        <div>
          <label className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-2 block">
            Tipo de Actividad
          </label>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-1" role="group" aria-label="Filtrar por tipo de actividad">
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
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  filtroTipo === op.valor
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {op.etiqueta}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4 mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={limpiarFiltros}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => setFiltrosAbiertos(false)}
            className="px-5 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Listo
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={deletingActividad !== null}
        onClose={() => setDeletingActividad(null)}
        title="Eliminar Actividad"
        description="Esta acción eliminará la actividad y sus registros asociados"
        size="sm"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ¿Estás seguro de eliminar <span className="font-semibold text-slate-900 dark:text-white">“{deletingActividad?.nombre}”</span>?
          Se eliminarán también sus subactividades y calificaciones asociadas.
        </p>
        <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4 mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setDeletingActividad(null)}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDeleteActividad}
            disabled={deleteActividad.isPending}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {deleteActividad.isPending && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            <span>Eliminar</span>
          </button>
        </div>
      </Modal>

      <ActividadModal
        isOpen={actividadModalOpen}
        onClose={closeModal}
        onSubmit={handleActividadSubmit}
        initialData={editingActividad ? {
          id: editingActividad.id,
          parentId: editingActividad.parentId,
          nombre: editingActividad.nombre,
          fechaLimite: editingActividad.fechaLimite,
          porcentaje: editingActividad.porcentaje,
          orden: editingActividad.orden,
        } : (isSubactividad && selectedParentId ? { parentId: selectedParentId } : undefined)}
        isLoading={createActividad.isPending || updateActividad.isPending}
        parentOptions={parentOptions}
        isSubactividad={isSubactividad}
        porcentajeDisponible={porcentajeDisponible}
      />
    </div>
  );
}
