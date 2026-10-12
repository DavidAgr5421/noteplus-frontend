import { z } from 'zod';

/** Tipos de documento de identidad colombianos (Registraduría / Migración Colombia). */
export const TIPOS_IDENTIFICACION = [
  { valor: 'CC', etiqueta: 'CC · Cédula de Ciudadanía' },
  { valor: 'TI', etiqueta: 'TI · Tarjeta de Identidad' },
  { valor: 'CE', etiqueta: 'CE · Cédula de Extranjería' },
  { valor: 'PA', etiqueta: 'PA · Pasaporte' },
  { valor: 'PEP', etiqueta: 'PEP · Permiso Especial de Permanencia' },
  { valor: 'PPT', etiqueta: 'PPT · Permiso por Protección Temporal' },
  { valor: 'RC', etiqueta: 'RC · Registro Civil de Nacimiento' },
] as const;

export type TipoIdentificacion = (typeof TIPOS_IDENTIFICACION)[number]['valor'];

export const estudianteSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  tipoIdentificacion: z.enum(['CC', 'TI', 'CE', 'PA', 'PEP', 'PPT', 'RC']),
  identificacion: z.string().min(1, 'La identificación es requerida'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  contacto: z.string().max(320).optional().or(z.literal('')),
});

export type EstudianteFormData = z.infer<typeof estudianteSchema>;

export interface Estudiante {
  id: string;
  fichaId: string;
  nombre: string;
  identificacion: string;
  tipoIdentificacion: string;
  email: string | null;
  contacto: string | null;
}