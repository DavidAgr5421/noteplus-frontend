import { describe, it, expect } from 'vitest';
import { calculateLiveGrades, roundHalfUp } from './gradeCalculator';

describe('calculateLiveGrades (paridad con backend RN-14–RN-18)', () => {
  it('faltantes como cero', () => {
    const acts = [
      { id: 'a1', porcentaje: 50, parentId: null },
      { id: 'a2', porcentaje: 50, parentId: null },
    ];
    const r = calculateLiveGrades(acts, { a1: 4.0 }, 3.0);
    expect(r.notaFinalRaw).toBeCloseTo(2.0, 9);
    expect(r.notaFinal).toBe(2.0);
    expect(r.estado).toBe('NO_APROBADO');
  });

  it('acumulada normalizada sobre peso calificado', () => {
    const acts = [
      { id: 'a1', porcentaje: 50, parentId: null },
      { id: 'a2', porcentaje: 50, parentId: null },
    ];
    const r = calculateLiveGrades(acts, { a1: 4.0 }, 3.0);
    expect(r.notaAcumulada).toBe(4.0);
  });

  it('subactividades ponderadas', () => {
    const acts = [
      { id: 'padre', porcentaje: 100, parentId: null },
      { id: 'h1', porcentaje: 60, parentId: 'padre' },
      { id: 'h2', porcentaje: 40, parentId: 'padre' },
    ];
    const r = calculateLiveGrades(acts, { h1: 5.0, h2: 3.0 }, 3.0);
    expect(r.notaFinalRaw).toBeCloseTo(4.2, 9);
    expect(r.estado).toBe('APROBADO');
  });

  it('sin notas: acumulada null y final 0', () => {
    const acts = [{ id: 'a1', porcentaje: 100, parentId: null }];
    const r = calculateLiveGrades(acts, {}, 3.0);
    expect(r.notaAcumulada).toBeNull();
    expect(r.notaFinal).toBe(0);
    expect(r.estado).toBe('NO_APROBADO');
  });

  it('redondeo half-up', () => {
    expect(roundHalfUp(3.05, 1)).toBe(3.1);
    expect(roundHalfUp(3.04, 1)).toBe(3.0);
  });
});
