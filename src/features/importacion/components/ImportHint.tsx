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
      className="fixed right-5 top-20 z-40 w-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B192C] p-4 shadow-xl shadow-slate-900/10 dark:shadow-black/60 backdrop-blur-md animate-slide-down"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B192C] dark:bg-slate-800 text-emerald-400 border border-slate-800 dark:border-slate-700/80 shadow-xs">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">¿Ya trajiste tus estudiantes?</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Importa desde Excel, CSV o copiando directamente de SofiaPlus.
          </p>
          <button
            type="button"
            onClick={onCta}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#00875A] hover:bg-[#007048] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>{ctaLabel}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="No volver a mostrar"
          title="No volver a mostrar"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
