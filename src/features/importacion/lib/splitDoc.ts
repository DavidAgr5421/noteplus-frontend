import { TIPOS_IDENTIFICACION } from '@/features/estudiantes/types';

const TIPOS = TIPOS_IDENTIFICACION.map((t) => t.valor);

/**
 * Patrón de abreviaturas con o sin puntos/espacios intermedios:
 * Soporta: CC, C.C, C.C., Cc:, TI, T.I, T.I., Ti., CE, C.E, PA, P.A, PEP, P.E.P, PPT, P.P.T, RC, R.C
 * además de nombres completos ("Cédula de ciudadanía", "Tarjeta de identidad", "Pasaporte").
 */
const ABBR_PATTERN = [
  'C\\.?\\s*C\\.?',
  'T\\.?\\s*I\\.?',
  'C\\.?\\s*E\\.?',
  'P\\.?\\s*A\\.?',
  'P\\.?\\s*E\\.?\\s*P\\.?',
  'P\\.?\\s*P\\.?\\s*T\\.?',
  'R\\.?\\s*C\\.?',
  'C[ÉE]DULA(?:\\s+DE\\s+(?:CIUDADAN[ÍI]A|EXTRANJER[ÍI]A))?',
  'TARJETA\\s+DE\\s+IDENTIDAD',
  'PASAPORTE',
].join('|');

const DOC_RE = new RegExp(
  `(?:^|\\b)(${ABBR_PATTERN})\\s*[:#\\-.,/]?\\s*(\\d[\\d.\\s]{3,14}\\d)(?=\\b|$)`,
  'i',
);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/** Nombres de tipo largos → código ("cédula de ciudadanía" → "CC"). Claves sin tildes. */
const TIPO_LARGO: Record<string, string> = {
  'cedula': 'CC',
  'cedula de ciudadania': 'CC',
  'cedula ciudadania': 'CC',
  'tarjeta de identidad': 'TI',
  'tarjeta identidad': 'TI',
  'cedula de extranjeria': 'CE',
  'cedula extranjeria': 'CE',
  'pasaporte': 'PA',
  'registro civil': 'RC',
};

export function normalizeTipo(raw: string): string | null {
  if (!raw) return null;
  // Quitar puntos, dos puntos, guiones y espacios para normalizar "T.I", "C.C.", "Ti.", "Cc:" → "TI", "CC"
  const compact = raw.replace(/[.\s:;#\-,/]/g, '').toUpperCase();
  if ((TIPOS as string[]).includes(compact)) return compact;

  const low = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.:;#\-,/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return TIPO_LARGO[low] ?? null;
}

/**
 * Extrae (tipo, número) de una celda que trae ambos juntos:
 * "CC 123456", "T.I 1011513696", "C.C 1035419262", "Ti.1049322140", "Cc: 1020108013", "Cédula: 123456".
 */
export function extractDoc(cell: string): { tipo: string; numero: string } | null {
  if (!cell) return null;
  const m = cell.match(DOC_RE);
  if (!m) return null;
  const digits = m[2].replace(/\D/g, '');
  if (digits.length < 5 || digits.length > 12) return null;
  const tipo = normalizeTipo(m[1]) ?? 'CC';
  return { tipo, numero: digits };
}

/**
 * Extrae únicamente dígitos de documento cuando la celda solo tiene el número
 * (con posibles puntos de miles o prefijos como "N°", "No.", "#"):
 * ej. "1.007.436.463" -> "1007436463".
 */
export function extractPlainDocNumber(cell: string): string | null {
  if (!cell) return null;
  const cleaned = cell
    .trim()
    .replace(/^(?:n[°ºo.]?|nro\.?|num\.?|id\.?|doc\.?|documento)\s*[:#\-]?\s*/i, '')
    .trim();
  // Solo dígitos o dígitos separados por puntos de miles (ej. 1.023.456.789)
  if (/^\d{5,12}$/.test(cleaned)) return cleaned;
  if (/^\d{1,3}(?:\.\d{3}){1,3}$/.test(cleaned)) {
    const digits = cleaned.replace(/\./g, '');
    if (digits.length >= 5 && digits.length <= 12) return digits;
  }
  return null;
}

/** Extrae el primer email de una celda. */
export function extractEmail(cell: string): string | null {
  if (!cell) return null;
  const m = cell.match(EMAIL_RE);
  return m ? m[0] : null;
}

/** Palabras de la UI que se cuelan al copiar y pegar (botones, encabezados). */
const NOISE_WORDS = [
  'agregar', 'lista', 'acciones', 'accion', 'editar', 'eliminar', 'ver', 'detalle',
  'seleccionar', 'buscar', 'exportar', 'importar', 'guardar', 'cancelar', 'agregado',
];

/** Quita ruido de UI copiado junto con los datos ("Agregar", flechas, etc.). */
export function cleanNoise(text: string): string {
  let out = ` ${text ?? ''} `.replace(/[↑↓←→▲▼★☆✓✗]/g, ' ');
  for (const w of NOISE_WORDS) {
    out = out.replace(new RegExp(`\\s+${w}\\s+`, 'gi'), ' ');
  }
  return out
    .replace(/\s+/g, ' ')
    .replace(/^[-–—:;,.\s]+|[-–—:;,.\s]+$/g, '')
    .trim();
}

/**
 * Caso SofiaPlus: una sola celda trae documento y nombre juntos, en cualquier orden:
 * "JUAN PEREZ CC 12345678" o "CC 1011392863 MIGUEL ANGEL ZAPATA RUA".
 * El nombre es el resto alfabético tras quitar documento y ruido de UI.
 */
export function splitSofiaPlusCell(cell: string): {
  nombre: string;
  tipo: string | null;
  numero: string | null;
} {
  const text = cleanNoise(cell);
  const doc = extractDoc(text);
  if (!doc) return { nombre: text, tipo: null, numero: null };
  const resto = cleanNoise(text.replace(DOC_RE, ' '));
  const nombre = /[A-Za-zÀ-ÿ]{2,}/.test(resto) ? resto : '';
  return { nombre, tipo: doc.tipo, numero: doc.numero };
}

/** ¿La celda parece traer documento + número juntos? (para badge "dividido"). */
export function looksCombinedDoc(cell: string): boolean {
  return extractDoc(cell) !== null;
}
