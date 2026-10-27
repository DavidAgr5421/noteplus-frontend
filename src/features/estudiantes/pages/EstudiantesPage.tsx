import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TablePagination, Modal } from '@/shared/ui';
import { useEstudiantes, useCreateEstudiante, useUpdateEstudiante, useDeleteEstudiante, useImportBatch } from '../hooks/useEstudiantes';
import { useFicha } from '@/features/fichas/hooks/useFichas';
import { FichaNavTabs } from '@/features/fichas/components/FichaNavTabs';
import { EstudianteModal } from '../components/EstudianteForm';
import { ImportWizard, ExportDialog, ImportHint, type EstudianteImportado } from '@/features/importacion';
import { TIPOS_IDENTIFICACION, type Estudiante, type TipoIdentificacion } from '../types';

const esTipoValido = (v: string): v is TipoIdentificacion =>
  (TIPOS_IDENTIFICACION as readonly { valor: string }[]).some((t) => t.valor === v);

function programaDescripcion(nombre: string): string {
  const n = nombre.toUpperCase().trim();
  if (n === 'AA') return 'Análisis Administrativo';
  if (n === 'ADSO') return 'Análisis y Desarrollo de Software';
  if (n === 'CGSIG') return 'Gestión y Seguridad de la Información';
  return '';
}

function jornadaTexto(horarios?: { diaSemana: number; hora: string; duracionMinutos: number }[]): string {
  if (!horarios || horarios.length === 0) return 'Jornada Continua';
  const horas = horarios.map((h) => parseInt(h.hora.split(':')[0], 10));
  if (horas.every((h) => h >= 18)) return 'Jornada Nocturna';
  if (horas.every((h) => h < 12)) return 'Jornada Mañana';
  if (horas.every((h) => h >= 12 && h < 18)) return 'Jornada Tarde';
  return 'Jornada Mixta';
}

function trimestreTexto(trimestre?: string, fechaInicio?: string): string {
  if (trimestre?.trim()) return trimestre.trim();
  if (!fechaInicio) return '';
  const [year, month] = fechaInicio.split('-').map(Number);
  if (!year || !month) return '';
  return `Trimestre ${Math.ceil(month / 3)} - ${year}`;
}

