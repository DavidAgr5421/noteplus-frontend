import { useState, useEffect } from 'react';
import type { Clase, Asistencia, AsistenciaFormData } from '../types';
import { Button, Select, Input, Modal } from '@/shared/ui';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { useUpdateClase } from '../hooks/useAsistencias';
import { formatDate, claseHorarioLabel } from '@/shared/utils/helpers';

interface ClaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clase: Clase | null;
  onMarcarAsistencias: (clase: Clase) => void;
}

/** Modal al dar click en la tarjeta del calendario: info + modalidad editable + entrar a asistencias. */
export function ClaseDetailModal({ isOpen, onClose, clase, onMarcarAsistencias }: ClaseDetailModalProps) {
  const [modalidad, setModalidad] = useState<'PRESENCIAL' | 'VIRTUAL'>('PRESENCIAL');
  const [saveError, setSaveError] = useState(false);
  const updateClase = useUpdateClase();
  const { formato } = useFormatoHora();

  useEffect(() => {
    if (isOpen && clase) {
      setModalidad(clase.modalidad);
      setSaveError(false);
    }
  }, [isOpen, clase]);

  if (!clase) return null;
  const fichaNombre = clase.ficha?.nombre || 'Ficha';
  const fichaCodigo = clase.ficha?.codigo || '';
  const trimestre = clase.ficha?.trimestre || '';

  const changeModalidad = (value: 'PRESENCIAL' | 'VIRTUAL') => {
    if (value === modalidad || updateClase.isPending) return;
    setModalidad(value);
    setSaveError(false);
    updateClase.mutate(
      { claseId: clase.id, data: { modalidad: value, realizada: clase.realizada } },
      { onError: () => { setModalidad(clase.modalidad); setSaveError(true); } }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formatDate(clase.fecha, 'long')}
      headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
      titleClassName="text-lg font-semibold capitalize text-white"
      closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{fichaNombre}</p>
              {fichaCodigo && (
                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:text-slate-300">
                  {fichaCodigo}
                </span>
              )}
            </div>
            {trimestre && (
              <span className="shrink-0 text-sm font-medium text-gray-500 dark:text-slate-400">{trimestre}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">
            Horario: <span className="font-medium tabular-nums">{claseHorarioLabel(clase, formato)}</span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-gray-100 dark:bg-white/10 p-1" role="group" aria-label="Modalidad de la clase">
            {(['PRESENCIAL', 'VIRTUAL'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => changeModalidad(m)}
                aria-pressed={modalidad === m}
                disabled={updateClase.isPending}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  modalidad === m
                    ? 'bg-navy-900 text-green-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {m === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}
              </button>
            ))}
          </div>
          <Button variant="navy" size="sm" onClick={() => onMarcarAsistencias(clase)}>Asistencias</Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400" role="status">
          {updateClase.isPending ? 'Guardando…' : saveError ? 'No se pudo guardar, reintentá' : 'El cambio se guarda automáticamente'}
        </p>
      </div>
    </Modal>
  );
}

interface JustificacionModalProps {
  isOpen: boolean;
  estudianteNombre: string;
  initialValue: string;
  onClose: () => void;
  onSave: (justificacion: string) => void;
}

/** Modal para añadir o ver la justificación de un estudiante. */
export function JustificacionModal({ isOpen, estudianteNombre, initialValue, onClose, onSave }: JustificacionModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Justificación"
      headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
      titleClassName="text-lg font-semibold text-white"
      closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      <p className="text-xl font-bold text-gray-900 dark:text-white">{estudianteNombre}</p>
      <label className="mt-3 block text-sm font-medium text-gray-700 dark:text-slate-300" htmlFor="justificacion-text">
        Motivo de la inasistencia
      </label>
      <textarea
        id="justificacion-text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Ej: Incapacidad médica, cita prioritaria…"
        className="mt-1 w-full rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-slate-950 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-slate-100 placeholder-slate-400"
      />
      <div className="mt-4 flex justify-end">
        <Button variant="navy" size="sm" onClick={() => { onSave(value.trim()); onClose(); }}>Guardar justificación</Button>
      </div>
    </Modal>
  );
}

interface ClaseCardProps {
  clase: Clase;
  onClick?: () => void;
  isToday?: boolean;
  dimmed?: boolean;
}

/** ¿La clase está en curso ahora? Hoy + hora actual dentro de [hora, hora + duración). */
function isClaseAhora(fecha: string, hora: string, duracionMinutos?: number | null): boolean {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  if (fecha.slice(0, 10) !== `${yyyy}-${mm}-${dd}`) return false;
  const [h, m] = hora.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const startMin = h * 60 + m;
  return nowMin >= startMin && nowMin < startMin + (duracionMinutos || 120);
}

