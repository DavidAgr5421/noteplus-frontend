import { describe, it, expect } from 'vitest';
import { toCSV, estudiantesMatrix, notasMatrix, asistenciasWide, notesToAddresses, colToLetter } from './export';

describe('toCSV', () => {
  it('escapa comillas y punto y coma con BOM', () => {
    const csv = toCSV(['Nombre', 'Nota'], [['Ana "La" Pérez', '4,5']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Ana ""La"" Pérez"');
  });
});

describe('estudiantesMatrix', () => {
  it('incluye contacto y nulos como vacío', () => {
    const { headers, rows } = estudiantesMatrix([
      { id: '1', fichaId: 'f', nombre: 'Ana', identificacion: '123', tipoIdentificacion: 'CC', email: null, contacto: '300' },
    ]);
    expect(headers).toEqual(['Nombre', 'Tipo doc.', 'Identificación', 'Email', 'Contacto']);
    expect(rows[0]).toEqual(['Ana', 'CC', '123', '', '300']);
  });
});

describe('notasMatrix', () => {
  it('aplana actividades hoja + final + estado', () => {
    const { headers, rows } = notasMatrix({
      fichaId: 'f',
      notaMinimaAprobacion: 3,
      actividades: [
        { id: 'p', fichaId: 'f', parentId: null, nombre: 'Padre', fechaLimite: null, porcentaje: 100, orden: 0 },
        { id: 'h', fichaId: 'f', parentId: 'p', nombre: 'Hija', fechaLimite: null, porcentaje: 100, orden: 0 },
      ],
      estudiantes: [
        { estudianteId: 'e1', estudianteNombre: 'Ana', estudianteIdentificacion: '123', notaFinal: 4.2, notaAcumulada: 4.2, estado: 'APROBADO', actividades: { h: 4.2 } },
      ],
    });
    expect(headers).toContain('Hija');
    expect(headers).toContain('Nota final');
    expect(rows[0]).toContain('Aprobado');
  });
});

describe('asistenciasWide', () => {
  const clases = [
    { id: 'c1', fichaId: 'f', fecha: '2026-10-12', hora: '18:00', modalidad: 'PRESENCIAL' as const, realizada: true, observacion: null },
    { id: 'c2', fichaId: 'f', fecha: '2026-10-13', hora: '18:00', modalidad: 'PRESENCIAL' as const, realizada: true, observacion: null },
  ];
  const estudiantes = [{ id: 'e1', tipoIdentificacion: 'CC', nombre: 'Ana', identificacion: '123' }];
  const porClase = new Map([
    ['c1', [{ id: 'a1', claseId: 'c1', estudianteId: 'e1', estado: 'ASISTIO' as const, justificacion: null }]],
    ['c2', [{ id: 'a2', claseId: 'c2', estudianteId: 'e1', estado: 'NO_ASISTIO' as const, justificacion: 'Cita' }]],
  ]);

  it('columnas Tipo ID, ID, Nombre, días y % asistencia', () => {
    const { headers, rows, notes } = asistenciasWide(clases, estudiantes, porClase);
    expect(headers).toEqual(['Tipo ID', 'ID', 'Nombre', '12 oct', '13 oct', '% asistencia']);
    expect(rows).toEqual([['CC', '123', 'Ana', 'asistio', 'no asistio', 50]]);
    expect(notes).toEqual([{ r: 0, c: 4, text: 'Cita' }]);
  });

  it('desambigua días repetidos con la hora', () => {
    const dosMismoDia = [clases[0], { ...clases[0], id: 'c3', hora: '20:00' }];
    const { headers } = asistenciasWide(dosMismoDia, estudiantes, new Map());
    expect(headers.slice(3, 5)).toEqual(['12 oct 18:00', '12 oct 20:00']);
  });

  it('notes a direcciones Excel', () => {
    expect(notesToAddresses([{ r: 0, c: 3, text: 'x' }])).toEqual({ D2: 'x' });
    expect(colToLetter(26)).toBe('AA');
  });
});
