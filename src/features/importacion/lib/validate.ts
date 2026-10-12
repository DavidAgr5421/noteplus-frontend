import type { EstudianteImportado, RowIssue } from './types';
import { TIPOS_IDENTIFICACION } from '@/features/estudiantes/types';

const TIPOS: Set<string> = new Set(TIPOS_IDENTIFICACION.map((t) => t.valor));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida un registro normalizado; devuelve lista de problemas (vacía = válido). */
export function validateRecord(r: EstudianteImportado): string[] {
  const issues: string[] = [];
  if (!r.nombre || r.nombre.length < 2) issues.push('nombre requerido (mín. 2 caracteres)');
  if (!r.identificacion) issues.push('identificación requerida');
  if (r.identificacion && !/^\d{4,12}$/.test(r.identificacion.trim())) {
    issues.push('identificación debe ser numérica (4-12 dígitos)');
  }
  if (!TIPOS.has(r.tipoIdentificacion)) issues.push(`tipo doc inválido: ${r.tipoIdentificacion}`);
  if (r.email && !EMAIL_RE.test(r.email.trim())) issues.push(`email inválido: ${r.email}`);
  return issues;
}

export function validateRecords(records: EstudianteImportado[]): RowIssue[] {
  const issues: RowIssue[] = [];
  const seen = new Map<string, number>();
  records.forEach((r, i) => {
    for (const m of validateRecord(r)) issues.push({ row: i + 1, message: `Fila ${i + 1}: ${m}` });
    if (r.identificacion) {
      if (seen.has(r.identificacion)) {
        issues.push({
          row: i + 1,
          message: `Fila ${i + 1}: identificación ${r.identificacion} duplicada en el lote (fila ${seen.get(r.identificacion)})`,
        });
      } else seen.set(r.identificacion, i + 1);
    }
  });
  return issues;
}