function formatNombre(nombre: string): string {
  if (!nombre) return '';
  if (nombre === nombre.toUpperCase()) {
    return nombre
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return nombre;
}

export function EstudiantesPage() {
  const { fichaId } = useParams<{ fichaId: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEstudiante, setEditingEstudiante] = useState<Estudiante | null>(null);
  const [deletingEstudiante, setDeletingEstudiante] = useState<Estudiante | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: { index: number; reason: string }[] } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [soloEnRiesgo, setSoloEnRiesgo] = useState(false);

  const { data: ficha } = useFicha(fichaId || '');
  const { data: estudiantes, isLoading } = useEstudiantes(fichaId || '');
  const createEstudiante = useCreateEstudiante(fichaId || '');
  const updateEstudiante = useUpdateEstudiante(fichaId || '');
  const deleteEstudiante = useDeleteEstudiante(fichaId || '');
  const importBatch = useImportBatch(fichaId || '');

  const totalEnRiesgo = (estudiantes || []).filter((e) => (e.totalFallas || 0) >= 3).length;

  const filteredEstudiantes = estudiantes?.filter((e) => {
    if (soloEnRiesgo && (e.totalFallas || 0) < 3) return false;
    return (
      e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      e.identificacion.includes(search) ||
      (e.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.contacto ?? '').toLowerCase().includes(search.toLowerCase())
    );
  }) || [];

  const pageSize = 10;
  const totalPages = Math.ceil(filteredEstudiantes.length / pageSize);
  const paginatedEstudiantes = filteredEstudiantes.slice((page - 1) * pageSize, page * pageSize);

  const handleCreate = (data: any) => createEstudiante.mutate(data);
  const handleUpdate = (data: any) => updateEstudiante.mutate({ id: editingEstudiante!.id, data });
  const handleDelete = (row: Estudiante) => setDeletingEstudiante(row);
  const confirmDelete = () => {
    if (!deletingEstudiante) return;
    deleteEstudiante.mutate(deletingEstudiante.id, {
      onSuccess: () => setDeletingEstudiante(null),
    });
  };

  const importErrorMsg = importBatch.error
    ? ((importBatch.error as { response?: { status?: number; data?: { error?: { message?: string } } } }).response?.status === 401
        ? 'Sesión vencida. Cierra sesión y vuelve a entrar.'
        : ((importBatch.error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          ?? 'Error inesperado del servidor.'))
    : null;

  const handleImport = (records: EstudianteImportado[]) => {
    setImportResult(null);
    importBatch.mutate(
      records.map((r) => ({
        nombre: r.nombre,
        tipoIdentificacion: r.tipoIdentificacion,
        identificacion: r.identificacion,
        email: r.email || undefined,
        contacto: r.contacto || undefined,
      })),
      {
        onSuccess: (res) => {
          if (res.skipped && res.skipped.length > 0) {
            setImportResult(res);
          } else {
            setImportModalOpen(false);
            setImportResult(null);
          }
        },
      },
    );
  };

  const desc = programaDescripcion(ficha?.nombre || '');
  const fichaTituloCompleto = desc ? `${ficha?.nombre} · ${desc}` : (ficha?.nombre || 'Ficha Formativa');
  const jornadaLabel = jornadaTexto(ficha?.horarios);
  const trimestreLabel = trimestreTexto(ficha?.trimestre, ficha?.fechaInicio);

  return (
    <div className="space-y-6">
      <ImportHint ctaLabel="Importar ahora" onCta={() => setImportModalOpen(true)} />

      {/* 1. Barra de Navegación y Breadcrumbs interactivos */}
      <FichaNavTabs
        fichaId={fichaId || ''}
        activeTab="estudiantes"
        fichaNombre={ficha?.nombre}
        fichaCodigo={ficha?.codigo}
      />

      {/* 2. Cabecera Plana Integrada (Sin contenedor flotante redondeado) */}
      <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Lado izquierdo: Indicador de estado, Nombre de la Ficha y Metadatos en una línea */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {fichaTituloCompleto}
            </h1>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500 dark:text-slate-400">
            {ficha?.codigo && (
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                Ficha #{ficha.codigo}
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>{jornadaLabel}</span>
            {trimestreLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>{trimestreLabel}</span>
              </>
            )}
          </div>
        </div>

        {/* Lado derecho: Micro-métrica limpia de Aprendices Activos */}
        <div className="flex shrink-0 items-center gap-3 self-start sm:self-auto">
          <div className="flex flex-col text-right leading-tight">
            <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {estudiantes?.length ?? 0}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Aprendices activos
            </span>
          </div>
          <svg className="h-7 w-7 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      </div>

      {/* 3. Toolbar de Control de la Tabla */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Listado de Aprendices
          </h2>
          {totalEnRiesgo > 0 && (
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-black p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setSoloEnRiesgo(false); setPage(1); }}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  !soloEnRiesgo
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({(estudiantes || []).length})
              </button>
              <button
                type="button"
                onClick={() => { setSoloEnRiesgo(true); setPage(1); }}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                  soloEnRiesgo
                    ? 'bg-[#a16074] text-white shadow-2xs font-bold'
                    : 'text-[#8e5063] dark:text-[#e2a8b8] hover:bg-[#a16074]/15'
                }`}
                title="Aprendices con 3 o más fallas acumuladas"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>En riesgo ({totalEnRiesgo})</span>
              </button>
            </div>
          )}
        </div>

        {/* Controles alineados a la derecha */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Buscador compacto con icono integrado */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre, documento o correo..."
              aria-label="Buscar aprendiz"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/15 dark:bg-black dark:text-white sm:w-72 shadow-2xs"
            />
          </div>

          {/* Importar CSV */}
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/20 bg-white dark:bg-black px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-zinc-900"
            title="Importar lista de estudiantes desde CSV / Excel"
          >
            <svg className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span>Importar CSV</span>
          </button>

          {/* Exportar lista */}
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/20 bg-white dark:bg-black px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-zinc-900"
            title="Exportar listado de aprendices"
          >
            <svg className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Exportar lista</span>
          </button>

          {/* Acción Principal: + Agregar Aprendiz */}
          <button
            type="button"
            onClick={() => { setEditingEstudiante(null); setModalOpen(true); }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            title="Añadir nuevo aprendiz a esta ficha"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>+ Agregar Aprendiz</span>
          </button>

          <ExportDialog
            isOpen={exportOpen}
            onClose={() => setExportOpen(false)}
            fichaId={fichaId || ''}
            fichaCodigo={ficha?.codigo}
            initialDataset="estudiantes"
          />
        </div>
      </div>

      {/* 4. Tabla Rediseñada en Marco Plano */}
      <div className="rounded-xl border border-slate-200 dark:border-white/15 overflow-hidden bg-white dark:bg-black shadow-sm">
        {isLoading ? (
          <div className="flex h-36 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          </div>
        ) : paginatedEstudiantes.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <svg className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <p className="mt-2 text-sm font-medium">
              {search ? `Sin resultados para «${search}»` : 'No hay aprendices registrados en esta ficha'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#0B192C] text-emerald-400 text-xs font-semibold uppercase tracking-wider border-y border-[#172a45]">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Nombre</th>
                  <th scope="col" className="px-4 py-3.5">Documento</th>
                  <th scope="col" className="px-4 py-3.5">Email</th>
                  <th scope="col" className="px-4 py-3.5">Contacto</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10 dark:bg-black">
                {paginatedEstudiantes.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors align-middle"
                  >
                    {/* Nombre */}
                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatNombre(row.nombre)}
                        </span>
                        {row.totalFallas && row.totalFallas > 3 ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-[#a16074]/15 text-[#8e5063] dark:bg-[#a16074]/25 dark:text-[#e2a8b8] px-2 py-0.5 text-[10px] font-bold border border-[#a16074]/30"
                            title={`${row.totalFallas} fallas (${row.fallasInjustificadas || 0} injustificadas) - Alerta de deserción`}
                          >
                            <svg className="h-3 w-3 text-[#a16074]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{row.totalFallas} fallas</span>
                          </span>
                        ) : row.totalFallas === 3 ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30"
                            title="3 fallas acumuladas - En riesgo"
                          >
                            <svg className="h-3 w-3 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>3 fallas</span>
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Documento: Tipo y número juntos en font-mono */}
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{row.tipoIdentificacion || 'CC'}</span>{' '}
                      <span>{row.identificacion}</span>
                    </td>

                    {/* Email sin truncado agresivo */}
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                      {row.email ? (
                        <span className="break-all">{row.email}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Contacto */}
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {row.contacto || <span className="text-slate-400 font-sans">—</span>}
                    </td>

                    {/* Acciones con botones de icono limpios */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingEstudiante(row); setModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-colors"
                          aria-label={`Editar ${row.nombre}`}
                          title="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-md transition-colors"
                          aria-label={`Eliminar ${row.nombre}`}
                          title="Eliminar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-white/10 p-3 bg-slate-50/50 dark:bg-black">
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <EstudianteModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEstudiante(null); }}
        onSubmit={editingEstudiante ? handleUpdate : handleCreate}
        initialData={editingEstudiante ? {
          nombre: editingEstudiante.nombre,
          tipoIdentificacion: esTipoValido(editingEstudiante.tipoIdentificacion) ? editingEstudiante.tipoIdentificacion : 'CC',
          identificacion: editingEstudiante.identificacion,
          email: editingEstudiante.email || '',
          contacto: editingEstudiante.contacto || '',
        } : undefined}
        isLoading={createEstudiante.isPending || updateEstudiante.isPending}
        title={editingEstudiante ? 'Editar estudiante' : 'Nuevo estudiante'}
      />

      <ImportWizard
        isOpen={importModalOpen}
        onClose={() => { setImportModalOpen(false); setImportResult(null); }}
        onConfirm={handleImport}
        isLoading={importBatch.isPending}
        serverResult={importResult}
        serverError={importErrorMsg}
        onClearServerResult={() => setImportResult(null)}
      />

      <Modal
        isOpen={!!deletingEstudiante}
        onClose={() => setDeletingEstudiante(null)}
        title="Eliminar Estudiante"
        description="Esta acción eliminará permanentemente al aprendiz de la ficha"
        size="sm"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ¿Eliminar a <span className="font-semibold text-slate-900 dark:text-white">{deletingEstudiante?.nombre}</span>?
          Esta acción no se puede deshacer y borrará sus registros de asistencia y notas asociadas.
        </p>
        <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4 mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setDeletingEstudiante(null)}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleteEstudiante.isPending}
            onClick={confirmDelete}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {deleteEstudiante.isPending && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            <span>Eliminar</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
