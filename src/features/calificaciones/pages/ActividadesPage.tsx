import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent, Input, Modal } from '@/shared/ui';
import { formatDate } from '@/shared/utils/helpers';
import { useActividades, useCreateActividad, useUpdateActividad, useDeleteActividad, useFichaNotas, useSaveCalificaciones } from '../hooks/useCalificaciones';
import { useFicha } from '@/features/fichas/hooks/useFichas';
import { ActividadModal, NotasTable } from '../components/CalificacionesComponents';
import { ExportDialog } from '@/features/importacion';
import { ImportHint } from '@/features/importacion';
import type { Actividad, ActividadFormData } from '../types';

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

  const { data: actividades, isLoading } = useActividades(fichaId || '');
  const { data: ficha } = useFicha(fichaId || '');
  const { data: fichaNotas, isLoading: notasLoading, error: notasError } = useFichaNotas(fichaId || '');
  const createActividad = useCreateActividad(fichaId || '');
  const updateActividad = useUpdateActividad(fichaId || '');
  const deleteActividad = useDeleteActividad(fichaId || '');
  const saveCalificaciones = useSaveCalificaciones();

  const finalizada = ficha?.finalizada || ficha?.archivada || false;
  const pendingChanges = useRef<Record<string, { actividadId: string; estudianteId: string; nota: number }>>({});

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
  };

  const handleSaveNotas = () => {
    const changes = Object.values(pendingChanges.current);
    if (changes.length === 0) return;

    const grouped = changes.reduce((acc, change) => {
      if (!acc[change.actividadId]) acc[change.actividadId] = [];
      acc[change.actividadId].push({ actividadId: change.actividadId, estudianteId: change.estudianteId, nota: change.nota });
      return acc;
    }, {} as Record<string, { actividadId: string; estudianteId: string; nota: number }[]>);

    Object.entries(grouped).forEach(([actividadId, calificaciones]) => {
      saveCalificaciones.mutate({ actividadId, calificaciones });
    });

    pendingChanges.current = {};
  };

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
  const DEFAULT_COL_WIDTHS: Record<ColKey, number> = { nombre: 300, fecha: 140, accion: 100, porcentaje: 110 };
  const COL_WIDTHS_STORAGE_KEY = 'noteplus:actividades-col-widths';
  const colMinWidths: Record<ColKey, number> = { nombre: 150, fecha: 80, accion: 60, porcentaje: 70 };

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
      <span className="h-6 w-0.5 rounded bg-white/40" />
    </span>
  );

  const renderActividad = (actividad: Actividad) => {
    const children = childrenMap.get(actividad.id) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsed.has(actividad.id);
    const subtotal = children.reduce((sum, c) => sum + c.porcentaje, 0);

    return (
      <Fragment key={actividad.id}>
        <tr className="group border-b border-gray-100 align-middle">
          <td className="py-3 pl-4 pr-2">
            <div className="relative flex flex-col min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                {hasChildren ? (
                  <button
                    onClick={() => toggleCollapsed(actividad.id)}
                    aria-expanded={!isCollapsed}
                    aria-label={isCollapsed ? `Mostrar subactividades de ${actividad.nombre}` : `Ocultar subactividades de ${actividad.nombre}`}
                    className="p-1 text-gray-500 hover:text-gray-700 shrink-0"
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
                <span className="font-medium truncate">{actividad.nombre}</span>
                {hasChildren && (
                  <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${subtotal === 100 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {subtotal.toFixed(1)}% / 100%
                  </span>
                )}
              </div>
              <button
                onClick={() => handleAddActividad(actividad.id)}
                aria-label={`Añadir subactividad a ${actividad.nombre}`}
                className="absolute left-7 top-full z-10 hidden w-fit items-center gap-1 rounded-b-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-green-700 shadow-sm hover:text-green-800 hover:underline group-hover:inline-flex group-focus-within:inline-flex"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-xs leading-none text-white" aria-hidden="true">
                  +
                </span>
                Añadir subactividad
              </button>
            </div>
          </td>
          <td className="px-2 py-3 text-center">
            <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap tabular-nums text-sm text-gray-500">
              {actividad.fechaLimite ? formatDate(actividad.fechaLimite) : '—'}
              <BotonEditarFecha onClick={() => handleEditActividad(actividad)} label={`Editar fecha límite de ${actividad.nombre}`} />
            </span>
          </td>
          <td className="px-2 py-3">{renderAcciones(actividad)}</td>
          <td className="px-2 py-3 text-center">
            <span className="whitespace-nowrap tabular-nums text-sm text-gray-700">
              {actividad.porcentaje.toFixed(1)}%
            </span>
          </td>
        </tr>
        {hasChildren && !isCollapsed && children.map(child => (
          <tr key={child.id} className="border-b border-gray-100 align-middle">
            <td className="py-2 pl-4 pr-2">
              <div className="ml-10 border-l-2 border-gray-200 pl-5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full border-2 border-green-400" aria-hidden="true" />
                  <span className="truncate text-gray-800">{child.nombre}</span>
                </span>
              </div>
            </td>
            <td className="px-2 py-2 text-center">
              <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap tabular-nums text-sm text-gray-500">
                {child.fechaLimite ? formatDate(child.fechaLimite) : '—'}
                <BotonEditarFecha onClick={() => handleEditActividad(child)} label={`Editar fecha límite de ${child.nombre}`} />
              </span>
            </td>
            <td className="px-2 py-2">{renderAcciones(child)}</td>
            <td className="px-2 py-2 text-center">
              <span className="whitespace-nowrap tabular-nums text-sm text-gray-700">
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
      <div
        className="rounded-3xl px-5 py-4"
        style={{ background: 'linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0))' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-green-500" aria-hidden="true"></span>
              <p className="truncate text-[1.8rem] font-bold leading-tight text-gray-900">{ficha?.nombre || 'Ficha'}</p>
              <span className="text-[1.8rem] font-bold leading-tight text-gray-400" aria-hidden="true">-</span>
              {ficha?.codigo && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-lg font-medium text-gray-700">
                  {ficha.codigo}
                </span>
              )}
            </div>
            {ficha?.trimestre && (
              <p className="mt-1 text-sm text-gray-500">{ficha.trimestre}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pr-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-green-400">
              <span className="text-sm font-bold" aria-hidden="true">%</span>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total</span>
              <span className={`text-sm font-semibold tabular-nums ${totalPorcentaje === 100 ? 'text-green-700' : 'text-yellow-700'}`}>
                {totalPorcentaje.toFixed(1)}%
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-gray-900">Actividades</h3>
          <p className="text-sm text-gray-500">
            {hayFiltros
              ? `${actividadesVisibles.length} de ${(actividades || []).length} actividades`
              : `${(actividades || []).length} actividades`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              className="py-1.5 pl-10 text-sm sm:w-56"
            />
          </div>
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
        </div>
      </div>

      <Card variant="default" padding="none">
        <CardContent className="p-0">
          <div className="border-y border-gray-200 overflow-x-auto p-4 pb-8">
            <table className="w-auto table-fixed border-collapse text-sm">
              <colgroup>
                <col style={{ width: colWidths.nombre }} />
                <col style={{ width: colWidths.fecha }} />
                <col style={{ width: colWidths.accion }} />
                <col style={{ width: colWidths.porcentaje }} />
              </colgroup>
              <thead>
                <tr className="rounded-xl bg-navy-900 text-sm font-semibold text-white">
                  <th className="relative rounded-l-xl px-4 py-3 text-left">Nombre<ResizeHandle onMouseDown={startResize('nombre')} onDoubleClick={() => resetColWidth('nombre')} /></th>
                  <th className="relative px-2 py-3 text-center">Fecha límite<ResizeHandle onMouseDown={startResize('fecha')} onDoubleClick={() => resetColWidth('fecha')} /></th>
                  <th className="relative px-2 py-3 text-center">Acción<ResizeHandle onMouseDown={startResize('accion')} onDoubleClick={() => resetColWidth('accion')} /></th>
                  <th className="relative rounded-r-xl px-2 py-3 text-center">Porcentaje<ResizeHandle onMouseDown={startResize('porcentaje')} onDoubleClick={() => resetColWidth('porcentaje')} /></th>
                </tr>
              </thead>
              <tbody>
                {!hayFiltros && rootActividades.map(actividad => renderActividad(actividad))}
                {hayFiltros && actividadesVisibles.map(a => (
                  <tr key={a.id} className="border-b border-gray-100 align-middle">
                    <td className="py-3 pl-4 pr-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full border-2 border-green-600" aria-hidden="true" />
                        <div className="min-w-0">
                          <span className="block truncate font-medium">{a.nombre}</span>
                          {a.parentId && (
                            <span className="block truncate text-xs text-gray-500">Sub de {nombresPadre.get(a.parentId) || '…'}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap tabular-nums text-sm text-gray-500">
                        {a.fechaLimite ? formatDate(a.fechaLimite) : '—'}
                        <BotonEditarFecha onClick={() => handleEditActividad(a)} label={`Editar fecha límite de ${a.nombre}`} />
                      </span>
                    </td>
                    <td className="px-2 py-3">{renderAcciones(a)}</td>
                    <td className="px-2 py-3 text-center">
                      <span className="whitespace-nowrap tabular-nums text-sm text-gray-700">
                        {a.porcentaje.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {!hayFiltros && rootActividades.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      <p>No hay actividades definidas</p>
                      <Button className="mt-4" onClick={() => { setIsSubactividad(false); setSelectedParentId(null); setEditingActividad(null); setActividadModalOpen(true); }}>
                        Crear primera actividad
                      </Button>
                    </td>
                  </tr>
                )}
                {hayFiltros && actividadesVisibles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center">
                      <p className="text-gray-500">Sin resultados para la búsqueda o filtros aplicados</p>
                      <button
                        type="button"
                        onClick={limpiarFiltros}
                        className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                      >
                        Limpiar búsqueda y filtros
                      </button>
                    </td>
                  </tr>
                )}
                {!hayFiltros && rootActividades.length > 0 && (
                  <tr>
                    <td className="px-4 pt-3 font-bold text-gray-900">Total</td>
                    <td />
                    <td />
                    <td className={`px-2 pt-3 text-center font-bold tabular-nums whitespace-nowrap ${totalPorcentaje === 100 ? 'text-green-700' : 'text-yellow-700'}`}>
                      {totalPorcentaje.toFixed(1)}%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div aria-hidden="true" className="h-px bg-black" />

      <div id="seccion-calificaciones" className="flex scroll-mt-24 flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-gray-900">Calificaciones</h3>
          <p className="text-sm text-gray-500">
            {fichaNotas
              ? `${fichaNotas.estudiantes.length} estudiante${fichaNotas.estudiantes.length === 1 ? '' : 's'}`
              : 'Cargando…'}
          </p>
        </div>
        <div className="shrink-0">
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

      <Card variant="default" padding="none">
        <CardContent className="p-0">
          <div className="border-y border-gray-200 overflow-x-auto p-4">
            {notasLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : notasError || !fichaNotas ? (
              <div className="py-8 text-center text-gray-500">
                <p>No hay datos de notas</p>
              </div>
            ) : (
              <NotasTable
                data={fichaNotas}
                finalizada={finalizada}
                onNotaChange={handleNotaChange}
                onSave={handleSaveNotas}
                loading={saveCalificaciones.isPending}
              />
            )}
          </div>
        </CardContent>
      </Card>

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
          <p className="mb-2 text-sm font-medium text-gray-700">Tipo</p>
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
                  filtroTipo === op.valor ? 'bg-navy-900 text-green-400' : 'text-gray-500 hover:text-gray-700'
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
        <p className="text-sm text-gray-700">
          ¿Eliminar <span className="font-bold text-gray-900">“{deletingActividad?.nombre}”</span>?
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
