import { useMemo, useState } from 'react';
import { Button, Modal } from '@/shared/ui';
import { TARGET_OPTIONS } from '../lib/aliases';
import { inferMapping } from '../lib/infer';
import { parseFileToSheet, parseTextToSheet, sheetToRecords, type ParsedSheet } from '../lib/parse';
import { validateRecords } from '../lib/validate';
import type { CanonicalTarget, EstudianteImportado, MappingSuggestion } from '../lib/types';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (records: EstudianteImportado[]) => void;
  isLoading?: boolean;
  serverResult?: { created: number; skipped: { index: number; reason: string }[] } | null;
  serverError?: string | null;
}

const NAVY_HEADER = 'flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4';

function confidenceBadge(c: number) {
  if (c >= 0.85) return 'bg-green-100 text-green-800';
  if (c >= 0.55) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

export function ImportWizard({ isOpen, onClose, onConfirm, isLoading, serverResult, serverError }: ImportWizardProps) {
  const [tab, setTab] = useState<'archivo' | 'pegar'>('archivo');
  const [pasted, setPasted] = useState('');
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<MappingSuggestion[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const analyzeSheet = (s: ParsedSheet) => {
    if (s.rows.length === 0) {
      setParseError('No se encontraron filas con datos.');
      return;
    }
    setSheet(s);
    setMapping(inferMapping(s.headers, s.rows));
    setParseError(null);
  };

  const handleFile = async (f: File | null) => {
    if (!f) return;
    setParsing(true);
    setParseError(null);
    try {
      const name = f.name.toLowerCase();
      if (/\.(txt|csv)$/i.test(name)) {
        analyzeSheet(parseTextToSheet(await f.text()));
      } else {
        analyzeSheet(await parseFileToSheet(f));
      }
    } catch {
      setParseError('No se pudo leer el archivo. Prueba con CSV, Excel o TXT en UTF-8.');
    } finally {
      setParsing(false);
    }
  };

  const records = useMemo(
    () => (sheet ? sheetToRecords(sheet, mapping) : []),
    [sheet, mapping],
  );
  const issues = useMemo(() => validateRecords(records), [records]);
  const invalidRows = useMemo(() => new Set(issues.map((i) => i.row)), [issues]);
  const validCount = records.length - new Set(issues.filter((i) => /requerido|numérica|inválido/.test(i.message)).map((i) => i.row)).size;

  const setTarget = (idx: number, target: CanonicalTarget) => {
    setMapping((prev) => prev.map((m, i) => (i === idx ? { ...m, target, confidence: 1, reason: 'Asignado manualmente' } : m)));
  };

  const reset = () => {
    setSheet(null);
    setMapping([]);
    setPasted('');
    setParseError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { reset(); onClose(); }}
      title="Importar estudiantes"
      size="lg"
      headerClassName={NAVY_HEADER}
      titleClassName="text-lg font-semibold text-white"
      closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      {!sheet ? (
        <div className="space-y-4">
          <div className="flex gap-2 rounded-full bg-gray-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setTab('archivo')}
              className={`flex-1 rounded-full px-3 py-1.5 ${tab === 'archivo' ? 'bg-white shadow' : 'text-gray-500'}`}
            >
              Archivo (CSV, Excel, TXT)
            </button>
            <button
              type="button"
              onClick={() => setTab('pegar')}
              className={`flex-1 rounded-full px-3 py-1.5 ${tab === 'pegar' ? 'bg-white shadow' : 'text-gray-500'}`}
            >
              Copiar y pegar
            </button>
          </div>

          {tab === 'archivo' ? (
            <div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-2 text-xs text-gray-500">
                Acepta columnas con nombres variados (“nombre completo”, “cédula”, “mail”, “contacto”…)
                e incluso tipo y número juntos (“CC 123456”).
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={8}
                placeholder={'Pega aquí filas desde Excel o SofiaPlus, ej:\nNOMBRE\tDOCUMENTO\nJUAN PEREZ CC 12345678\tjuan@mail.com'}
                className="w-full rounded-2xl border border-gray-300 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-navy-900"
              />
              <div className="flex justify-end">
                <Button
                  variant="navy"
                  disabled={!pasted.trim()}
                  onClick={() => analyzeSheet(parseTextToSheet(pasted))}
                >
                  Analizar pegado
                </Button>
              </div>
            </div>
          )}
          {parsing && <p className="text-sm text-gray-500">Leyendo archivo…</p>}
          {parseError && <p className="text-sm text-red-600">{parseError}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Revisa que cada columna apunte al campo correcto. Detectamos{' '}
            <span className="font-semibold text-gray-900">{records.length} estudiantes</span>
            {validCount < records.length && (
              <> · <span className="font-semibold text-amber-700">{validCount} válidos</span></>
            )}.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {sheet.headers.map((h, i) => {
                    const m = mapping[i];
                    return (
                      <th key={i} className="min-w-40 border-b border-slate-200/60 px-3 py-2 text-left align-top">
                        <div className="truncate text-xs font-medium text-slate-500" title={h}>{h}</div>
                        <select
                          value={m?.target ?? 'ignorar'}
                          onChange={(e) => setTarget(i, e.target.value as CanonicalTarget)}
                          className="mt-1 w-full rounded-full border border-slate-200/80 bg-white px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                          aria-label={`Campo para columna ${h}`}
                        >
                          {TARGET_OPTIONS.map((o) => (
                            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                          ))}
                        </select>
                        <div className="mt-1 flex items-center gap-1">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${confidenceBadge(m?.confidence ?? 0)}`}>
                            {m?.reason === 'Asignado manualmente' ? 'manual' : `${Math.round((m?.confidence ?? 0) * 100)}%`}
                          </span>
                          {m?.needsSplit && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              dividido
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.slice(0, 6).map((row, ri) => (
                  <tr key={ri} className={invalidRows.has(ri + 1) ? 'bg-rose-50/70' : undefined}>
                    {row.map((c, ci) => (
                      <td key={ci} className="max-w-48 truncate border-b border-slate-100 px-3 py-1.5 text-xs text-slate-700" title={c}>
                        {c || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sheet.rows.length > 6 && (
            <p className="text-xs text-slate-400">Mostrando 6 de {sheet.rows.length} filas.</p>
          )}

          {issues.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-2xl bg-amber-50/80 border border-amber-200/50 p-3 text-xs text-amber-800">
              {issues.slice(0, 20).map((iss, i) => <p key={i}>{iss.message}</p>)}
              {issues.length > 20 && <p>…y {issues.length - 20} avisos más.</p>}
            </div>
          )}

          {serverError && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200/60 p-3 text-xs text-rose-700">
              <p className="font-semibold">No se pudo importar: {serverError}</p>
              <p className="mt-1">Si el error persiste, verifica que el backend tenga la migración al día (`alembic upgrade head`).</p>
            </div>
          )}

          {serverResult && (
            <div className="rounded-2xl bg-gray-50 p-3 text-xs">
              <p className="font-semibold text-gray-900">Resultado: {serverResult.created} creados.</p>
              {serverResult.skipped.map((s, i) => <p key={i} className="text-amber-700">{s.reason}</p>)}
            </div>
          )}

          <div className="flex justify-between gap-3">
            <Button variant="ghost" onClick={reset}>Volver</Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
              <Button
                variant="success"
                loading={isLoading}
                disabled={records.length === 0}
                onClick={() => onConfirm(records)}
              >
                Importar {records.length} estudiantes
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
