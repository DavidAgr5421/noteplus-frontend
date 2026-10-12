import { z } from 'zod';

export const fichaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  fechaInicio: z.string().min(1, 'La fecha de inicio es requerida'),
  trimestre: z.string().min(1, 'El trimestre es requerido').max(20, 'Máximo 20 caracteres'),
  totalClases: z.coerce.number().int().positive('El total de clases debe ser un número positivo'),
  notaMinimaAprobacion: z.coerce.number().min(0).max(5, 'La nota mínima debe estar entre 0 y 5'),
});

export type FichaFormData = z.infer<typeof fichaSchema>;

export interface FichaHorario {
  diaSemana: number;
  hora: string;
  duracionMinutos: number;
}

export interface FichaWithHorarios extends FichaFormData {
  horarios: FichaHorario[];
}

export interface Ficha {
  id: string;
  instructorId: string;
  codigo: string;
  nombre: string;
  fechaInicio: string;
  trimestre: string;
  totalClases: number;
  notaMinimaAprobacion: number;
  archivada: boolean;
  finalizada: boolean;
  horarios?: FichaHorario[];
  createdAt?: string;
  updatedAt?: string;
}