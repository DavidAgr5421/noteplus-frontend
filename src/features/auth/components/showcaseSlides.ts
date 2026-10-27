export type SlideCategory = 'fichas' | 'asistencias' | 'calificaciones' | 'calendario' | 'estudiantes' | 'reportes';

export interface ShowcaseSlide {
  badge: string;
  title: string;
  text: string;
  category: SlideCategory;
}

export const showcaseSlides: ShowcaseSlide[] = [
  {
    badge: 'Gestión Centralizada',
    title: 'Tus fichas, en un solo lugar',
    text: 'Crea, archiva y supervisa fichas de formación académica sin depender de hojas de cálculo dispersas.',
    category: 'fichas',
  },
  {
    badge: 'Control Diario',
    title: 'Asistencias en un solo clic',
    text: 'Registra asistencias por sesión presencial o virtual con control inmediato de inasistencias y justificaciones.',
    category: 'asistencias',
  },
  {
    badge: 'Evaluación Dinámica',
    title: 'Calificaciones sin fricción',
    text: 'Estructura actividades ponderadas y subactividades con cálculo en vivo de notas definitivas y estados de aprobación.',
    category: 'calificaciones',
  },
  {
    badge: 'Planificación Temporal',
    title: 'Calendario de clases inteligente',
    text: 'Organiza tu horario semanal con detección automática de choques y acceso directo a cada clase.',
    category: 'calendario',
  },
  {
    badge: 'Acompañamiento Integral',
    title: 'Seguimiento de aprendices',
    text: 'Monitorea el expediente académico, historial de fallas y alertas preventivas de deserción por cada aprendiz.',
    category: 'estudiantes',
  },
  {
    badge: 'Analítica Institucional',
    title: 'Planillas y reportes listos',
    text: 'Exporta planillas consolidadas a Excel (.xlsx) y genera reportes ejecutivos de rendimiento académico al instante.',
    category: 'reportes',
  },
];
