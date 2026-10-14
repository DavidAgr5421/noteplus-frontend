import { useState } from 'react';
import { Button, Modal } from '@/shared/ui';
import { estudiantesApi } from '@/features/estudiantes/api/estudiantesApi';
import { calificacionesApi } from '@/features/calificaciones/api/calificacionesApi';
import { asistenciasApi } from '@/features/asistencias/api/asistenciasApi';
import {
  asistenciasWide,
  downloadCSV,
  downloadXLSX,
  estudiantesMatrix,
  notasMatrix,
  notesToAddresses,
} from '../lib/export';

export type ExportDataset = 'estudiantes' | 'notas' | 'asistencias';
export type ExportFormato = 'csv' | 'xlsx';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fichaId: string;
  fichaCodigo?: string;
  initialDataset?: ExportDataset;
}

const DATASETS: { valor: ExportDataset; etiqueta: string; descripcion: string }[] = [
  { valor: 'estudiantes', etiqueta: 'Estudiantes', descripcion: 'Nombre, documento, email y contacto.' },
  { valor: 'notas', etiqueta: 'Calificaciones', descripcion: 'Notas por actividad, final y estado.' },
  { valor: 'asistencias', etiqueta: 'Asistencias', descripcion: 'Tipo ID, días como columnas, justificación y % asistencia.' },
];

export function ExportDialog({ isOpen, onClose, fichaId, fichaCodigo, initialDataset = 'estudiantes' }: ExportDialogProps) {
  const [dataset, setDataset] = useState<ExportDataset>(initialDataset);
  const [formato, setFormato] = useState<ExportFormato>('xlsx');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<string | null>(null);

  const handleDownload = async () => {
    setExporting(true);
    setError(null);
    setProgreso(null);
    try {
      const base = `${dataset === 'estudiantes' ? 'estudiantes' : dataset === 'notas' ? 'notas' : 'asistencias'}-${fichaCodigo ?? fichaId}`;
      const filename = `${base}.${formato}`;
      let headers: string[];
      let rows: (string | number)[][];

      if (dataset === 'estudiantes') {
        const list = await estudiantesApi.list(fichaId);
        ({ headers, rows } = estudiantesMatrix(list));
      } else if (dataset === 'notas') {
        const notas = await calificacionesApi.getFichaNotas(fichaId);
        ({ headers, rows } = notasMatrix(notas));
      } else {
        setProgreso('Cargando clases…');
        const clases = (await asistenciasApi.getCalendar('2000-01-01', '2100-01-01'))
          .filter((c) => c.fichaId === fichaId)
          .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
        const list = await estudiantesApi.list(fichaId);
        const porClase = new Map<string, Awaited<ReturnType<typeof asistenciasApi.getAsistencias>>>();
        for (let i = 0; i < clases.length; i++) {
          setProgreso(`Cargando asistencias ${i + 1} de ${clases.length}…`);
          porClase.set(clases[i].id, await asistenciasApi.getAsistencias(clases[i].id));
        }
        const wide = asistenciasWide(clases, list, porClase);
        headers = wide.headers;
        rows = wide.rows;
        if (formato === 'csv') {
          // Sin comentarios en CSV: la justificación va entre paréntesis en la celda.
          for (const n of wide.notes) rows[n.r][n.c] = `${rows[n.r][n.c]} (${n.text})`;
        } else {
          await downloadXLSX(filename, headers, rows, notesToAddresses(wide.notes));
          onClose();
          return;
        }
      }

      if (formato === 'csv') downloadCSV(filename, headers, rows);
      else await downloadXLSX(filename, headers, rows);
      onClose();
    } catch {
      setError('No se pudo generar la exportación. Intenta de nuevo.');
    } finally {
      setExporting(false);
      setProgreso(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar"
      size="sm"
      headerClassName="flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4"
      titleClassName="text-lg font-semibold text-white"
      closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">Datos</p>
          <div className="space-y-1" role="radiogroup" aria-label="Conjunto de datos a exportar">
            {DATASETS.map((d) => (
              <button
                key={d.valor}
                type="button"
                role="radio"
                aria-checked={dataset === d.valor}
                onClick={() => setDataset(d.valor)}
                className={`w-full rounded-2xl border px-3 py-2 text-left transition-colors ${
                  dataset === d.valor ? 'border-navy-900 bg-navy-900/5 dark:bg-navy-900' : 'border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/25'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{d.etiqueta}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{d.descripcion}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Formato</p>
          <div className="flex gap-2 rounded-full bg-slate-100 dark:bg-white/10 p-1 text-sm font-medium" role="radiogroup" aria-label="Formato de descarga">
            {(['csv', 'xlsx'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={formato === f}
                onClick={() => setFormato(f)}
                className={`flex-1 rounded-full px-3 py-1.5 transition-all ${formato === f ? 'bg-white dark:bg-slate-800 shadow-xs font-semibold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {f === 'csv' ? 'CSV' : 'Excel'}
              </button>
            ))}
          </div>
        </div>

        {progreso && <p className="text-xs text-slate-500 dark:text-slate-400">{progreso}</p>}
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="navyGreen" loading={exporting} onClick={handleDownload}>
            Descargar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
