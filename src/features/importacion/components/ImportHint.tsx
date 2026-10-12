import { useState } from 'react';

const STORAGE_KEY = 'np-import-hint-dismissed';

interface ImportHintProps {
  ctaLabel: string;
  onCta: () => void;
}

/**
 * Recordatorio poco invasivo (arriba a la derecha) de que se pueden
 * importar datos desde Excel, CSV o SofiaPlus. Se descarta una vez
 * y no vuelve a aparecer (localStorage).
 */
export function ImportHint({ ctaLabel, onCta }: ImportHintProps) {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* sin almacenamiento: se oculta igual en esta vista */
    }
    setVisible(false);
  };

  return (
    <div
      role="note"
      aria-label="Sugerencia de importación"
      className="fixed right-4 top-20 z-40 w-72 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur"
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-green-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">¿Ya trajiste tus estudiantes?</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Importa desde Excel, CSV o copiando de SofiaPlus.
          </p>
          <button
            type="button"
            onClick={onCta}
            className="mt-2 rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-green-400 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-900"
          >
            {ctaLabel}
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="No volver a mostrar"
          title="No volver a mostrar"
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
