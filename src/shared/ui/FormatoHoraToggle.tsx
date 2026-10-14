import { useFormatoHora, type FormatoHora } from '../hooks/useFormatoHora';

const OPCIONES: Array<{ valor: FormatoHora; etiqueta: string; titulo: string }> = [
  { valor: '24h', etiqueta: '24h', titulo: 'Hora militar (24 horas)' },
  { valor: '12h', etiqueta: '12h', titulo: 'AM/PM (12 horas)' },
];

/** Selector de formato de hora (militar 24h vs AM/PM 12h). La elección persiste en localStorage. */
export function FormatoHoraToggle() {
  const { formato, setFormato } = useFormatoHora();

  return (
    <div
      className="inline-flex items-center rounded-full border border-slate-200/80 bg-white p-0.5 shadow-xs"
      role="group"
      aria-label="Formato de hora"
    >
      {OPCIONES.map((op) => (
        <button
          key={op.valor}
          type="button"
          onClick={() => setFormato(op.valor)}
          aria-pressed={formato === op.valor}
          title={op.titulo}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
            formato === op.valor ? 'bg-navy-900 text-emerald-400 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {op.etiqueta}
        </button>
      ))}
    </div>
  );
}
