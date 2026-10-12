import type { CanonicalTarget, MappingSuggestion } from './types';
import { aliasLookup } from './aliases';
import { levenshtein, normalizeHeader } from './normalize';
import { extractDoc, extractEmail } from './splitDoc';

const EMAIL_LIKE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const ONLY_DIGITS = /^\d{5,12}$/;
const TIPO_LIKE = /^(CC|TI|CE|PA|PEP|PPT|RC)$/i;
const PHONE_LIKE = /^[+()\-\s\d]{7,20}$/;

/** Pistas por contenido de la columna (primeras N celdas no vacías). */
function contentHint(cells: string[]): { target: CanonicalTarget; boost: number } | null {
  const sample = cells.filter((c) => c.trim() !== '').slice(0, 8);
  if (sample.length === 0) return null;
  const hits = (re: RegExp) => sample.filter((c) => re.test(c.trim())).length / sample.length;
  if (hits(EMAIL_LIKE) >= 0.5) return { target: 'email', boost: 0.2 };
  if (hits(TIPO_LIKE) >= 0.5) return { target: 'tipoIdentificacion', boost: 0.2 };
  if (hits(ONLY_DIGITS) >= 0.6) return { target: 'identificacion', boost: 0.2 };
  const combined = sample.filter((c) => extractDoc(c) !== null).length / sample.length;
  if (combined >= 0.4) return { target: 'identificacion', boost: 0.15 };
  if (hits(PHONE_LIKE) >= 0.5 && hits(ONLY_DIGITS) < 0.6) return { target: 'contacto', boost: 0.15 };
  if (sample.some((c) => extractEmail(c) !== null)) return { target: 'email', boost: 0.1 };
  return null;
}

function fuzzyScore(header: string): { target: CanonicalTarget; score: number } | null {
  const norm = normalizeHeader(header);
  if (!norm) return null;
  const candidates: { target: CanonicalTarget; key: string }[] = [
    { target: 'nombre', key: 'nombre' },
    { target: 'identificacion', key: 'identificacion' },
    { target: 'identificacion', key: 'documento' },
    { target: 'identificacion', key: 'cedula' },
    { target: 'tipoIdentificacion', key: 'tipo' },
    { target: 'email', key: 'correo' },
    { target: 'email', key: 'email' },
    { target: 'contacto', key: 'contacto' },
    { target: 'contacto', key: 'telefono' },
  ];
  let best: { target: CanonicalTarget; score: number } | null = null;
  for (const c of candidates) {
    if (norm.includes(c.key) || c.key.includes(norm)) {
      const s = 0.7;
      if (!best || s > best.score) best = { target: c.target, score: s };
      continue;
    }
    const d = levenshtein(norm, c.key);
    if (d <= 2 && norm.length >= 3) {
      const s = 0.55 - d * 0.05;
      if (!best || s > best.score) best = { target: c.target, score: s };
    }
  }
  return best;
}

/**
 * Sugiere el mapeo de cada columna: alias exacto (0.9) > contains/fuzzy (0.7/0.55)
 * + boost por contenido. Evita asignar el mismo target dos veces
 * (excepto nombre, que permite nombre + apellido).
 */
export function inferMapping(headers: string[], rows: string[][]): MappingSuggestion[] {
  const used = new Set<CanonicalTarget>();
  return headers.map((h, i) => {
    const colCells = rows.map((r) => r[i] ?? '');
    const combined = colCells.some((c) => extractDoc(c) !== null && /[A-Za-zÀ-ÿ]/.test(c));
    const alias = aliasLookup(h);
    const hint = contentHint(colCells);
    let target: CanonicalTarget = 'ignorar';
    let confidence = 0.2;
    let reason = 'Sin coincidencia; revísalo';

    if (alias && (alias === 'nombre' || !used.has(alias))) {
      target = alias;
      confidence = 0.9;
      reason = `Encabezado coincide con "${h.trim()}"`;
    } else {
      const fuzzy = fuzzyScore(h);
      if (fuzzy && (fuzzy.target === 'nombre' || !used.has(fuzzy.target))) {
        target = fuzzy.target;
        confidence = fuzzy.score;
        reason = `Encabezado similar a ${fuzzy.target}`;
      } else if (hint && (hint.target === 'nombre' || !used.has(hint.target))) {
        target = hint.target;
        confidence = 0.5 + hint.boost;
        reason = 'Detectado por el contenido de la columna';
      }
    }
    if (hint && hint.target === target && confidence < 0.95) {
      confidence = Math.min(0.95, confidence + hint.boost);
    }
    if (target !== 'ignorar' && target !== 'nombre') used.add(target);
    return { sourceIndex: i, sourceHeader: h, target, confidence, reason, needsSplit: combined };
  });
}
