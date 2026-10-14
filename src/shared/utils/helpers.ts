export const parseLocalDate = (date: string | Date | null | undefined): Date => {
  if (!date) return new Date(NaN);
  if (date instanceof Date) return date;
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
  }
  return new Date(date);
};

export const formatDate = (date: string | Date | null | undefined, format: 'short' | 'long' | 'time' = 'short'): string => {
  const d = parseLocalDate(date);
  if (isNaN(d.getTime())) return '';
  
  const options: Intl.DateTimeFormatOptions = 
    format === 'short' 
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : format === 'long'
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { hour: '2-digit', minute: '2-digit', hour12: false };
  
  return d.toLocaleDateString('es-CO', options);
};

export const formatDateForInput = (date: string | Date | null | undefined): string => {
  const d = parseLocalDate(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseTime = (time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const formatTime = (time: string): string => {
  return time.substring(0, 5);
};

export type FormatoHoraOption = '24h' | '12h';

/** Formatea "HH:mm" según preferencia: '24h' → "18:00", '12h' → "6:00 p. m.". */
export const formatHora = (time: string, formato: FormatoHoraOption = '24h'): string => {
  const base = formatTime(time);
  if (formato === '24h') return base;
  const [h, m] = base.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return base;
  const periodo = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${periodo}`;
};

export const claseTitle = (clase: { fecha: string; hora: string }, formato: FormatoHoraOption = '24h'): string => {
  return `${formatDate(clase.fecha, 'long')} · ${formatHora(clase.hora, formato)}`;
};

/** Rango horario de una clase: "18:00 – 20:00". Si no hay hora de fin, solo la hora de inicio. */
export const claseHorarioLabel = (
  clase: { hora: string; horaFin?: string | null },
  formato: FormatoHoraOption = '24h',
): string => {
  const inicio = formatHora(clase.hora, formato);
  const fin = clase.horaFin ? formatHora(clase.horaFin, formato) : '';
  return fin ? `${inicio} – ${fin}` : inicio;
};

export const getDayName = (dayIndex: number): string => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayIndex] || '';
};

export const getShortDayName = (dayIndex: number): string => {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[dayIndex] || '';
};

export const isToday = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;
  const today = new Date();
  const target = parseLocalDate(date);
  if (isNaN(target.getTime())) return false;
  return (
    today.getFullYear() === target.getFullYear() &&
    today.getMonth() === target.getMonth() &&
    today.getDate() === target.getDate()
  );
};

export const roundToOneDecimal = (value: number): number => {
  return Math.round(value * 10) / 10;
};

export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return roundToOneDecimal((value / total) * 100);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const generateId = (): string => {
  return crypto.randomUUID();
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const classNames = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};