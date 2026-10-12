import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Input, Modal } from '@/shared/ui';
import { useClase, useAsistencias, useSaveAsistencias } from '../hooks/useAsistencias';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { useEstudiantes } from '../../estudiantes/hooks/useEstudiantes';
import { JustificacionModal } from '../components/AsistenciaComponents';
import { formatDate, claseHorarioLabel } from '@/shared/utils/helpers';
import { downloadCSV, downloadXLSX } from '@/features/importacion/lib/export';
import { TIPOS_IDENTIFICACION } from '../../estudiantes/types';
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
        className="absolute right-0 top-0 flex h-full w-3 cursor-col-resize touch-none items-center justify-center"
        title="Arrastrar para cambiar el ancho"
      >
        <span className="h-1/2 w-px bg-gray-400" aria-hidden="true" />
      </span>
    </th>
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

  const [marcas, setMarcas] = useState<Record<string, AsistenciaFormData>>({});
  const [justificando, setJustificando] = useState<{ id: string; nombre: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAsistencia, setFiltroAsistencia] = useState<FiltroAsistencia>('todas');
  const [filtroJustificacion, setFiltroJustificacion] = useState<FiltroJustificacion>('todas');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoDocumento>('todas');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  useEffect(() => {
    if (!estudiantes) return;
    const initial: Record<string, AsistenciaFormData> = {};
    estudiantes.forEach((est) => {
      const previa = asistenciasPrevias?.find((a) => a.estudianteId === est.id);
      initial[est.id] = {
        estudianteId: est.id,
        estado: previa?.estado || 'ASISTIO',
        justificacion: previa?.justificacion || '',
      };
    });
    setMarcas(initial);
    setSaved(false);
  }, [estudiantes, asistenciasPrevias]);

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

  const conteoVisible = useMemo(() => {
    const estados = visibles.map((e) => marcas[e.id]?.estado ?? 'ASISTIO');
    return {
      total: visibles.length,
      asistieron: estados.filter((s) => s === 'ASISTIO').length,
      faltaron: estados.filter((s) => s === 'NO_ASISTIO').length,
    };
  }, [visibles, marcas]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroAsistencia('todas');
    setFiltroJustificacion('todas');
    setFiltroTipo('todas');
  };

  const [zoom, setZoom] = useState(1);
  const [zoomAbierto, setZoomAbierto] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [anchosCol, setAnchosCol] = useState<Record<string, number>>({});
  const [redimensionando, setRedimensionando] = useState(false);
  const resizeRef = useRef<{ clave: string; inicioX: number; anchoInicial: number } | null>(null);

  const cambiarZoom = (delta: number) => {
    setZoom((z) => Math.min(1.5, Math.max(0.7, Math.round((z + delta) * 10) / 10)));
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
      { onSuccess: () => setSaved(true) }
    );
  };

  const handleExport = async (formato: 'csv' | 'xlsx') => {
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
    if (formato === 'csv') downloadCSV(`${base}.csv`, headers, rows);
    else await downloadXLSX(`${base}.xlsx`, headers, rows);
    setExportOpen(false);
  };

  if (loadingClase || loadingEstudiantes) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (errorClase || !clase) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">No se pudo cargar la clase</p>
        <Link to="/calendario" className="text-blue-600 hover:underline text-sm">Volver al calendario</Link>
      </div>
    );
  }

  const fichaNombre = clase.ficha?.nombre || 'Ficha';
  const fichaCodigo = clase.ficha?.codigo || '';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-green-400 focus:outline-none focus:ring-2 focus:ring-navy-900"
                aria-label="Volver"
                title="Volver"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7 7-7M3 12h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold capitalize leading-tight text-gray-900">{formatDate(clase.fecha, 'long')}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 pr-1">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-green-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Horario</span>
              <span className="text-2xl font-bold tabular-nums leading-tight text-gray-900">{claseHorarioLabel(clase, formato)}</span>
            </span>
          </div>
        </div>

        <div className="card-fade mt-4 flex flex-col gap-3 rounded-3xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="leading-none">
              <p className="text-[1.5rem] font-bold leading-tight text-gray-900">{fichaNombre}</p>
              {fichaCodigo && (
                <span className="mt-0.5 inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-[1rem] font-medium leading-tight text-gray-700">
                  {fichaCodigo}
                </span>
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.875rem] text-gray-600">
              <span className="h-3 w-3 shrink-0 rounded-full bg-green-500" aria-hidden="true"></span>
              <span>{hayFiltros ? `Mostrando ${conteoVisible.total} de ${counts.total} estudiantes` : `${counts.total} estudiantes`}</span>
              <span className="text-gray-300" aria-hidden="true">|</span>
              <span>{hayFiltros ? conteoVisible.asistieron : counts.asistieron} asistieron</span>
              <span className="text-gray-300" aria-hidden="true">|</span>
              <span>{hayFiltros ? conteoVisible.faltaron : counts.faltaron} no asistieron</span>
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
                aria-label="Buscar por nombre o cédula"
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
              {(filtroAsistencia !== 'todas' || filtroJustificacion !== 'todas' || filtroTipo !== 'todas') && (
                <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" aria-hidden="true" />
              )}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setZoomAbierto((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-green-400 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-900"
                aria-label="Zoom de la tabla"
                aria-expanded={zoomAbierto}
                title="Zoom de la tabla"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                </svg>
              </button>
              {zoomAbierto && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setZoomAbierto(false)} aria-hidden="true" />
                  <div className="absolute bottom-11 right-0 z-20 flex w-60 items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
                    <button
                      type="button"
                      onClick={() => cambiarZoom(-0.1)}
                      disabled={zoom <= 0.7}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-green-400 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-900 disabled:opacity-40"
                      aria-label="Reducir zoom de la tabla"
                      title="Reducir zoom"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                    </button>
                    <input
                      type="range"
                      min={0.7}
                      max={1.5}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full accent-navy-900"
                      aria-label="Nivel de zoom de la tabla"
                    />
                    <button
                      type="button"
                      onClick={() => cambiarZoom(0.1)}
                      disabled={zoom >= 1.5}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-green-400 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-900 disabled:opacity-40"
                      aria-label="Aumentar zoom de la tabla"
                      title="Aumentar zoom"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom(1)}
                      className="shrink-0 text-xs tabular-nums text-gray-500 hover:text-gray-700"
                      title="Restablecer zoom al 100 %"
                    >
                      {Math.round(zoom * 100)} %
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {!clase.realizada && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-2xl text-yellow-800 text-sm">
          Esta clase está marcada como "no realizada". Márcala como realizada para poder guardar asistencias.
        </div>
      )}

      {saved && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-sm">
          Asistencias guardadas correctamente.
        </div>
      )}

      <div className={`overflow-x-auto rounded-2xl ${redimensionando ? 'select-none' : ''}`} style={{ zoom }}>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-[#3b6336] text-left">
              <ThAjustable k="fila" className="px-2 py-3" anchos={anchosCol} onResize={iniciarResize}>
                <span className="sr-only">Fila</span>
              </ThAjustable>
              <ThAjustable k="nombre" className="px-4 py-3 text-sm font-semibold text-white" anchos={anchosCol} onResize={iniciarResize}>
                Nombre
              </ThAjustable>
              <ThAjustable k="identificacion" className="px-4 py-3 text-sm font-semibold text-white" anchos={anchosCol} onResize={iniciarResize}>
                ID
              </ThAjustable>
              <ThAjustable k="asistencia" className="px-4 py-3 text-sm font-semibold text-white" anchos={anchosCol} onResize={iniciarResize}>
                Asistencia
              </ThAjustable>
              <ThAjustable k="justificacion" className="px-4 py-3 text-center text-sm font-semibold text-white" anchos={anchosCol} onResize={iniciarResize}>
                Justificación
              </ThAjustable>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {visibles.map((est, i) => {
                const marca = marcas[est.id];
                if (!marca) return null;
                const asistio = marca.estado === 'ASISTIO';
                const tieneJustificacion = !!marca.justificacion;
                return (
                  <tr key={est.id} className="bg-white/40 hover:bg-white/70">
                    <td className="px-2 py-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-green-600 text-[0.525rem] font-bold tabular-nums text-green-600">
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{est.nombre}</td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{est.identificacion}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex w-fit rounded-full bg-gray-300/60 p-1" role="group" aria-label={`Asistencia de ${est.nombre}`}>
                        <button
                          type="button"
                          onClick={() => setEstado(est.id, 'ASISTIO')}
                          aria-pressed={asistio}
                          className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                            asistio ? 'bg-green-300 text-green-950' : 'text-gray-500'
                          }`}
                        >
                          ✓ Asistió
                        </button>
                        <button
                          type="button"
                          onClick={() => setEstado(est.id, 'NO_ASISTIO')}
                          aria-pressed={!asistio}
                          className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                            !asistio ? 'bg-red-300 text-red-950' : 'text-gray-500'
                          }`}
                        >
                          ✗ No asistió
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                      {tieneJustificacion && (
                        <span className="max-w-[120px] truncate text-xs text-gray-500" title={marca.justificacion}>
                          {(marca.justificacion || '').slice(0, 10)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setJustificando({ id: est.id, nombre: est.nombre })}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white focus:outline-none focus:ring-2 focus:ring-green-600"
                        aria-label={tieneJustificacion ? `Ver justificación de ${est.nombre}` : `Añadir justificación a ${est.nombre}`}
                        title={tieneJustificacion ? 'Ver justificación' : 'Añadir justificación'}
                      >
                        {tieneJustificacion ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        )}
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(estudiantes || []).length === 0 && (
            <p className="py-8 text-center text-gray-500">No hay estudiantes en esta ficha</p>
          )}
          {(estudiantes || []).length > 0 && visibles.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-gray-500">Sin resultados para la búsqueda o filtros aplicados</p>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-2 text-sm font-medium text-blue-600 hover:underline"
              >
                Limpiar búsqueda y filtros
              </button>
            </div>
          )}
      </div>

      <div className="flex justify-end gap-2">
        <div className="relative">
          <Button variant="secondary" onClick={() => setExportOpen((v) => !v)} disabled={(estudiantes || []).length === 0} aria-expanded={exportOpen}>
            Exportar
          </Button>
          {exportOpen && (
            <div className="absolute bottom-12 right-0 z-10 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <button type="button" onClick={() => handleExport('csv')} className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                Descargar CSV
              </button>
              <button type="button" onClick={() => handleExport('xlsx')} className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                Descargar Excel
              </button>
            </div>
          )}
        </div>
        <Button variant="success" onClick={handleSave} loading={saveAsistencias.isPending} disabled={!clase.realizada}>
          Guardar asistencias
        </Button>
      </div>

      <Modal
        isOpen={filtrosAbiertos}
        onClose={() => setFiltrosAbiertos(false)}
        title="Filtros"
        size="sm"
        headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
        titleClassName="text-lg font-semibold text-white"
        closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Tipo de documento</p>
            <div className="flex flex-wrap gap-1 rounded-3xl bg-gray-100 p-1" role="group" aria-label="Filtrar por tipo de documento">
              <button
                type="button"
                onClick={() => setFiltroTipo('todas')}
                aria-pressed={filtroTipo === 'todas'}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filtroTipo === 'todas' ? 'bg-navy-900 text-green-400' : 'text-gray-500 hover:text-gray-700'
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
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    filtroTipo === t.valor ? 'bg-navy-900 text-green-400' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.valor}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Asistencia</p>
            <div className="inline-flex rounded-full bg-gray-100 p-1" role="group" aria-label="Filtrar por asistencia">
              {([
                { valor: 'todas', etiqueta: 'Todas' },
                { valor: 'ASISTIO', etiqueta: 'Asistieron' },
                { valor: 'NO_ASISTIO', etiqueta: 'No asistieron' },
              ] as const).map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => setFiltroAsistencia(op.valor)}
                  aria-pressed={filtroAsistencia === op.valor}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    filtroAsistencia === op.valor ? 'bg-navy-900 text-green-400' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {op.etiqueta}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Justificación</p>
            <div className="inline-flex rounded-full bg-gray-100 p-1" role="group" aria-label="Filtrar por justificación">
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
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    filtroJustificacion === op.valor ? 'bg-navy-900 text-green-400' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {op.etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={limpiarFiltros}>Limpiar</Button>
          <Button variant="danger" onClick={() => setFiltrosAbiertos(false)}>Cerrar</Button>
        </div>
      </Modal>

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
    </div>
  );
}
