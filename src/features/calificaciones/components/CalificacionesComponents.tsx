import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Actividad, NotaFinal, ActividadFormData } from '../types';
import { Button, Input, Select, Modal } from '@/shared/ui';
import { actividadSchema } from '../types';
import { calculateLiveGrades } from '../utils/gradeCalculator';

interface ActividadTreeProps {
  actividades: Actividad[];
  onAdd: (parentId: string | null) => void;
  onEdit: (actividad: Actividad) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  readonly?: boolean;
}

export function ActividadTree({ actividades, onAdd, onEdit, onDelete, disabled, readonly }: ActividadTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rootActividades = actividades.filter(a => !a.parentId);
  const childrenMap = useMemo(() => {
    const map = new Map<string, Actividad[]>();
    actividades.forEach(a => {
      if (a.parentId) {
        if (!map.has(a.parentId)) map.set(a.parentId, []);
        map.get(a.parentId)!.push(a);
      }
    });
    return map;
  }, [actividades]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderActividad = (actividad: Actividad, level = 0) => {
    const children = childrenMap.get(actividad.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(actividad.id);
    const totalPorcentaje = children.reduce((sum, c) => sum + c.porcentaje, 0);

    return (
      <div key={actividad.id}>
        <div className={`flex items-center gap-2 pl-${4 + level * 4}`}>
          {hasChildren && (
            <button
              onClick={() => toggleExpand(actividad.id)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {isExpanded ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{actividad.nombre}</span>
            <span className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">
              {actividad.porcentaje.toFixed(1)}%
            </span>
            {hasChildren && (
              <span className={`text-xs px-2 py-0.5 rounded ${totalPorcentaje === 100 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {totalPorcentaje.toFixed(1)}% / 100%
              </span>
            )}
            {!readonly && !disabled && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => onAdd(actividad.id)} disabled={disabled || hasChildren}>
                  + Sub
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(actividad)} disabled={disabled}>
                  Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => onDelete(actividad.id)} disabled={disabled}>
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-gray-200 dark:border-white/10 ml-6 mt-1">
            {children.map(child => renderActividad(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {rootActividades.map(actividad => renderActividad(actividad))}
      {!readonly && !disabled && rootActividades.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-slate-400">
          <p>No hay actividades. Agrega la primera actividad principal.</p>
        </div>
      )}
      {!readonly && !disabled && (
        <Button variant="outline" onClick={() => onAdd(null)} className="w-full">
          + Agregar actividad principal
        </Button>
      )}
    </div>
  );
}

interface ActividadFormProps {
  initialData?: Partial<ActividadFormData>;
  onSubmit: (data: ActividadFormData) => void;
  onClose: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  parentOptions: Array<{ value: string; label: string }>;
  isSubactividad?: boolean;
}

export function ActividadForm({ initialData, onSubmit, onClose, isLoading, submitLabel, parentOptions, isSubactividad }: ActividadFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ActividadFormData>({
    resolver: zodResolver(actividadSchema),
    defaultValues: {
      parentId: null,
      nombre: '',
      fechaLimite: null,
      porcentaje: 0,
      ...initialData,
    },
  });

  const porcentaje = watch('porcentaje') ?? 0;
  const [porcentajeInput, setPorcentajeInput] = useState<string | null>(null);

  const handleSliderChange = (v: number) => {
    setPorcentajeInput(null);
    setValue('porcentaje', v, { shouldValidate: true });
  };

  const handlePorcentajeInputChange = (raw: string) => {
    setPorcentajeInput(raw);
    const v = parseFloat(raw.replace(',', '.'));
    if (raw.trim() !== '' && !Number.isNaN(v)) {
      setValue('porcentaje', Math.min(100, Math.max(0, v)), { shouldValidate: true });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isSubactividad && (
        <Select
          label="Actividad padre"
          options={parentOptions}
          placeholder="Seleccionar actividad padre"
          error={errors.parentId?.message}
          {...register('parentId')}
        />
      )}
      <Input
        label="Nombre"
        placeholder="Ej: Examen parcial, Tarea 1, Proyecto final"
        error={errors.nombre?.message}
        {...register('nombre')}
      />
      <Input
        label="Fecha límite (opcional)"
        type="date"
        error={errors.fechaLimite?.message}
        {...register('fechaLimite')}
      />
      <div>
        <label htmlFor="porcentaje" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Porcentaje
        </label>
        <div className="flex items-center gap-3">
          <input
            id="porcentaje"
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={porcentaje}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            className="slider-verde-navy w-full"
            style={{ '--slider-pct': `${porcentaje}%` } as CSSProperties}
            aria-valuetext={`${porcentaje.toFixed(1)}%`}
          />
          <div className="flex shrink-0 items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              aria-label="Porcentaje en número"
              value={porcentajeInput ?? porcentaje.toFixed(1)}
              onChange={(e) => handlePorcentajeInputChange(e.target.value)}
              onBlur={() => setPorcentajeInput(null)}
              className="w-20 rounded-full border border-gray-300 dark:border-white/15 bg-white dark:bg-slate-950 px-3 py-1 text-sm text-right tabular-nums shadow-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600 dark:text-slate-100"
            />
            <span className="text-sm font-medium text-gray-500 dark:text-slate-400">%</span>
          </div>
        </div>
        {errors.porcentaje && (
          <p className="mt-1 text-sm text-red-600 dark:text-rose-400" role="alert">{errors.porcentaje.message}</p>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="success" loading={isLoading}>{submitLabel || 'Crear'}</Button>
      </div>
    </form>
  );
}

interface FichaNotas {
  fichaId: string;
  notaMinimaAprobacion: number;
  actividades: Actividad[];
  estudiantes: NotaFinal[];
}

interface NotasTableProps {
  data: FichaNotas;
  finalizada: boolean;
  onNotaChange: (actividadId: string, estudianteId: string, nota: number) => void;
}

export function NotasTable({ data, finalizada, onNotaChange }: NotasTableProps) {
  // Grupos de columnas: cada actividad padre agrupa sus subactividades (hojas);
  // las actividades principales sin hijos van como columna simple.
  const groups = useMemo(() => {
    const result: { parent: Actividad | null; leaves: Actividad[] }[] = [];
    const groupedIds = new Set<string>();
    data.actividades.filter(a => !a.parentId).forEach(root => {
      const kids = data.actividades.filter(a => a.parentId === root.id);
      if (kids.length > 0) {
        result.push({ parent: root, leaves: kids });
        kids.forEach(k => groupedIds.add(k.id));
      } else {
        result.push({ parent: null, leaves: [root] });
      }
      groupedIds.add(root.id);
    });
    // Hojas huérfanas (defensivo: no deberían existir con profundidad máx. 2)
    data.actividades
      .filter(a => !groupedIds.has(a.id) && !data.actividades.some(c => c.parentId === a.id))
      .forEach(a => result.push({ parent: null, leaves: [a] }));
    return result;
  }, [data.actividades]);

  const leafColumns = useMemo(() => groups.flatMap(g => g.leaves), [groups]);
  const totalCols = 1 + leafColumns.length + 3;

  // Borradores locales: el tipeo se ve al instante sin esperar el refetch tras guardar.
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  useEffect(() => { setDrafts({}); }, [data.fichaId]);

  const getDraft = (estudianteId: string, actividadId: string): string | undefined => {
    const byStudent = drafts[estudianteId];
    if (!byStudent) return undefined;
    return byStudent[actividadId];
  };

  const handleInputChange = (actividadId: string, estudianteId: string, raw: string) => {
    setDrafts(prev => ({
      ...prev,
      [estudianteId]: { ...(prev[estudianteId] ?? {}), [actividadId]: raw },
    }));
    // Vacío se informa como 0 para que al borrar se guarde 0 (el campo sigue mostrando vacío).
    const norm = raw.trim() === '' ? '0' : raw;
    const v = parseFloat(norm.replace(',', '.'));
    if (!Number.isNaN(v)) {
      onNotaChange(actividadId, estudianteId, v);
    }
  };

  // Notas en vivo: mezcla valores guardados + borradores válidos y recalcula
  // con la misma lógica del backend, así acumulada/final/estado varían al tipear.
  const liveByStudent = useMemo(() => {
    const nodes = data.actividades.map(a => ({ id: a.id, porcentaje: a.porcentaje, parentId: a.parentId }));
    const out: Record<string, { notaFinal: number; notaAcumulada: number; estado: 'APROBADO' | 'NO_APROBADO' }> = {};
    data.estudiantes.forEach(row => {
      const merged: Record<string, number> = { ...row.actividades };
      const studentDrafts = drafts[row.estudianteId];
      if (studentDrafts) {
        Object.entries(studentDrafts).forEach(([actId, raw]) => {
          const norm = raw.trim() === '' ? '0' : raw;
          const v = parseFloat(norm.replace(',', '.'));
          if (!Number.isNaN(v)) merged[actId] = v;
        });
      }
      const r = calculateLiveGrades(nodes, merged, data.notaMinimaAprobacion);
      out[row.estudianteId] = { notaFinal: r.notaFinal, notaAcumulada: r.notaAcumulada ?? 0, estado: r.estado };
    });
    return out;
  }, [data, drafts]);

  const thTop = 'px-4 py-3 text-xs font-semibold uppercase tracking-wider';
  const thSub = 'border-t border-white/10 px-4 py-2 text-center text-xs font-medium normal-case tracking-normal';

  return (
    <div>
      <div className="overflow-x-auto rounded-xl dark:bg-black">
        <table className="w-full border-collapse text-sm dark:bg-black">
          <thead className="bg-navy-900 dark:bg-[#071626] text-white">
            <tr>
              <th rowSpan={2} scope="col" className={`rounded-tl-xl text-left ${thTop}`}>Estudiante</th>
              {groups.map(g => g.parent ? (
                <th key={g.parent.id} colSpan={g.leaves.length} scope="colgroup" className={`border-l border-white/10 text-center ${thTop}`}>
                  {g.parent.nombre}
                </th>
              ) : (
                <th key={g.leaves[0].id} rowSpan={2} scope="col" className={`border-l border-white/10 text-center ${thTop}`}>
                  {g.leaves[0].nombre}
                </th>
              ))}
              <th rowSpan={2} scope="col" className={`border-l border-white/10 text-center ${thTop}`}>Nota acum.</th>
              <th rowSpan={2} scope="col" className={`border-l border-white/10 text-center ${thTop}`}>Nota final</th>
              <th rowSpan={2} scope="col" className={`rounded-tr-xl border-l border-white/10 text-center ${thTop}`}>Estado</th>
            </tr>
            <tr>
              {groups.flatMap(g => g.parent ? g.leaves : []).map(leaf => (
                <th key={leaf.id} scope="col" className={`border-l border-white/10 ${thSub}`}>
                  {leaf.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10 dark:bg-black">
            {data.estudiantes.length === 0 ? (
              <tr className="dark:bg-black">
                <td colSpan={totalCols} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                  No hay estudiantes en esta ficha
                </td>
              </tr>
            ) : (
              data.estudiantes.map(row => (
                <tr key={row.estudianteId} className="dark:bg-black hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{row.estudianteNombre}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{row.estudianteIdentificacion}</p>
                  </td>
                  {leafColumns.map(act => (
                    <td key={act.id} className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={getDraft(row.estudianteId, act.id) ?? row.actividades[act.id] ?? ''}
                        onChange={(e) => handleInputChange(act.id, row.estudianteId, e.target.value)}
                        disabled={finalizada}
                        className="nota-input w-24"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 dark:text-white">{liveByStudent[row.estudianteId].notaAcumulada.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-lg text-gray-900 dark:text-white">{liveByStudent[row.estudianteId].notaFinal.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      liveByStudent[row.estudianteId].estado === 'APROBADO'
                        ? 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : 'bg-[#a16074]/15 text-[#8e5063] dark:bg-[#a16074]/25 dark:text-[#e2a8b8]'
                    }`}>
                      {liveByStudent[row.estudianteId].estado}
                    </span>
                  </td>
                </tr>
              )))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ActividadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ActividadFormData) => void;
  initialData?: Partial<ActividadFormData> & { id?: string };
  isLoading?: boolean;
  title?: string;
  parentOptions: Array<{ value: string; label: string }>;
  isSubactividad?: boolean;
}

export function ActividadModal({ isOpen, onClose, onSubmit, initialData, isLoading, title, parentOptions, isSubactividad }: ActividadModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || (initialData?.id ? 'Editar actividad' : 'Nueva actividad')}
      headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
      titleClassName="text-lg font-semibold text-white"
      closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      <ActividadForm
        initialData={initialData}
        onSubmit={onSubmit}
        onClose={onClose}
        isLoading={isLoading}
        submitLabel={initialData?.id ? 'Actualizar' : 'Crear'}
        parentOptions={parentOptions}
        isSubactividad={isSubactividad}
      />
    </Modal>
  );
}