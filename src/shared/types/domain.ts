export interface Instructor {
  id: string;
  nombre: string;
  email: string;
}

export interface Ficha {
  id: string;
  instructorId: string;
  codigo: string;
  nombre: string;
  fechaInicio: string;
  totalClases: number;
  notaMinimaAprobacion: number;
  archivada: boolean;
  finalizada: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HorarioFicha {
  id: string;
  fichaId: string;
  diaSemana: number;
  hora: string;
  duracionMinutos: number;
}

export interface Clase {
  id: string;
  fichaId: string;
  fecha: string;
  hora: string;
  modalidad: 'PRESENCIAL' | 'VIRTUAL';
  realizada: boolean;
  observacion: string | null;
}

export interface Estudiante {
  id: string;
  fichaId: string;
  nombre: string;
  identificacion: string;
  email: string | null;
}

export interface Asistencia {
  id: string;
  claseId: string;
  estudianteId: string;
  estado: 'ASISTIO' | 'NO_ASISTIO';
  justificacion: string | null;
}

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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  email: string;
  password: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}