import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/shared/ui';
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-navy-900 dark:hover:text-emerald-300 transition-colors cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </button>
      </div>

      <div
        className="rounded-3xl px-5 py-4 panel-fade"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full bg-green-500" aria-hidden="true"></span>
          <p className="truncate text-[1.8rem] font-bold leading-tight text-gray-900 dark:text-white">
            {isEditing ? 'Editar Ficha' : 'Nueva Ficha'}
          </p>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          {isEditing
            ? 'Modifica los datos de la ficha'
            : 'Crea una nueva ficha para gestionar estudiantes y notas'}
        </p>
      </div>

      <Card variant="default" padding="none">
        <CardContent className="p-4 sm:p-6">
          <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
            Completa los datos de la ficha. Los horarios se usarán para generar las clases automáticamente.
          </p>
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
            submitLabel={isEditing ? 'Actualizar' : 'Crear ficha'}
          />
        </CardContent>
      </Card>
    </div>
  );
}