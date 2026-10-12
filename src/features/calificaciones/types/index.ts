import { z } from 'zod';

export interface Actividad {
  id: string;
  fichaId: string;
  parentId: string | null;
  nombre: string;
  fechaLimite: string | null;
  porcentaje: number;
  orden: number;
  children?: Actividad[];
}

export interface Calificacion {
  id: string;
  actividadId: string;
  estudianteId: string;
  nota: number;
}

export interface NotaFinal {
  estudianteId: string;
  estudianteNombre: string;
  estudianteIdentificacion: string;
  notaFinal: number;
  notaAcumulada: number;
  estado: 'APROBADO' | 'NO_APROBADO';
  actividades: Record<string, number>;
}

export interface FichaNotas {
  fichaId: string;
  notaMinimaAprobacion: number;
  actividades: Actividad[];
  estudiantes: NotaFinal[];
}

export interface ActividadFormData {
  parentId: string | null;
  nombre: string;
  fechaLimite: string | null;
  porcentaje: number;
  orden?: number;
}

export interface CalificacionFormData {
  actividadId: string;
  estudianteId: string;
  nota: number;
}

export const actividadSchema = z.object({
  parentId: z.string().nullable(),
  nombre: z.string().min(1, 'El nombre es requerido'),
  fechaLimite: z.string().nullable(),
  porcentaje: z.number().min(0).max(100),
  orden: z.number().int().min(0).optional(),
});

export const calificacionSchema = z.object({
  actividadId: z.string(),
  estudianteId: z.string(),
  nota: z.number().min(0).max(5),
});