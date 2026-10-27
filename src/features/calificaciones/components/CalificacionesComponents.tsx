import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Actividad, NotaFinal, ActividadFormData } from '../types';
import { Button, Modal } from '@/shared/ui';
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
  initialData?: Partial<ActividadFormData> & { id?: string };
  onSubmit: (data: ActividadFormData) => void;
  onClose: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  parentOptions: Array<{ value: string; label: string }>;
  isSubactividad?: boolean;
  porcentajeDisponible?: number;
}

export function ActividadForm({
  initialData,
  onSubmit,
  onClose,
  isLoading,
  submitLabel,
  parentOptions,
  isSubactividad,
  porcentajeDisponible,
}: ActividadFormProps) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ActividadFormData>({
    resolver: zodResolver(actividadSchema),
    defaultValues: {
      parentId: null,
      nombre: '',
      fechaLimite: null,
      porcentaje: 0,
      ...initialData,
    },
  });

  useEffect(() => {
    reset({
      parentId: null,
      nombre: '',
      fechaLimite: null,
      porcentaje: 0,
      ...initialData,
    });
  }, [initialData, reset]);

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
      {/* Selector de Actividad Padre si es subactividad */}
      {isSubactividad && (
        <div>
          <label
            htmlFor="actividad-parent"
            className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-1.5 block"
          >
            Actividad Padre
          </label>
          <select
            id="actividad-parent"
            {...register('parentId')}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          >
            <option value="">Seleccionar actividad padre...</option>
            {parentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.parentId && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
              {errors.parentId.message}
            </p>
          )}
        </div>
      )}

      {/* Nombre de la Actividad */}
      <div>
        <label
          htmlFor="actividad-nombre"
          className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-1.5 block"
        >
          Nombre de la Actividad
        </label>
        <input
          id="actividad-nombre"
          type="text"
          placeholder="ej. Evaluación Parcial 1"
          {...register('nombre')}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
        />
        {errors.nombre && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
            {errors.nombre.message}
          </p>
        )}
      </div>

      {/* Fecha Límite */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="actividad-fecha"
            className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400"
          >
            Fecha Límite
          </label>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            (Opcional)
          </span>
        </div>
        <div className="relative">
          <input
            id="actividad-fecha"
            type="date"
            {...register('fechaLimite')}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>
        {errors.fechaLimite && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
            {errors.fechaLimite.message}
          </p>
        )}
      </div>

      {/* Control de Porcentaje / Ponderación */}
      <div>
        <label
          htmlFor="porcentaje"
          className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-1.5 block"
        >
          Porcentaje / Ponderación
        </label>

        {/* Doble control sincronizado: Input numérico */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <input
              id="porcentaje"
              type="text"
              inputMode="decimal"
              aria-label="Porcentaje en número"
              value={porcentajeInput ?? porcentaje.toFixed(1)}
              onChange={(e) => handlePorcentajeInputChange(e.target.value)}
              onBlur={() => setPorcentajeInput(null)}
              className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 pl-3 pr-7 text-center font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
            <span className="pointer-events-none absolute right-2.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
              %
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Peso asignado en la evaluación final
          </span>
        </div>

        {/* Range slider delgado con marcas guía */}
        <div className="mt-3 space-y-1.5">
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={porcentaje}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
            aria-valuetext={`${porcentaje.toFixed(1)}%`}
          />
          <div className="flex justify-between px-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Disponibilidad restante */}
        {porcentajeDisponible !== undefined && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <svg className="h-3.5 w-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Porcentaje restante disponible en la ficha:{' '}
              <strong className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {Math.max(0, porcentajeDisponible).toFixed(1)}%
              </strong>
            </span>
          </div>
        )}

        {errors.porcentaje && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
            {errors.porcentaje.message}
          </p>
        )}
      </div>

      {/* Pie de Acciones del Modal */}
      <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4 mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          {isLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          <span>
            {submitLabel || (initialData?.id ? 'Guardar Cambios' : isSubactividad ? 'Crear Subactividad' : 'Crear Actividad')}
          </span>
        </button>
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
  // Grupos de columnas: cada actividad padre agrupa recursivamente todas sus hojas (hojas de subactividades multinivel);
  // las actividades principales sin hijos van como columna simple.
  const groups = useMemo(() => {
    const result: { parent: Actividad | null; leaves: Actividad[] }[] = [];
    const roots = data.actividades.filter(a => !a.parentId);

    const getLeafNodes = (nodeId: string): Actividad[] => {
      const children = data.actividades.filter(a => a.parentId === nodeId);
      if (children.length === 0) {
        const self = data.actividades.find(a => a.id === nodeId);
        return self ? [self] : [];
      }
      return children.flatMap(child => getLeafNodes(child.id));
    };

    roots.forEach(root => {
      const leaves = getLeafNodes(root.id);
      if (leaves.length === 1 && leaves[0].id === root.id) {
        result.push({ parent: null, leaves: [root] });
      } else if (leaves.length > 0) {
        result.push({ parent: root, leaves });
      }
    });

    const processedIds = new Set(result.flatMap(g => g.leaves.map(l => l.id)));
    data.actividades
      .filter(a => !processedIds.has(a.id) && !data.actividades.some(c => c.parentId === a.id))
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

  const thTop = 'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-emerald-400';
  const thSub = 'border-t border-l border-white/10 px-3 py-1.5 text-center text-[11px] font-medium text-emerald-300/80 normal-case tracking-normal';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-black shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#0B192C] text-emerald-400">
            <tr>
              <th rowSpan={2} scope="col" className={`text-left ${thTop}`}>
                Estudiante
              </th>
              {groups.map(g => g.parent ? (
                <th key={g.parent.id} colSpan={g.leaves.length} scope="colgroup" className={`border-l border-white/15 text-center ${thTop}`}>
                  {g.parent.nombre}
                </th>
              ) : (
                <th key={g.leaves[0].id} rowSpan={2} scope="col" className={`border-l border-white/15 text-center ${thTop}`}>
                  {g.leaves[0].nombre}
                </th>
              ))}
              <th rowSpan={2} scope="col" className="border-l border-white/15 bg-[#071322] px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-emerald-300">
                Acum.
              </th>
              <th rowSpan={2} scope="col" className="border-l border-white/15 bg-[#071322] px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-emerald-400">
                Final
              </th>
              <th rowSpan={2} scope="col" className="border-l border-white/15 bg-[#071322] px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-emerald-300">
                Estado
              </th>
            </tr>
            <tr>
              {groups.flatMap(g => g.parent ? g.leaves : []).map(leaf => (
                <th key={leaf.id} scope="col" className={thSub}>
                  <span className="block truncate max-w-[120px]" title={leaf.nombre}>
                    {leaf.nombre}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10 dark:bg-black">
            {data.estudiantes.length === 0 ? (
              <tr className="dark:bg-black">
                <td colSpan={totalCols} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No hay estudiantes en esta ficha
                </td>
              </tr>
            ) : (
              data.estudiantes.map(row => (
                <tr key={row.estudianteId} className="dark:bg-black hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors align-middle">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white leading-snug">
                      {row.estudianteNombre}
                    </p>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {row.estudianteIdentificacion}
                    </p>
                  </td>
                  {leafColumns.map(act => (
                    <td key={act.id} className="px-2 py-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={getDraft(row.estudianteId, act.id) ?? row.actividades[act.id] ?? ''}
                        onChange={(e) => handleInputChange(act.id, row.estudianteId, e.target.value)}
                        disabled={finalizada}
                        className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center font-mono text-sm font-semibold text-slate-800 transition-colors placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 dark:border-white/15 dark:bg-zinc-950 dark:text-white dark:focus:border-emerald-400 dark:disabled:bg-zinc-900 shadow-2xs"
                        placeholder="0.0"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center bg-slate-50/50 dark:bg-white/[0.01]">
                    <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                      {liveByStudent[row.estudianteId].notaAcumulada.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center bg-slate-50/70 dark:bg-white/[0.02]">
                    <span className={`font-mono text-sm font-bold ${
                      liveByStudent[row.estudianteId].notaFinal >= data.notaMinimaAprobacion
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {liveByStudent[row.estudianteId].notaFinal.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center bg-slate-50/50 dark:bg-white/[0.01]">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                        liveByStudent[row.estudianteId].estado === 'APROBADO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/25'
                      }`}
                    >
                      {liveByStudent[row.estudianteId].estado === 'APROBADO' ? (
                        <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span>{liveByStudent[row.estudianteId].estado === 'APROBADO' ? 'Aprobado' : 'No Aprobado'}</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
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
  subtitle?: string;
  parentOptions: Array<{ value: string; label: string }>;
  isSubactividad?: boolean;
  porcentajeDisponible?: number;
}

export function ActividadModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  title,
  subtitle,
  parentOptions,
  isSubactividad,
  porcentajeDisponible,
}: ActividadModalProps) {
  const isEditing = Boolean(initialData?.id || initialData?.nombre);
  const modalTitle = title || (isEditing ? 'Editar Actividad' : isSubactividad ? 'Nueva Subactividad' : 'Nueva Actividad');
  const modalSubtitle = subtitle || 'Define los parámetros de evaluación y ponderación';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={modalSubtitle}
      size="md"
    >
      <ActividadForm
        initialData={initialData}
        onSubmit={onSubmit}
        onClose={onClose}
        isLoading={isLoading}
        submitLabel={isEditing ? 'Guardar Cambios' : isSubactividad ? 'Crear Subactividad' : 'Crear Actividad'}
        parentOptions={parentOptions}
        isSubactividad={isSubactividad}
        porcentajeDisponible={porcentajeDisponible}
      />
    </Modal>
  );
}