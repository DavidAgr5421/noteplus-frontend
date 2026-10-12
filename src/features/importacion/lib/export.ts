import type { Estudiante } from '@/features/estudiantes/types';
import type { FichaNotas } from '@/features/calificaciones/types';
import type { Asistencia, Clase } from '@/features/asistencias/types';

function escapeCsv(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(escapeCsv).join(';'), ...rows.map((r) => r.map(escapeCsv).join(';'))];
  return `﻿${lines.join('\n')}`;
}

export function downloadFile(filename: string, content: BlobPart, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  downloadFile(filename, toCSV(headers, rows), 'text/csv;charset=utf-8');
}

export async function downloadXLSX(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  comments?: Record<string, string>,
) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  if (comments) {
    for (const [addr, text] of Object.entries(comments)) {
      const cell = ws[addr];
      if (cell && text) cell.c = [{ a: 'Justificación', t: text }];
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  // cellComments existe en runtime (SheetJS ≥0.18) aunque los tipos no lo declaren.
  const opts = { type: 'array', bookType: 'xlsx', cellComments: true } as unknown as Parameters<typeof XLSX.write>[1];
  const buf = XLSX.write(wb, opts);
  downloadFile(filename, buf as BlobPart, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/** Matriz de estudiantes: nombre, tipo, identificación, email, contacto. */
export function estudiantesMatrix(estudiantes: Estudiante[]) {
  return {
    headers: ['Nombre', 'Tipo doc.', 'Identificación', 'Email', 'Contacto'],
    rows: estudiantes.map((e) => [
      e.nombre, e.tipoIdentificacion || 'CC', e.identificacion, e.email ?? '', e.contacto ?? '',
    ]),
  };
}

/** Matriz de notas: estudiante × actividades + final + estado. */
export function notasMatrix(notas: FichaNotas) {
  const leafActs = notas.actividades.filter((a) => a.parentId !== null || !notas.actividades.some((c) => c.parentId === a.id));
  const headers = ['Nombre', 'Identificación', ...leafActs.map((a) => a.nombre), 'Nota final', 'Estado'];
  const rows = notas.estudiantes.map((s) => [
    s.estudianteNombre,
    s.estudianteIdentificacion,
    ...leafActs.map((a) => s.actividades[a.id] ?? ''),
    s.notaFinal,
    s.estado === 'APROBADO' ? 'Aprobado' : 'No aprobado',
  ]);
  return { headers, rows };
}

const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Índice de columna 0-based → letra Excel ("D"). */
export function colToLetter(col: number): string {
  let s = '';
  let n = col;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/**
 * Formato ancho de asistencias de una ficha:
 * `Tipo ID | ID | Nombre | día1 | día2 | … | % asistencia`.
 * Valor por día: "asistio" / "no asistio". La justificación sale como
 * comentario de la celda (Excel) y se entrega aparte en `notes` para CSV.
 */
export function asistenciasWide(
  clases: Clase[],
  estudiantes: { id: string; tipoIdentificacion?: string | null; nombre: string; identificacion: string }[],
  porClase: Map<string, Asistencia[]>,
) {
  const porFecha = new Map<string, number>();
  for (const c of clases) porFecha.set(c.fecha, (porFecha.get(c.fecha) ?? 0) + 1);
  const dias = clases.map((c) => {
    const [, m, d] = c.fecha.split('-').map(Number);
    const base = `${d} ${MESES_ES[(m ?? 1) - 1] ?? ''}`.trim();
    return (porFecha.get(c.fecha) ?? 0) > 1 ? `${base} ${c.hora.slice(0, 5)}` : base;
  });

  const headers = ['Tipo ID', 'ID', 'Nombre', ...dias, '% asistencia'];
  const rows: (string | number)[][] = [];
  const notes: { r: number; c: number; text: string }[] = [];

  estudiantes.forEach((e, i) => {
    let asistio = 0;
    const celdas = clases.map((c, j) => {
      const a = (porClase.get(c.id) ?? []).find((x) => x.estudianteId === e.id);
      if (!a) return '';
      if (a.estado === 'ASISTIO') {
        asistio += 1;
        return 'asistio';
      }
      if (a.justificacion?.trim()) notes.push({ r: i, c: 3 + j, text: a.justificacion.trim() });
      return 'no asistio';
    });
    const pct = clases.length === 0 ? '' : Math.round((asistio / clases.length) * 1000) / 10;
    rows.push([e.tipoIdentificacion || 'CC', e.identificacion, e.nombre, ...celdas, pct]);
  });
  return { headers, rows, notes };
}

/** Convierte notes ({r, c} sobre filas de datos) a direcciones Excel ("D2"). */
export function notesToAddresses(notes: { r: number; c: number; text: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of notes) out[`${colToLetter(n.c)}${n.r + 2}`] = n.text;
  return out;
}
