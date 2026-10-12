/** Port fiel de backend/app/domain/services/grade_calculator.py (RN-14 a RN-18).
 *  Cálculo puro sin I/O para previsualizar notas en vivo mientras se tipean.
 *  Mismo orden de operaciones que el backend para resultados bit a bit idénticos.
 */

export interface GradeActividadNode {
  id: string;
  porcentaje: number;
  parentId: string | null;
}

export type GradeEstado = 'APROBADO' | 'NO_APROBADO';

export interface LiveGradeResult {
  notaFinal: number;
  notaFinalRaw: number;
  notaAcumulada: number | null;
  estado: GradeEstado;
}

export function roundHalfUp(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.floor(value * factor + 0.5 + 1e-9) / factor;
}

export function calculateLiveGrades(
  actividades: GradeActividadNode[],
  calificaciones: Record<string, number>,
  notaMinimaAprobacion: number,
): LiveGradeResult {
  const childrenByParent = new Map<string, GradeActividadNode[]>();
  const roots: GradeActividadNode[] = [];
  for (const act of actividades) {
    if (act.parentId === null) {
      roots.push(act);
    } else {
      const list = childrenByParent.get(act.parentId);
      if (list) list.push(act);
      else childrenByParent.set(act.parentId, [act]);
    }
  }

  const effectiveNota = (actividadId: string): number => {
    const children = childrenByParent.get(actividadId);
    if (children && children.length > 0) {
      let s = 0;
      for (const child of children) {
        s += effectiveNota(child.id) * (child.porcentaje / 100);
      }
      return s;
    }
    return calificaciones[actividadId] ?? 0; // RN-17: faltantes = 0
  };

  const isLeafCalified = (actividadId: string): boolean => {
    const children = childrenByParent.get(actividadId);
    if (children && children.length > 0) {
      return children.some(c => isLeafCalified(c.id));
    }
    return actividadId in calificaciones;
  };

  let notaFinalRaw = 0;
  let pesoCalificado = 0;
  let sumaCalificada = 0;

  for (const root of roots) {
    const ne = effectiveNota(root.id);
    notaFinalRaw += ne * (root.porcentaje / 100);
    if (isLeafCalified(root.id)) {
      pesoCalificado += root.porcentaje;
      sumaCalificada += ne * (root.porcentaje / 100);
    }
  }

  let notaAcumulada: number | null = null;
  if (pesoCalificado > 0) {
    notaAcumulada = roundHalfUp(sumaCalificada * (100 / pesoCalificado), 1);
  }

  const notaFinal = roundHalfUp(notaFinalRaw, 1);
  const estado: GradeEstado = notaFinalRaw >= notaMinimaAprobacion ? 'APROBADO' : 'NO_APROBADO';

  return { notaFinal, notaFinalRaw, notaAcumulada, estado };
}
