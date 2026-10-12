import type { CanonicalTarget } from './types';
import { normalizeHeader } from './normalize';

/**
 * Diccionario de alias por campo canónico (ya normalizados).
 * Cubre: nombre/nombre completo/apellidos, cédula/documento,
 * correo/mail/email/contacto, teléfono/celular.
 */
const ALIAS_MAP: Record<Exclude<CanonicalTarget, 'ignorar'>, string[]> = {
  nombre: [
    'nombre', 'nombres', 'nombre completo', 'nombres completos',
    'nombre y apellido', 'nombres y apellidos', 'apellido', 'apellidos',
    'estudiante', 'alumno', 'participante', 'aprendiz',
    'fullname', 'full name', 'name', 'names', 'student',
  ],
  tipoIdentificacion: [
    'tipo', 'tipo doc', 'tipo documento', 'tipo de identificacion',
    'tipo identificacion', 'tipo id', 'tipo documento identidad',
    'tdoc', 'document type', 'doc type',
  ],
  identificacion: [
    'identificacion', 'identificacion numero', 'numero identificacion',
    'nro identificacion', 'no identificacion', 'documento', 'documento identidad',
    'numero documento', 'nro documento', 'no documento', 'num documento',
    'cedula', 'cedula ciudadania', 'cedula de ciudadania', 'cc', 'ti', 'ce',
    'pasaporte', 'id', 'dni', 'document', 'document number', 'doc',
  ],
  email: [
    'correo', 'correo electronico', 'correo e', 'e mail', 'mail',
    'email', 'e-mail', 'contacto email', 'correo personal',
  ],
  contacto: [
    'contacto', 'telefono', 'telefono contacto', 'celular', 'movil',
    'tel', 'phone', 'cellphone', 'whatsapp', 'telefono celular',
  ],
};

const NORMALIZED_ALIASES: Record<string, Exclude<CanonicalTarget, 'ignorar'>> = {};
for (const [target, aliases] of Object.entries(ALIAS_MAP) as [
  Exclude<CanonicalTarget, 'ignorar'>, string[],
][]) {
  for (const a of aliases) NORMALIZED_ALIASES[normalizeHeader(a)] = target;
}

/** Devuelve el campo canónico si el encabezado es un alias conocido. */
export function aliasLookup(header: string): Exclude<CanonicalTarget, 'ignorar'> | null {
  return NORMALIZED_ALIASES[normalizeHeader(header)] ?? null;
}

/** Todos los targets seleccionables en el modal de mapeo. */
export const TARGET_OPTIONS: { valor: CanonicalTarget; etiqueta: string }[] = [
  { valor: 'nombre', etiqueta: 'Nombre' },
  { valor: 'tipoIdentificacion', etiqueta: 'Tipo doc.' },
  { valor: 'identificacion', etiqueta: 'Identificación' },
  { valor: 'email', etiqueta: 'Email' },
  { valor: 'contacto', etiqueta: 'Contacto' },
  { valor: 'ignorar', etiqueta: 'Ignorar' },
];
