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
      className="inline-flex items-center rounded-full border border-gray-300 bg-white p-1"
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
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            formato === op.valor ? 'bg-navy-900 text-green-400' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {op.etiqueta}
        </button>
      ))}
    </div>
  );
}
