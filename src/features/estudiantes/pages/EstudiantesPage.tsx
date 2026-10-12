import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, CardContent, TablePagination, Input, Modal } from '@/shared/ui';
import { useEstudiantes, useCreateEstudiante, useUpdateEstudiante, useDeleteEstudiante, useImportBatch } from '../hooks/useEstudiantes';
import { useFicha } from '@/features/fichas/hooks/useFichas';
import { EstudianteModal } from '../components/EstudianteForm';
import { ImportWizard, ExportDialog, ImportHint, type EstudianteImportado } from '@/features/importacion';
import { TIPOS_IDENTIFICACION, type Estudiante, type TipoIdentificacion } from '../types';

const esTipoValido = (v: string): v is TipoIdentificacion =>
  (TIPOS_IDENTIFICACION as readonly { valor: string }[]).some((t) => t.valor === v);

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

  const { data: ficha } = useFicha(fichaId || '');
  const { data: estudiantes, isLoading } = useEstudiantes(fichaId || '');
  const createEstudiante = useCreateEstudiante(fichaId || '');
  const updateEstudiante = useUpdateEstudiante(fichaId || '');
  const deleteEstudiante = useDeleteEstudiante(fichaId || '');
  const importBatch = useImportBatch(fichaId || '');

  const filteredEstudiantes = estudiantes?.filter(e =>
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    e.identificacion.includes(search) ||
    (e.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (e.contacto ?? '').toLowerCase().includes(search.toLowerCase())
  ) || [];

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
        onSuccess: () => {
          setImportModalOpen(false);
          setImportResult(null);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <ImportHint ctaLabel="Importar ahora" onCta={() => setImportModalOpen(true)} />
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
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.87M15.5 3.13a3.5 3.5 0 010 6.74" />
              </svg>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Estudiantes</span>
              <span className="text-sm font-semibold tabular-nums text-gray-800">
                {estudiantes?.length ?? 0}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-gray-900">Estudiantes</h3>
          <p className="text-sm text-gray-500">
            {`${filteredEstudiantes.length} ${filteredEstudiantes.length === 1 ? 'estudiante' : 'estudiantes'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </svg>
            <Input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar..."
              aria-label="Buscar por nombre o identificación"
              className="py-1.5 pl-10 text-sm sm:w-56"
            />
          </div>
          <button
            type="button"
            onClick={() => { setEditingEstudiante(null); setModalOpen(true); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-green-400 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-900"
            aria-label="Añadir estudiante"
            title="Añadir estudiante"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-green-400 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-900"
            aria-label="Importar estudiantes"
            title="Importar estudiantes"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </button>
          <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-green-400 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-900"
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
            initialDataset="estudiantes"
          />
        </div>
      </div>

      <Card variant="default" padding="none">
        <CardContent className="p-0">
          <div className="border-y border-gray-200 overflow-x-auto p-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : paginatedEstudiantes.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>{search ? `Sin resultados para “${search}”.` : 'No hay estudiantes registrados'}</p>
              </div>
            ) : (
              <table className="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="rounded-xl bg-[#30542b] text-sm font-semibold text-white">
                    <th className="rounded-l-xl px-4 py-3 text-left">Nombre</th>
                    <th className="px-2 py-3 text-center">Tipo doc.</th>
                    <th className="px-2 py-3 text-center">Identificación</th>
                    <th className="px-2 py-3 text-center">Email</th>
                    <th className="px-2 py-3 text-center">Contacto</th>
                    <th className="rounded-r-xl px-2 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEstudiantes.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 align-middle">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {row.nombre}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-center tabular-nums text-sm text-gray-500">
                        {row.tipoIdentificacion || 'CC'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-center tabular-nums text-sm text-gray-500">
                        {row.identificacion}
                      </td>
                      <td className="truncate px-2 py-3 text-center text-sm text-gray-500">
                        {row.email || '-'}
                      </td>
                      <td className="truncate px-2 py-3 text-center text-sm text-gray-500">
                        {row.contacto || '-'}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setEditingEstudiante(row); setModalOpen(true); }}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label={`Editar ${row.nombre}`}
                            title="Editar"
                          >
                            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4L19.5 8.5a2.12 2.12 0 00-3-3L5 17v3zM14.5 6.5l3 3M13 20h7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label={`Eliminar ${row.nombre}`}
                            title="Eliminar"
                          >
                            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4.5A1.5 1.5 0 019.5 3h5A1.5 1.5 0 0116 4.5V6m-11 0l1 13.1A1.9 1.9 0 006.9 21h10.2a1.9 1.9 0 001.89-1.9L20 6M10 10.5v6M14 10.5v6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {totalPages > 1 && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        </CardContent>
      </Card>

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
      />

      <Modal
        isOpen={!!deletingEstudiante}
        onClose={() => setDeletingEstudiante(null)}
        title="Eliminar estudiante"
        size="sm"
        headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
        titleClassName="text-lg font-semibold text-white"
        closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <p className="text-gray-600">
          ¿Eliminar a <span className="font-semibold text-gray-900">{deletingEstudiante?.nombre}</span>? Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeletingEstudiante(null)}>Cancelar</Button>
          <Button variant="danger" loading={deleteEstudiante.isPending} onClick={confirmDelete}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
