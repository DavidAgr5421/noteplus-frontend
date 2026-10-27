export type NotificacionTipo = 'clase_proxima' | 'actividad_por_expirar' | 'ficha_culminada' | 'riesgo_desercion';

export interface Notificacion {
  id: string;
  tipo: NotificacionTipo;
  titulo: string;
  mensaje: string;
  link: string;
  fecha: string | null;
}

export interface NotificacionesResponse {
  notificaciones: Notificacion[];
}
