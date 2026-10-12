import { TIPOS_IDENTIFICACION } from '@/features/estudiantes/types';

const TIPOS = TIPOS_IDENTIFICACION.map((t) => t.valor);
const TIPO_PATTERN = TIPOS.join('|');

const DOC_RE = new RegExp(
  `\\b(${TIPO_PATTERN}|C[ÉE]DULA(?:\\s+DE\\s+CIUDADAN[ÍI]A)?|TARJETA\\s+DE\\s+IDENTIDAD|PASAPORTE)\\s*[:#\\-.]?\\s*(\\d{5,12})\\b`,
  'i',
);
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/** Nombres de tipo largos → código ("cédula de ciudadanía" → "CC"). Claves sin tildes. */
const TIPO_LARGO: Record<string, string> = {
  'cedula': 'CC', 'cedula de ciudadania': 'CC', 'cedula ciudadania': 'CC',
  'tarjeta de identidad': 'TI',
  'cedula de extranjeria': 'CE', 'cedula extranjeria': 'CE',
  'pasaporte': 'PA',
};

export function normalizeTipo(raw: string): string | null {
  const v = (raw ?? '').trim().toUpperCase();
  if ((TIPOS as string[]).includes(v)) return v;
  const low = (raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return TIPO_LARGO[low] ?? null;
}

/**
 * Extrae (tipo, número) de una celda que trae ambos juntos:
 * "CC 123456", "Cédula: 123456", "TI123456".
 */
export function extractDoc(cell: string): { tipo: string; numero: string } | null {
  if (!cell) return null;
  const m = cell.match(DOC_RE);
  if (!m) return null;
  const tipo = normalizeTipo(m[1]) ?? m[1].toUpperCase();
  return { tipo, numero: m[2] };
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
