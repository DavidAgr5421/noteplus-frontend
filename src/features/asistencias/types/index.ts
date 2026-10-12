import { z } from 'zod';

export interface Clase {
  id: string;
  fichaId: string;
  fecha: string;
  hora: string;
  horaFin?: string | null;
  duracionMinutos?: number | null;
  modalidad: 'PRESENCIAL' | 'VIRTUAL';
  realizada: boolean;
  observacion: string | null;
  ficha?: {
    id: string;
    nombre: string;
    codigo: string;
    trimestre?: string | null;
  };
}

export interface Asistencia {
  id: string;
  claseId: string;
  estudianteId: string;
  estado: 'ASISTIO' | 'NO_ASISTIO';
  justificacion: string | null;
  estudiante?: {
    id: string;
    nombre: string;
    identificacion: string;
  };
}

export interface AsistenciaFormData {
  estudianteId: string;
  estado: 'ASISTIO' | 'NO_ASISTIO';
  justificacion: string;
}

export const asistenciaSchema = z.object({
  estudianteId: z.string(),
  estado: z.enum(['ASISTIO', 'NO_ASISTIO']),
  justificacion: z.string().optional(),
});

export const claseUpdateSchema = z.object({
  modalidad: z.enum(['PRESENCIAL', 'VIRTUAL']),
  realizada: z.boolean(),
  observacion: z.string().optional(),
});