export function ClaseCard({ clase, onClick, isToday, dimmed }: ClaseCardProps) {
  const ahora = !!isToday && isClaseAhora(clase.fecha, clase.hora, clase.duracionMinutos);
  const { formato } = useFormatoHora();

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${clase.ficha?.nombre || 'Ficha'} ${clase.ficha?.codigo || ''} · ${claseHorarioLabel(clase, formato)}`}
      className={`group flex w-full items-center gap-2 rounded-lg bg-transparent px-1 py-0.5 text-left transition-all duration-150 hover:scale-[1.03] hover:bg-black ${dimmed ? 'opacity-40 saturate-50' : ''} ${!clase.realizada ? 'opacity-60' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 transition-colors ${
          ahora ? 'border-navy-400 bg-navy-400' : 'border-navy-900 bg-transparent group-hover:border-white'
        }`}
      />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-xs font-semibold text-gray-800 dark:text-slate-100 transition-colors group-hover:text-white">
          {clase.ficha?.nombre || 'Ficha'} {clase.ficha?.codigo || ''}
        </span>
        <span className="block text-[11px] tabular-nums text-gray-500 dark:text-slate-400 transition-colors group-hover:text-white">
          {claseHorarioLabel(clase, formato)}
        </span>
      </span>
    </button>
  );
}

interface AsistenciaRowProps {
  asistencia: Asistencia & { estudiante: { id: string; nombre: string; identificacion: string } };
  onChange: (estudianteId: string, data: Partial<AsistenciaFormData>) => void;
  disabled?: boolean;
}

export function AsistenciaRow({ asistencia, onChange, disabled }: AsistenciaRowProps) {
  return (
    <tr className={!asistencia.estudiante ? 'bg-gray-50' : ''}>
      <td className="px-4 py-3 text-gray-900 dark:text-slate-100">
        {asistencia.estudiante?.nombre || 'Estudiante no encontrado'}
      </td>
      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">
        {asistencia.estudiante?.identificacion || '-'}
      </td>
      <td className="px-4 py-3">
        <Select
          value={asistencia.estado}
          onChange={(e) => onChange(asistencia.estudianteId, { estado: e.target.value as 'ASISTIO' | 'NO_ASISTIO' })}
          disabled={disabled}
          options={[
            { value: 'ASISTIO', label: 'Asistió' },
            { value: 'NO_ASISTIO', label: 'No asistió' },
          ]}
          className="w-full"
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="text"
          placeholder="Justificación (opcional)"
          value={asistencia.justificacion || ''}
          onChange={(e) => onChange(asistencia.estudianteId, { justificacion: e.target.value })}
          disabled={disabled || asistencia.estado === 'ASISTIO'}
          className="w-full"
        />
      </td>
    </tr>
  );
}

interface AsistenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  clase: Clase;
  asistencias: Asistencia[];
  estudiantes: Array<{ id: string; nombre: string; identificacion: string }>;
  onSave: (asistencias: AsistenciaFormData[]) => void;
  loading?: boolean;
}

export function AsistenciaModal({ isOpen, onClose, clase, asistencias, estudiantes, onSave, loading }: AsistenciaModalProps) {
  const [localAsistencias, setLocalAsistencias] = useState<Record<string, AsistenciaFormData>>({});
  const { formato } = useFormatoHora();

  useEffect(() => {
    const initial: Record<string, AsistenciaFormData> = {};
    estudiantes.forEach((est) => {
      const existing = asistencias.find(a => a.estudianteId === est.id);
      initial[est.id] = {
        estudianteId: est.id,
        estado: existing?.estado || 'ASISTIO',
        justificacion: existing?.justificacion || '',
      };
    });
    setLocalAsistencias(initial);
  }, [asistencias, estudiantes]);

  const handleChange = (estudianteId: string, data: Partial<AsistenciaFormData>) => {
    setLocalAsistencias(prev => ({
      ...prev,
      [estudianteId]: { ...prev[estudianteId], ...data },
    }));
  };

  const handleSave = () => {
    const data = Object.values(localAsistencias);
    onSave(data);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Asistencia - ${clase.ficha?.nombre}`} size="lg">
      <div className="mb-4">
        <p className="text-gray-600 dark:text-slate-400">
          {formatDate(clase.fecha, 'long')} · {claseHorarioLabel(clase, formato)} · {clase.modalidad}
        </p>
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/10">
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Estudiante</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Identificación</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Estado</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Justificación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {estudiantes.map((est) => (
              <AsistenciaRow
                key={est.id}
                asistencia={{
                  ...localAsistencias[est.id],
                  estudianteId: est.id,
                  id: asistencias.find(a => a.estudianteId === est.id)?.id || '',
                  claseId: clase.id,
                } as Asistencia & { estudiante: { id: string; nombre: string; identificacion: string } }}
                onChange={handleChange}
                disabled={loading}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleSave} loading={loading}>Guardar asistencias</Button>
      </div>
    </Modal>
  );
}