import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/shared/ui';
import { useFicha, useCreateFicha, useUpdateFicha } from '../hooks/useFichas';
import { FichaForm } from '../components/FichaForm';
import { formatDateForInput } from '@/shared/utils/helpers';

export function FichaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: ficha } = useFicha(id || '');
  const createFicha = useCreateFicha();
  const updateFicha = useUpdateFicha();

  const handleSubmit = async (data: any) => {
    try {
      if (isEditing) {
        await updateFicha.mutateAsync({ id: id!, data });
      } else {
        await createFicha.mutateAsync(data);
      }
      navigate('/fichas');
    } catch (error) {
      console.error('Error saving ficha:', error);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
            initialData={ficha ? {
              ...ficha,
              fechaInicio: formatDateForInput(ficha.fechaInicio),
              horarios: [],
            } : undefined}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/fichas')}
            isLoading={createFicha.isPending || updateFicha.isPending}
            submitLabel={isEditing ? 'Actualizar' : 'Crear ficha'}
          />
        </CardContent>
      </Card>
    </div>
  );
}