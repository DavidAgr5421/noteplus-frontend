import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Select, CardFooter, Modal } from '@/shared/ui';
import { estudianteSchema, TIPOS_IDENTIFICACION, type EstudianteFormData } from '../types';

interface EstudianteFormProps {
  initialData?: Partial<EstudianteFormData> & { id?: string };
  onSubmit: (data: EstudianteFormData) => void;
  onClose: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function EstudianteForm({ initialData, onSubmit, onClose, isLoading, submitLabel = 'Guardar' }: EstudianteFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<EstudianteFormData>({
    resolver: zodResolver(estudianteSchema),
    defaultValues: {
      nombre: '',
      tipoIdentificacion: 'CC',
      identificacion: '',
      email: '',
      contacto: '',
      ...initialData,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nombre completo"
        placeholder="Juan Pérez"
        error={errors.nombre?.message}
        {...register('nombre')}
      />
      <Select
        label="Tipo de documento"
        options={TIPOS_IDENTIFICACION.map((t) => ({ value: t.valor, label: t.etiqueta }))}
        error={errors.tipoIdentificacion?.message}
        {...register('tipoIdentificacion')}
      />
      <Input
        label="Identificación"
        placeholder="1234567890"
        error={errors.identificacion?.message}
        {...register('identificacion')}
      />
      <Input
        label="Email (opcional)"
        type="email"
        placeholder="juan@ejemplo.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Contacto (opcional)"
        placeholder="Teléfono u otro dato de contacto"
        error={errors.contacto?.message}
        {...register('contacto')}
      />
      <CardFooter className="justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="navy" loading={isLoading}>{submitLabel}</Button>
      </CardFooter>
    </form>
  );
}

interface EstudianteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EstudianteFormData) => void;
  initialData?: Partial<EstudianteFormData> & { id?: string };
  isLoading?: boolean;
  title?: string;
}

export function EstudianteModal({ isOpen, onClose, onSubmit, initialData, isLoading, title }: EstudianteModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || (initialData?.id ? 'Editar estudiante' : 'Nuevo estudiante')}
      description="Ingresa o actualiza la información básica del aprendiz"
    >
      <EstudianteForm
        initialData={initialData}
        onSubmit={(data) => {
          onSubmit(data);
          onClose();
        }}
        onClose={onClose}
        isLoading={isLoading}
        submitLabel={initialData?.id ? 'Actualizar' : 'Crear'}
      />
    </Modal>
  );
}