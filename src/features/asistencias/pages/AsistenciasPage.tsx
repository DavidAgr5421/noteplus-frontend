import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal } from '@/shared/ui';
import { formatDate, claseHorarioLabel } from '@/shared/utils/helpers';
import { useCalendar, useUpdateClase } from '../hooks/useAsistencias';
import { useFicha } from '@/features/fichas/hooks/useFichas';
import { FichaNavTabs } from '@/features/fichas/components/FichaNavTabs';
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

function StatGlyph({ d }: { d: string }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-emerald-400 dark:bg-black dark:text-emerald-400" aria-hidden="true">
        {icon}
      </span>
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 truncate">
          {label}
        </span>
        <span className={`text-base font-bold tabular-nums truncate ${valueClassName ?? 'text-slate-900 dark:text-white'}`}>
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

  const totalClases = ficha?.totalClases || clasesFicha.length;
  const clasesRealizadas = clasesFicha.filter((c) => c.realizada).length;
  const clasesPendientes = Math.max(0, totalClases - clasesRealizadas);
  const avancePct = totalClases > 0 ? Math.round((clasesRealizadas / totalClases) * 100) : 0;
  const totalEstudiantes = ficha?.numeroEstudiantes ?? '…';

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-rose-600 dark:text-rose-400 font-medium">Error al cargar las clases</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ImportHint ctaLabel="Ir a estudiantes" onCta={() => navigate(`/fichas/${fichaId}/estudiantes`)} />

      {/* 1. Navegación y pestañas de la ficha */}
      <div className="px-4">
        <FichaNavTabs
          fichaId={fichaId || ''}
          activeTab="asistencias"
          fichaNombre={ficha?.nombre}
          fichaCodigo={ficha?.codigo}
        />
      </div>

      {/* 2. Resumen de Métricas de Asistencias a ancho completo (sin FichaHeaderCard duplicada) */}
      <div className="px-4">
        <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-black px-5 py-3.5 shadow-sm">
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5 sm:divide-x sm:divide-slate-100 dark:sm:divide-white/10">
            <StatItem
              icon={<span className="text-sm font-bold" aria-hidden="true">%</span>}
              value={`${avancePct}%`}
              label="Avance"
              sublabel="Meta 100%"
              title="Porcentaje de sesiones impartidas"
              valueClassName={`tabular-nums ${avancePct === 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}
            />
            <StatItem
              icon={<StatGlyph d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
              value={String(totalClases)}
              label="Sesiones"
              sublabel={`${clasesFicha.length} en período`}
              title="Total de sesiones programadas"
            />
            <StatItem
              icon={<StatGlyph d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
              value={String(clasesRealizadas)}
              label="Realizadas"
              sublabel="Asistencia tomada"
              valueClassName="text-emerald-700 dark:text-emerald-400"
            />
            <StatItem
              icon={<StatGlyph d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
              value={String(clasesPendientes)}
              label="Pendientes"
              sublabel="Por registrar"
              valueClassName={clasesPendientes > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'}
            />
            <StatItem
              icon={<StatGlyph d="M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.87M15.5 3.13a3.5 3.5 0 010 6.74" />}
              value={String(totalEstudiantes)}
              label="Aprendices"
              sublabel="En la ficha"
            />
          </div>
        </div>
      </div>

      {/* 3. Toolbar y Encabezado de la Sección */}
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Asistencias</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {hayFiltros
              ? `${clasesVisibles.length} de ${clasesFicha.length} clases en el período`
              : `${clasesFicha.length} ${clasesFicha.length === 1 ? 'clase' : 'clases'} en el período`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar clase..."
              aria-label="Buscar clase por fecha, horario o estado"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/15 dark:bg-black dark:text-white sm:w-60 shadow-2xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltrosAbiertos(true)}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/20 bg-white dark:bg-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 shadow-sm transition-colors"
            aria-label="Filtros"
            title="Filtros"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {(filtroModalidad !== 'todas' || filtroEstado !== 'todas') && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* 4. Tabla Rediseñada de Clases */}
      <div className="mx-4 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-black shadow-sm overflow-hidden">
        {clasesFicha.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm font-medium">No hay clases registradas para esta ficha en el período</p>
          </div>
        ) : clasesVisibles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin resultados para la búsqueda o filtros aplicados</p>
            <button
              type="button"
              onClick={limpiarFiltros}
              className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Restablecer búsqueda y filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[12%]" />
                <col className="w-[20%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="bg-[#0B192C] text-emerald-400 text-xs font-semibold uppercase tracking-wider border-y border-[#172a45]">
                  <th scope="col" className="px-4 py-3 text-left">Día</th>
                  <th scope="col" className="px-4 py-3 text-left">Fecha</th>
                  <th scope="col" className="px-2 py-3 text-center">Horario</th>
                  <th scope="col" className="px-2 py-3 text-center">Modalidad</th>
                  <th scope="col" className="px-2 py-3 text-center">Estado</th>
                  <th scope="col" className="px-2 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10 dark:bg-black">
                {clasesVisibles.map(clase => (
                  <tr key={clase.id} className="border-b border-slate-100 dark:border-white/10 dark:bg-black hover:bg-slate-50/70 dark:hover:bg-white/[0.04] transition-colors align-middle">
                    <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white capitalize">
                      {formatDate(clase.fecha, 'long')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {formatDate(clase.fecha)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3.5 text-center font-mono text-xs text-slate-600 dark:text-slate-300">
                      {claseHorarioLabel(clase, formato)}
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                        clase.modalidad === 'PRESENCIAL'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/25'
                      }`}>
                        {clase.modalidad === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      <div className="inline-flex items-center justify-center gap-2">
                        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                          clase.realizada
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25'
                            : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25'
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
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 ${clase.realizada ? 'bg-emerald-600' : 'bg-slate-300 hover:bg-slate-400 dark:bg-white/20 dark:hover:bg-white/30'}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${clase.realizada ? 'translate-x-4' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/clases/${clase.id}/asistencias`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/20 bg-white dark:bg-black px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-zinc-900"
                        aria-label={`Ver asistencias del ${formatDate(clase.fecha)}`}
                        title="Ver asistencias"
                      >
                        <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Ver Asistencia</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={filtrosAbiertos}
        onClose={() => setFiltrosAbiertos(false)}
        title="Filtros de Clases"
        description="Filtra por modalidad y estado de realización"
        size="sm"
      >
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Modalidad</p>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-1" role="group" aria-label="Filtrar por modalidad">
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
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  filtroModalidad === op.valor
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {op.etiqueta}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</p>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-1" role="group" aria-label="Filtrar por estado">
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
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  filtroEstado === op.valor
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
    </div>
  );
}
