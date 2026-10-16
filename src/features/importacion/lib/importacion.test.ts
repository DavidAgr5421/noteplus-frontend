import { describe, it, expect } from 'vitest';
import { extractDoc, splitSofiaPlusCell, extractEmail, normalizeTipo, cleanNoise } from './splitDoc';
import { inferMapping } from './infer';
import { parseTextToSheet, sheetToRecords } from './parse';
import { validateRecords } from './validate';

describe('splitDoc', () => {
  it('separa "CC 12345678"', () => {
    expect(extractDoc('CC 12345678')).toEqual({ tipo: 'CC', numero: '12345678' });
  });
  it('separa "Cédula: 123456"', () => {
    expect(extractDoc('Cédula: 123456')).toEqual({ tipo: 'CC', numero: '123456' });
  });
  it('caso SofiaPlus "NOMBRE CC #####"', () => {
    const r = splitSofiaPlusCell('JUAN PEREZ CC 12345678');
    expect(r.nombre).toBe('JUAN PEREZ');
    expect(r.tipo).toBe('CC');
    expect(r.numero).toBe('12345678');
  });
  it('caso SofiaPlus doc primero + ruido "Agregar"', () => {
    const r = splitSofiaPlusCell('Agregar CC 1011392863 MIGUEL ANGEL ZAPATA RUA');
    expect(r.tipo).toBe('CC');
    expect(r.numero).toBe('1011392863');
    expect(r.nombre).toBe('MIGUEL ANGEL ZAPATA RUA');
  });
  it('limpia ruido de UI', () => {
    expect(cleanNoise('Agregar Lista↑ CC 123')).toBe('CC 123');
  });
  it('extrae email embebido', () => {
    expect(extractEmail('contacto juan@mail.com tel')).toBe('juan@mail.com');
  });
  it('normaliza tipo largo', () => {
    expect(normalizeTipo('cédula de ciudadanía')).toBe('CC');
  });
});

describe('inferMapping', () => {
  it('reconoce alias "nombre completo", "cedula", "mail"', () => {
    const m = inferMapping(
      ['Nombre Completo', 'Cedula', 'mail'],
      [['Juan Perez', '123', 'juan@mail.com']],
    );
    const byTarget = Object.fromEntries(m.map((x) => [x.target, x.sourceHeader]));
    expect(byTarget['nombre']).toBe('Nombre Completo');
    expect(byTarget['identificacion']).toBe('Cedula');
    expect(byTarget['email']).toBe('mail');
  });
  it('detecta tipo+valor juntos por contenido', () => {
    const m = inferMapping(['Datos'], [['CC 123456'], ['TI 789']]);
    expect(m[0].needsSplit).toBe(true);
  });
});

