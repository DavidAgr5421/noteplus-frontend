import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFicha, useFichas, useCreateFicha, useUpdateFicha } from '../hooks/useFichas';
import { FichaForm } from '../components/FichaForm';
import {
  extractScheduleConflictFromError,
  type ScheduleConflictData,
} from '../components/ScheduleConflictAlert';
import { formatDateForInput } from '@/shared/utils/helpers';

export function FichaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: ficha } = useFicha(id || '');
  const { data: activeFichas = [] } = useFichas(false);
  const createFicha = useCreateFicha();
  const updateFicha = useUpdateFicha();
  const [serverConflict, setServerConflict] = useState<ScheduleConflictData | null>(null);

  const handleSubmit = async (data: any) => {
    setServerConflict(null);
    try {
      if (isEditing) {
        await updateFicha.mutateAsync({ id: id!, data });
      } else {
        await createFicha.mutateAsync(data);
      }
      navigate('/fichas');
    } catch (error) {
      const conflict = extractScheduleConflictFromError(error, isEditing ? 'modificar' : 'crear');
      if (conflict) {
        setServerConflict(conflict);
      } else {
        console.error('Error saving ficha:', error);
      }
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isEditing && id ? `/fichas/${id}` : '/fichas');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* 1. Cabecera y Navegación */}
      <div className="flex flex-col gap-3 border-b border-slate-200/90 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="group mb-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          >
            <svg className="h-4 w-4 text-slate-500 transition-transform group-hover:-translate-x-0.5 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Volver a Mis Fichas</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isEditing ? 'Editar Ficha' : 'Crear Nueva Ficha'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isEditing
              ? 'Modifica los datos generales, cupos y horarios formativos de la ficha.'
              : 'Configura los datos del programa formativo, el esquema de horarios y el calendario automático de sesiones.'}
          </p>
        </div>
      </div>

      {/* 2. Formulario Estructurado en Secciones Delimitadas */}
      <FichaForm
        key={ficha?.id ?? 'new'}
        initialData={ficha ? {
          ...ficha,
          fechaInicio: formatDateForInput(ficha.fechaInicio),
          horarios: ficha.horarios ?? [],
        } : undefined}
        activeFichas={activeFichas}
        currentFichaId={id}
        externalConflict={serverConflict}
        onClearExternalConflict={() => setServerConflict(null)}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        isLoading={createFicha.isPending || updateFicha.isPending}
        submitLabel={isEditing ? 'Actualizar Ficha' : 'Crear Ficha'}
      />
    </div>
  );
}
