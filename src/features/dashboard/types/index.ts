export interface AlertaDesercion {
  estudianteId: string;
  nombre: string;
  identificacion: string;
  tipoIdentificacion: string;
  email: string | null;
  contacto: string | null;
  fichaId: string;
  fichaCodigo: string;
  fichaNombre: string;
  totalFallas: number;
  fallasInjustificadas: number;
  totalClasesRealizadas: number;
  porcentajeInasistencia: number;
}

export interface DashboardClaseHoy {
  id: string;
  fichaId: string;
  fichaCodigo: string;
  fichaNombre: string;
  fecha: string;
  hora: string | null;
  modalidad: string;
  realizada: boolean;
  asistenciasRegistradas: number;
  totalEstudiantes: number;
}

export interface DashboardActividadProxima {
  id: string;
  fichaId: string;
  fichaCodigo: string;
  fichaNombre: string;
  nombre: string;
  porcentaje: number;
  fechaLimite: string;
  diasRestantes: number;
  esSubactividad: boolean;
}

export interface DashboardFichaResumen {
  id: string;
  codigo: string;
  nombre: string;
  trimestre: string | number | null;
  activa: boolean;
  totalEstudiantes: number;
  totalClases: number;
  clasesRealizadas: number;
  clasesRestantes: number;
  horarioResumen: string | null;
  estudiantesEnRiesgo: number;
}

export interface DashboardKpis {
  totalFichasActivas: number;
  totalEstudiantes: number;
  clasesHoy: number;
  clasesHoyPendientes: number;
  estudiantesEnRiesgo: number;
}

export interface DashboardData {
  instructorNombre: string;
  fechaActual: string;
  kpis: DashboardKpis;
  clasesHoy: DashboardClaseHoy[];
  alertasDesercion: AlertaDesercion[];
  actividadesProximas: DashboardActividadProxima[];
  fichas: DashboardFichaResumen[];
}