describe('parse + records', () => {
  it('pegar SofiaPlus de una columna rescata nombre y doc', () => {
    const sheet = parseTextToSheet(
      'Agregar\tCC 1011392863 MIGUEL ANGEL ZAPATA RUA\nAgregar\tCC 1011396318 JERONIMO GIL SERNA',
    );
    const mapping = inferMapping(sheet.headers, sheet.rows);
    const records = sheetToRecords(sheet, mapping);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      nombre: 'MIGUEL ANGEL ZAPATA RUA',
      tipoIdentificacion: 'CC',
      identificacion: '1011392863',
    });
    expect(records[1].nombre).toBe('JERONIMO GIL SERNA');
    expect(validateRecords(records)).toEqual([]);
  });
  it('pegar SofiaPlus tabulado genera registros divididos', () => {
    const sheet = parseTextToSheet('NOMBRE\tDOCUMENTO\nJUAN PEREZ CC 12345678\tjuan@mail.com');
    expect(sheet.headers).toEqual(['NOMBRE', 'DOCUMENTO']);
    const mapping = inferMapping(sheet.headers, sheet.rows);
    const records = sheetToRecords(sheet, mapping.map((m, i) =>
      i === 0 ? { ...m, target: 'nombre' as const } : { ...m, target: 'email' as const },
    ));
    expect(records[0].nombre).toBe('JUAN PEREZ');
    expect(records[0].tipoIdentificacion).toBe('CC');
    expect(records[0].identificacion).toBe('12345678');
  });
  it('nombre + apellido en columnas separadas se concatenan', () => {
    const sheet = parseTextToSheet('nombre;apellido;cedula\nJuan;Perez;123456');
    const mapping = inferMapping(sheet.headers, sheet.rows).map((m) =>
      m.sourceHeader.toLowerCase() === 'apellido' ? { ...m, target: 'nombre' as const } : m,
    );
    const records = sheetToRecords(sheet, mapping);
    expect(records[0].nombre).toBe('Juan Perez');
    expect(records[0].identificacion).toBe('123456');
  });
  it('reconoce T.I, C.C, Ti., Cc: con puntos y dos puntos', () => {
    expect(extractDoc('T.I 1011513696')).toEqual({ tipo: 'TI', numero: '1011513696' });
    expect(extractDoc('C.C 1035419262')).toEqual({ tipo: 'CC', numero: '1035419262' });
    expect(extractDoc('Ti.1049322140')).toEqual({ tipo: 'TI', numero: '1049322140' });
    expect(extractDoc('Cc: 1020108013')).toEqual({ tipo: 'CC', numero: '1020108013' });
    expect(extractDoc('Cc 1037264913')).toEqual({ tipo: 'CC', numero: '1037264913' });
  });
  it('procesa pegado de Google Forms sin encabezados con T.I, C.C, Ti. y números planos', () => {
    const raw = [
      '15/10/2026 6:58:15\tACEPTA\tLaura Vanesa Salazar \t1007436463\tlauravanessasalazar281@gmail.com\t3127337234\t3206442655\tEstá de acuerdo',
      '15/10/2026 6:59:24\tACEPTA\tMiguel Angel Murillo Castro\tT.I 1011513696\tmikellangell.17@gmail.com\t3023268334\t3154073110\tEstá de acuerdo',
      '15/10/2026 7:01:00\tACEPTA\tSebastian Gómez Jaramillo \tC.C 1035419262\tsebastiangomezj14@gmail.com\t3014036092\t3208315223\tEstá de acuerdo',
      '15/10/2026 7:01:03\tACEPTA\tChristian David Ruiz Medina\tCC 1025761785\tChristian David Ruiz Medina \t3003039967\t+1 (843) 338-0153\tEstá de acuerdo',
      '15/10/2026 7:05:39\tACEPTA\tJesús Elias Acosta rocha \tTi.1049322140\tacostarochajesuselias@gmail.com\t3116382359\t3017448885\tEstá de acuerdo',
    ].join('\n');

    const sheet = parseTextToSheet(raw);
    const mapping = inferMapping(sheet.headers, sheet.rows);
    const records = sheetToRecords(sheet, mapping);

    expect(records).toHaveLength(5);
    expect(records[0]).toMatchObject({
      nombre: 'Laura Vanesa Salazar',
      tipoIdentificacion: 'CC',
      identificacion: '1007436463',
      email: 'lauravanessasalazar281@gmail.com',
      contacto: '3127337234',
    });
    expect(records[1]).toMatchObject({
      nombre: 'Miguel Angel Murillo Castro',
      tipoIdentificacion: 'TI',
      identificacion: '1011513696',
    });
    expect(records[2]).toMatchObject({
      nombre: 'Sebastian Gómez Jaramillo',
      tipoIdentificacion: 'CC',
      identificacion: '1035419262',
    });
    expect(records[3]).toMatchObject({
      nombre: 'Christian David Ruiz Medina',
      tipoIdentificacion: 'CC',
      identificacion: '1025761785',
      email: '',
    });
    expect(records[4]).toMatchObject({
      nombre: 'Jesús Elias Acosta rocha',
      tipoIdentificacion: 'TI',
      identificacion: '1049322140',
    });
    expect(validateRecords(records)).toEqual([]);
  });
  it('validación marca faltantes y duplicados', () => {
    const issues = validateRecords([
      { nombre: '', tipoIdentificacion: 'CC', identificacion: '', email: '', contacto: '' },
      { nombre: 'Ana', tipoIdentificacion: 'CC', identificacion: '123456', email: '', contacto: '' },
      { nombre: 'Ana 2', tipoIdentificacion: 'CC', identificacion: '123456', email: 'mal', contacto: '' },
    ]);
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });
});

