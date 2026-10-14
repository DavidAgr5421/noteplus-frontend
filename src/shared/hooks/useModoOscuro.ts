import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'noteplus:modo-oscuro';

function leerInicial(): boolean {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado !== null) return guardado === 'oscuro';
  } catch {
    /* sin almacenamiento disponible */
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

/** Modo oscuro por clase `.dark` en `<html>` (ver `@custom-variant` en index.css). Persiste en localStorage. */
export function useModoOscuro() {
  const [oscuro, setOscuro] = useState(leerInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro);
    try {
      localStorage.setItem(STORAGE_KEY, oscuro ? 'oscuro' : 'claro');
    } catch {
      /* sin almacenamiento disponible */
    }
  }, [oscuro]);

  const alternar = useCallback(() => setOscuro((v) => !v), []);

  return { oscuro, alternar };
}
