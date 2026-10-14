import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent } from '@/shared/ui';
import { formatDate, claseHorarioLabel } from '@/shared/utils/helpers';
import { useCalendar } from '../hooks/useAsistencias';
import { useFicha } from '@/features/fichas/hooks/useFichas';
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

function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Una clase solo cuenta como realizada si el flag está activo Y su día ya pasó (o es hoy). */
function esRealizada(fecha: string, realizada: boolean): boolean {
  return realizada && fecha <= todayLocal();
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

  const clasesFicha = useMemo(
    () =>
      (clases ?? [])
        .filter(c => c.fichaId === fichaId)
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora)),
    [clases, fichaId],
  );

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Clases</span>
              <span className="text-sm font-semibold tabular-nums text-gray-800">
                {clasesFicha.length}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-gray-900">Clases</h3>
          <p className="text-sm text-gray-500">
            {`${clasesFicha.length} ${clasesFicha.length === 1 ? 'clase' : 'clases'} en el período`}
          </p>
        </div>
      </div>

      <Card variant="default" padding="none">
        <CardContent className="p-0">
          <div className="border-y border-gray-200 overflow-x-auto p-4">
            {clasesFicha.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>No hay clases registradas para esta ficha en el período</p>
              </div>
            ) : (
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
                  <tr className="rounded-xl bg-navy-900 text-sm font-semibold text-white">
                    <th className="rounded-l-xl px-4 py-3 text-left">Día</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-2 py-3 text-center">Horario</th>
                    <th className="px-2 py-3 text-center">Modalidad</th>
                    <th className="px-2 py-3 text-center">Estado</th>
                    <th className="rounded-r-xl px-2 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {clasesFicha.map(clase => (
                    <tr key={clase.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors align-middle">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatDate(clase.fecha, 'long')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {formatDate(clase.fecha)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-center tabular-nums text-sm text-gray-500">
                        {claseHorarioLabel(clase, formato)}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          clase.modalidad === 'PRESENCIAL' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {clase.modalidad === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          esRealizada(clase.fecha, clase.realizada) ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {esRealizada(clase.fecha, clase.realizada) ? 'Realizada' : 'Pendiente'}
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
    </div>
  );
}
