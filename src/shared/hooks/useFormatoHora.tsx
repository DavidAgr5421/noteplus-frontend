import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** Formato de hora: '24h' = militar (18:00), '12h' = AM/PM (6:00 p. m.). */
export type FormatoHora = '24h' | '12h';

const STORAGE_KEY = 'noteplus:formato-hora';

function leerInicial(): FormatoHora {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado === '12h' || guardado === '24h') return guardado;
  } catch {
    // localStorage no disponible: usar valor por defecto
  }
  return '24h';
}

interface FormatoHoraContextValue {
  formato: FormatoHora;
  setFormato: (formato: FormatoHora) => void;
}

const FormatoHoraContext = createContext<FormatoHoraContextValue | null>(null);

export function FormatoHoraProvider({ children }: { children: ReactNode }) {
  const [formato, setFormatoState] = useState<FormatoHora>(leerInicial);

  const setFormato = useCallback((f: FormatoHora) => {
    setFormatoState(f);
    try {
      localStorage.setItem(STORAGE_KEY, f);
    } catch {
      // ignorar: la preferencia solo no persiste
    }
  }, []);

  const value = useMemo(() => ({ formato, setFormato }), [formato, setFormato]);
  return <FormatoHoraContext.Provider value={value}>{children}</FormatoHoraContext.Provider>;
}

/** Formato de hora actual + función para cambiarlo. Debe usarse bajo <FormatoHoraProvider />. */
export function useFormatoHora(): FormatoHoraContextValue {
  const ctx = useContext(FormatoHoraContext);
  if (!ctx) throw new Error('useFormatoHora debe usarse dentro de <FormatoHoraProvider />');
  return ctx;
}
