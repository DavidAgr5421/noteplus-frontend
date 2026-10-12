/** Campos canónicos del estudiante + opción de ignorar columna. */
export type CanonicalTarget =
  | 'nombre'
  | 'tipoIdentificacion'
  | 'identificacion'
  | 'email'
  | 'contacto'
  | 'ignorar';

export interface EstudianteImportado {
  nombre: string;
  tipoIdentificacion: string;
  identificacion: string;
  email: string;
  contacto: string;
}

export interface MappingSuggestion {
  sourceIndex: number;
  sourceHeader: string;
  target: CanonicalTarget;
  confidence: number;
  reason: string;
  needsSplit: boolean;
}

export interface RowIssue {
  row: number;
  message: string;
}
