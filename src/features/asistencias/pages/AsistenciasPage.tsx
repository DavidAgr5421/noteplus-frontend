import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent, Input, Modal } from '@/shared/ui';
import { formatDate, claseHorarioLabel } from '@/shared/utils/helpers';
import { useCalendar, useUpdateClase } from '../hooks/useAsistencias';
import { useFicha } from '@/features/fichas/hooks/useFichas';
import { FichaHeaderCard } from '@/features/fichas/components/FichaHeaderCard';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { ImportHint } from '@/features/importacion';

function addMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Vista de asistencias de una ficha: lista de sus clases con acceso directo a marcar. */
export function AsistenciasPage() {
  const { fichaId } = useParams<{ fichaId: string }>();
  const navigate = useNavigate();
  const { formato } = useFormatoHora();

  const { data: ficha } = useFicha(fichaId || '');

  const from = ficha?.fechaInicio ? ficha.fechaInicio.slice(0, 10) : addMonths(todayStr(), -3);
  const to = addMonths(from, 6);
  const { data: clases, isLoading, error } = useCalendar(from, to);
  const updateClase = useUpdateClase();

  const clasesFicha = useMemo(
    () =>
      (clases ?? [])
        .filter(c => c.fichaId === fichaId)
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora)),
    [clases, fichaId],
  );

  const [busqueda, setBusqueda] = useState('');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [filtroModalidad, setFiltroModalidad] = useState<'todas' | 'PRESENCIAL' | 'VIRTUAL'>('todas');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'realizada' | 'pendiente'>('todas');

  const hayFiltros = busqueda.trim() !== '' || filtroModalidad !== 'todas' || filtroEstado !== 'todas';

  const clasesVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clasesFicha.filter(c => {
      if (filtroModalidad !== 'todas' && c.modalidad !== filtroModalidad) return false;
      if (filtroEstado === 'realizada' && !c.realizada) return false;
      if (filtroEstado === 'pendiente' && c.realizada) return false;
      if (q) {
        const texto = [
          formatDate(c.fecha, 'long'),
          formatDate(c.fecha),
          claseHorarioLabel(c, formato),
          c.modalidad === 'PRESENCIAL' ? 'presencial' : 'virtual',
          c.realizada ? 'realizada' : 'pendiente',
        ].join(' ').toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [clasesFicha, busqueda, filtroModalidad, filtroEstado, formato]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroModalidad('todas');
    setFiltroEstado('todas');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">Error al cargar las clases</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ImportHint ctaLabel="Ir a estudiantes" onCta={() => navigate(`/fichas/${fichaId}/estudiantes`)} />

      <div className="px-4">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Asistencias</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {hayFiltros
              ? `${clasesVisibles.length} de ${clasesFicha.length} clases en el período`
              : `${clasesFicha.length} ${clasesFicha.length === 1 ? 'clase' : 'clases'} en el período`}
          </p>
        </div>
      </div>

      <div className="grid items-center gap-4 px-4 lg:grid-cols-[30%_40%] lg:justify-between [&>*]:min-w-0">
        {ficha && (
          <FichaHeaderCard ficha={ficha} onOpenDetalle={() => navigate(`/fichas/${fichaId}`)} />
        )}
        <div className="flex items-center gap-2 justify-start lg:justify-end">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </svg>
            <Input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              aria-label="Buscar clase por fecha, horario o estado"
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
            {(filtroModalidad !== 'todas' || filtroEstado !== 'todas') && (
              <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <Card variant="default" padding="none" className="dark:bg-black">
        <CardContent className="p-0">
          <div className="border-y border-gray-200 dark:border-white/10 overflow-x-auto p-4 dark:bg-black rounded-2xl">
            {clasesFicha.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-slate-400">
                <p>No hay clases registradas para esta ficha en el período</p>
              </div>
            ) : clasesVisibles.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500 dark:text-slate-400">Sin resultados para la búsqueda o filtros aplicados</p>
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Limpiar búsqueda y filtros
                </button>
              </div>
            ) : (
              <table className="w-full table-fixed border-collapse text-sm dark:bg-black">
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[12%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead>
                  <tr className="rounded-xl bg-navy-900 dark:bg-[#071626] text-sm font-semibold text-white">
                    <th className="rounded-l-xl px-4 py-3 text-left">Día</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-2 py-3 text-center">Horario</th>
                    <th className="px-2 py-3 text-center">Modalidad</th>
                    <th className="px-2 py-3 text-center">Estado</th>
                    <th className="rounded-r-xl px-2 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="dark:bg-black">
                  {clasesVisibles.map(clase => (
                    <tr key={clase.id} className="border-b border-slate-100 dark:border-white/10 dark:bg-black hover:bg-slate-50/70 dark:hover:bg-white/[0.04] transition-colors align-middle">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {formatDate(clase.fecha, 'long')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {formatDate(clase.fecha)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-center tabular-nums text-sm text-gray-500 dark:text-slate-400">
                        {claseHorarioLabel(clase, formato)}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          clase.modalidad === 'PRESENCIAL'
                            ? 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                        }`}>
                          {clase.modalidad === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className="inline-flex items-center justify-center gap-2">
                          <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            clase.realizada
                              ? 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-amber-500/15 dark:text-amber-300'
                          }`}>
                            {clase.realizada ? 'Realizada' : 'Pendiente'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={clase.realizada}
                            aria-label={clase.realizada ? `Marcar clase del ${formatDate(clase.fecha)} como no realizada` : `Marcar clase del ${formatDate(clase.fecha)} como realizada`}
                            title={clase.realizada ? 'Marcar como no realizada' : 'Marcar como realizada'}
                            disabled={updateClase.isPending}
                            onClick={() => updateClase.mutate({ claseId: clase.id, data: { modalidad: clase.modalidad, realizada: !clase.realizada } })}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-navy-900 disabled:opacity-50 ${clase.realizada ? 'bg-green-600' : 'bg-slate-300 hover:bg-slate-400 dark:bg-white/20 dark:hover:bg-white/30'}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${clase.realizada ? 'translate-x-4' : 'translate-x-0.5'}`}
                            />
                          </button>
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center">
                          <Button
                            type="button"
                            variant="navyGreen"
                            size="sm"
                            onClick={() => navigate(`/clases/${clase.id}/asistencias`)}
                            aria-label={`Ver asistencias del ${formatDate(clase.fecha)}`}
                            title="Ver asistencias"
                          >
                            Ver asistencias
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Modalidad</p>
          <div className="inline-flex rounded-full bg-gray-100 dark:bg-white/10 p-1" role="group" aria-label="Filtrar por modalidad">
            {([
              { valor: 'todas', etiqueta: 'Todas' },
              { valor: 'PRESENCIAL', etiqueta: 'Presencial' },
              { valor: 'VIRTUAL', etiqueta: 'Virtual' },
            ] as const).map((op) => (
              <button
                key={op.valor}
                type="button"
                onClick={() => setFiltroModalidad(op.valor)}
                aria-pressed={filtroModalidad === op.valor}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filtroModalidad === op.valor ? 'bg-navy-900 text-green-400' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {op.etiqueta}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Estado</p>
          <div className="inline-flex rounded-full bg-gray-100 dark:bg-white/10 p-1" role="group" aria-label="Filtrar por estado">
            {([
              { valor: 'todas', etiqueta: 'Todas' },
              { valor: 'realizada', etiqueta: 'Realizadas' },
              { valor: 'pendiente', etiqueta: 'Pendientes' },
            ] as const).map((op) => (
              <button
                key={op.valor}
                type="button"
                onClick={() => setFiltroEstado(op.valor)}
                aria-pressed={filtroEstado === op.valor}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filtroEstado === op.valor ? 'bg-navy-900 text-green-400' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
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
    </div>
  );
}
