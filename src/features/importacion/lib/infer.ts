import type { CanonicalTarget, MappingSuggestion } from './types';
import { aliasLookup } from './aliases';
import { levenshtein, normalizeHeader } from './normalize';
import { extractDoc, extractEmail, extractPlainDocNumber, normalizeTipo } from './splitDoc';

const EMAIL_LIKE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_LIKE = /^[+()\-\s\d]{7,20}$/;
const NAME_LIKE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}){1,5}$/;

/** Frases comunes de formularios que no son nombres de personas. */
const FORM_PHRASES = new Set([
  'esta de acuerdo',
  'estoy de acuerdo',
  'no esta de acuerdo',
  'acepta',
  'acepto',
  'si acepta',
  'autoriza',
  'autorizo',
]);

function isLikelyPersonName(cell: string): boolean {
  const trimmed = cell.trim().replace(/\s+/g, ' ');
  if (!NAME_LIKE.test(trimmed)) return false;
  if (extractDoc(trimmed) !== null) return false;
  const norm = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (FORM_PHRASES.has(norm)) return false;
  return true;
}

/** Pistas por contenido de la columna (primeras N celdas no vacías). */
function contentHints(cells: string[]): { target: CanonicalTarget; boost: number }[] {
  const sample = cells.map((c) => c.trim()).filter((c) => c !== '').slice(0, 12);
  if (sample.length === 0) return [];

  const hints: { target: CanonicalTarget; boost: number }[] = [];
  const hits = (fn: (c: string) => boolean) => sample.filter(fn).length / sample.length;

  // 1. Email
  if (hits((c) => EMAIL_LIKE.test(c)) >= 0.4) {
    hints.push({ target: 'email', boost: 0.35 });
  } else if (sample.some((c) => extractEmail(c) !== null)) {
    hints.push({ target: 'email', boost: 0.15 });
  }

  // 2. Solo tipo de documento ("CC", "T.I.", "TI", etc.)
  if (hits((c) => normalizeTipo(c) !== null && !/\d/.test(c)) >= 0.5) {
    hints.push({ target: 'tipoIdentificacion', boost: 0.3 });
  }

  // 3. Documento (combinado tipo+número como "T.I 1011513696" o solo dígitos como "1007436463")
  const combinedDocRatio = hits((c) => extractDoc(c) !== null);
  const plainDocRatio = hits((c) => extractPlainDocNumber(c) !== null);
  if (combinedDocRatio + plainDocRatio >= 0.5) {
    // Mayor boost cuando incluye prefijos explícitos (CC, T.I, etc.)
    hints.push({
      target: 'identificacion',
      boost: combinedDocRatio >= 0.2 ? 0.4 : 0.25,
    });
  }

  // 4. Nombres completos (2 a 6 palabras alfabéticas, con variedad entre filas)
  const nameRatio = hits(isLikelyPersonName);
  const uniqueLower = new Set(sample.map((c) => c.toLowerCase()));
  const hasVariety = sample.length === 1 || uniqueLower.size >= Math.max(2, Math.ceil(sample.length * 0.5));
  if (nameRatio >= 0.6 && hasVariety) {
    hints.push({ target: 'nombre', boost: 0.3 });
  }

  // 5. Contacto / Teléfono
  if (hits((c) => PHONE_LIKE.test(c)) >= 0.5) {
    hints.push({ target: 'contacto', boost: 0.2 });
  }

  // 6. Celda combinada tipo SofiaPlus ("JUAN PEREZ CC 12345678")
  const sofiaRatio = hits((c) => extractDoc(c) !== null && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(c));
  if (sofiaRatio >= 0.4) {
    hints.push({ target: 'nombre', boost: 0.3 });
  }

  return hints;
}

function fuzzyScore(header: string): { target: CanonicalTarget; score: number } | null {
  const norm = normalizeHeader(header);
  // Ignorar encabezados autogenerados como "Columna 1", "Columna 2"
  if (!norm || /^columna\s*\d+$/i.test(norm)) return null;
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
    { target: 'contacto', key: 'celular' },
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

  // Verificar si alguna columna tiene documentos explícitos con prefijo (CC, T.I, etc.)
  const colHasExplicitDoc = headers.map((_, i) =>
    rows.some((r) => extractDoc(r[i] ?? '') !== null),
  );
  const anyExplicitDocCol = colHasExplicitDoc.some(Boolean);

  return headers.map((h, i) => {
    const colCells = rows.map((r) => r[i] ?? '');
    const combined = colCells.some((c) => extractDoc(c) !== null);
    const isAutoHeader = /^Columna\s+\d+$/i.test(h.trim());
    const alias = isAutoHeader ? null : aliasLookup(h);
    const hints = contentHints(colCells);
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
      } else {
        // Buscar la primera pista de contenido disponible que no esté ya usada
        const availableHint = hints.find((hint) => {
          if (hint.target === 'identificacion' && anyExplicitDocCol && !colHasExplicitDoc[i] && hints.some((x) => x.target === 'contacto')) {
            // Si otra columna ya trae documentos explícitos (T.I / CC) y esta parece teléfono, priorizar contacto
            return false;
          }
          return hint.target === 'nombre' ? !used.has('nombre') || !isAutoHeader : !used.has(hint.target);
        });
        if (availableHint) {
          target = availableHint.target;
          confidence = Math.min(0.95, 0.55 + availableHint.boost);
          reason = 'Detectado por el contenido de la columna';
        }
      }
    }

    const matchingHint = hints.find((x) => x.target === target);
    if (matchingHint && confidence < 0.95 && reason !== 'Detectado por el contenido de la columna') {
      confidence = Math.min(0.95, confidence + matchingHint.boost);
    }
    if (target !== 'ignorar') used.add(target);
    return { sourceIndex: i, sourceHeader: h, target, confidence, reason, needsSplit: combined };
  });
}
