import type { CanonicalTarget, EstudianteImportado, MappingSuggestion } from './types';
import { extractDoc, extractEmail, splitSofiaPlusCell } from './splitDoc';
export interface ParsedSheet {
  headers: string[];
  rows: string[][];
  hasHeader: boolean;
}

const BOM = '﻿';

function cleanCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(BOM, '').trim();
}

/** ¿La primera fila parece encabezado o dato? (dato: trae doc/email/solo dígitos). */
function looksLikeDataRow(cells: string[]): boolean {
  const joined = cells.join(' ');
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(joined)) return true;
  if (/\b(CC|TI|CE|PA|PEP|PPT|RC)\b\s*\d{5,12}/i.test(joined)) return true;
  const nonEmpty = cells.filter((c) => c !== '');
  if (nonEmpty.length > 0 && nonEmpty.every((c) => /^\d{5,12}$/.test(c))) return true;
  return false;
}

function matrixToSheet(matrix: string[][]): ParsedSheet {
  const cleaned = matrix
    .map((r) => r.map((c) => (c ?? '').trim()))
    .filter((r) => r.some((c) => c !== ''));
  if (cleaned.length === 0) return { headers: [], rows: [], hasHeader: false };
  const first = cleaned[0];
  const hasHeader = !looksLikeDataRow(first);
  if (!hasHeader) {
    return {
      headers: first.map((_, i) => `Columna ${i + 1}`),
      rows: cleaned,
      hasHeader: false,
    };
  }
  return { headers: first, rows: cleaned.slice(1), hasHeader: true };
}

function detectDelimiter(line: string): string {
  const candidates = ['\t', ';', ',', '|'];
  let best = '';
  let bestCount = 0;
  for (const d of candidates) {
    const n = line.split(d).length - 1;
    if (n > bestCount) {
      bestCount = n;
      best = d;
    }
  }
  return bestCount > 0 ? best : '';
}

/**
 * Texto pegado o .txt/.csv sin Excel: detecta delimitador por línea
 * (tab de Excel/SofiaPlus, ; , |). Líneas sin delimitador (ej. "NOMBRE CC 123")
 * quedan como una sola celda para dividirlas después.
 */
export function parseTextToSheet(text: string): ParsedSheet {
  const lines = (text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
  if (lines.length === 0) return { headers: [], rows: [], hasHeader: false };
  const counts = new Map<string, number>();
  for (const l of lines) counts.set(detectDelimiter(l), (counts.get(detectDelimiter(l)) ?? 0) + 1);
  let global = '';
  let globalN = 0;
  for (const [d, n] of counts) {
    if (d !== '' && n > globalN) {
      global = d;
      globalN = n;
    }
  }
  const matrix = lines.map((l) => (global ? l.split(global) : [l]).map((c) => c.trim()));
  const width = Math.max(...matrix.map((r) => r.length));
  const padded = matrix.map((r) => [...r, ...Array<string>(width - r.length).fill('')]);
  return matrixToSheet(padded);
}

/** Archivo .csv/.xlsx/.xls/.txt leído en el navegador (SheetJS bajo import dinámico). */
export async function parseFileToSheet(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer();
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array', codepage: 65001 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { headers: [], rows: [], hasHeader: false };
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return matrixToSheet(matrix.map((r) => (r as unknown[]).map(cleanCell)));
}

/**
 * Aplica el mapeo (ya confirmado por el usuario) a las filas.
 * - Dos columnas -> nombre se concatenan ("Juan" + "Pérez").
 * - Celdas combinadas ("CC 123", "NOMBRE CC 123") se dividen.
 * - Si falta columna email, se busca un email en cualquier celda.
 */
export function sheetToRecords(
  sheet: ParsedSheet,
  mapping: MappingSuggestion[],
): EstudianteImportado[] {
  const byTarget = new Map<CanonicalTarget, number[]>();
  for (const m of mapping) {
    if (m.target === 'ignorar') continue;
    byTarget.set(m.target, [...(byTarget.get(m.target) ?? []), m.sourceIndex]);
  }
  return sheet.rows.map((row) => {
    const cell = (idxs?: number[]) => (idxs ?? []).map((i) => row[i] ?? '').filter((c) => c !== '');

    // Nombre: concatenar todas las columnas nombre, dividiendo SofiaPlus si aplica
    const nombreParts = cell(byTarget.get('nombre')).map((c) => splitSofiaPlusCell(c).nombre);
    let nombre = nombreParts.join(' ').replace(/\s+/g, ' ').trim();
    // Rescate: si ninguna columna es nombre (todo vino en un solo campo),
    // buscar el resto alfabético en cualquier celda combinada de la fila.
    if (!nombre) {
      for (const c of row) {
        const split = splitSofiaPlusCell(c);
        if (split.tipo && split.nombre) {
          nombre = split.nombre;
          break;
        }
      }
    }

    // Doc: columnas dedicadas + rescate desde la celda de nombre combinada
    let tipo = '';
    let numero = '';
    for (const c of cell(byTarget.get('tipoIdentificacion'))) {
      const t = c.trim().toUpperCase();
      if (/^(CC|TI|CE|PA|PEP|PPT|RC)$/i.test(t)) {
        tipo = t.toUpperCase();
        break;
      }
      const d = extractDoc(c);
      if (d) {
        tipo = d.tipo;
        if (!numero) numero = d.numero;
        break;
      }
    }
    for (const c of cell(byTarget.get('identificacion'))) {
      const d = extractDoc(c);
      if (d) {
        if (!tipo) tipo = d.tipo;
        if (!numero) numero = d.numero;
      } else if (!numero && /^\d{5,12}$/.test(c.trim())) {
        numero = c.trim();
      }
    }
    if ((!tipo || !numero) && nombre) {
      const rescue = splitSofiaPlusCell(cell(byTarget.get('nombre')).join(' '));
      if (!tipo && rescue.tipo) tipo = rescue.tipo;
      if (!numero && rescue.numero) numero = rescue.numero;
      if (rescue.nombre) nombre = rescue.nombre;
    }
    if (!tipo) tipo = 'CC';

    let email = cell(byTarget.get('email')).map((c) => extractEmail(c) ?? c).find((c) => c !== '') ?? '';
    if (!email) {
      for (const c of row) {
        const e = extractEmail(c);
        if (e) {
          email = e;
          break;
        }
      }
    }
    const contacto = cell(byTarget.get('contacto')).join(' ').trim();

    return { nombre, tipoIdentificacion: tipo, identificacion: numero, email, contacto };
  });
}
