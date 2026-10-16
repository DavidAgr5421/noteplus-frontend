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
  onClearServerResult?: () => void;
}

const NAVY_HEADER = 'flex items-center justify-between rounded-t-3xl bg-navy-900 px-5 py-4';

function confidenceBadge(c: number) {
  if (c >= 0.85) return 'bg-green-100 text-green-800';
  if (c >= 0.55) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

export function ImportWizard({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  serverResult,
  serverError,
  onClearServerResult,
}: ImportWizardProps) {
  const [tab, setTab] = useState<'archivo' | 'pegar'>('archivo');
  const [pasted, setPasted] = useState('');
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<MappingSuggestion[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);

  const analyzeSheet = (s: ParsedSheet) => {
    if (s.rows.length === 0) {
      setParseError('No se encontraron filas con datos.');
      return;
    }
    setSheet(s);
    setMapping(inferMapping(s.headers, s.rows));
    setParseError(null);
    setOnlyErrors(false);
    onClearServerResult?.();
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

  // Mapa de fila (1-based) -> lista de mensajes de error (cliente + servidor)
  const issuesByRow = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const iss of issues) {
      map.set(iss.row, [...(map.get(iss.row) ?? []), iss.message.replace(/^Fila \d+:\s*/i, '')]);
    }
    if (serverResult?.skipped) {
      for (const s of serverResult.skipped) {
        const rowNum = s.index + 1;
        map.set(rowNum, [...(map.get(rowNum) ?? []), s.reason.replace(/^fila \d+:\s*/i, '')]);
      }
    }
    return map;
  }, [issues, serverResult]);

  const invalidRows = useMemo(() => new Set(issuesByRow.keys()), [issuesByRow]);
  const validCount = records.length - invalidRows.size;

  const setTarget = (idx: number, target: CanonicalTarget) => {
    setMapping((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, target, confidence: 1, reason: 'Asignado manualmente' } : m)),
    );
  };

  /** Edita directamente el texto de una celda en la fila `rowIndex` y columna `colIndex`. */
  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    setSheet((prev) => {
      if (!prev) return prev;
      const nextRows = prev.rows.map((r, ri) =>
        ri === rowIndex ? r.map((c, ci) => (ci === colIndex ? value : c)) : r,
      );
      return { ...prev, rows: nextRows };
    });
  };

  /** Filtra la hoja para dejar únicamente las filas que fallaron en el servidor y corregirlas. */
  const keepOnlySkippedRows = () => {
    if (!sheet || !serverResult?.skipped.length) return;
    const skippedIdx = new Set(serverResult.skipped.map((s) => s.index));
    const filteredRows = sheet.rows.filter((_, idx) => skippedIdx.has(idx));
    setSheet({ ...sheet, rows: filteredRows });
    setOnlyErrors(false);
    onClearServerResult?.();
  };

  const reset = () => {
    setSheet(null);
    setMapping([]);
    setPasted('');
    setParseError(null);
    setOnlyErrors(false);
    onClearServerResult?.();
  };

  const rowsToRender = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows
      .map((row, ri) => ({ row, ri, rec: records[ri], rowIssues: issuesByRow.get(ri + 1) ?? [] }))
      .filter((item) => (!onlyErrors ? true : item.rowIssues.length > 0));
  }, [sheet, records, issuesByRow, onlyErrors]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { reset(); onClose(); }}
      title="Importar estudiantes"
      size="xl"
      headerClassName={NAVY_HEADER}
      titleClassName="text-lg font-semibold text-white"
      closeButtonClassName="rounded-full p-1.5 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      {!sheet ? (
        <div className="space-y-4">
          <div className="flex gap-2 rounded-full bg-gray-100 dark:bg-white/10 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setTab('archivo')}
              className={`flex-1 rounded-full px-3 py-1.5 ${tab === 'archivo' ? 'bg-white dark:bg-slate-800 shadow' : 'text-gray-500 dark:text-slate-400'}`}
            >
              Archivo (CSV, Excel, TXT)
            </button>
            <button
              type="button"
              onClick={() => setTab('pegar')}
              className={`flex-1 rounded-full px-3 py-1.5 ${tab === 'pegar' ? 'bg-white dark:bg-slate-800 shadow' : 'text-gray-500 dark:text-slate-400'}`}
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
                className="block w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                Acepta columnas con nombres variados (“nombre completo”, “cédula”, “mail”, “contacto”…)
                e incluso tipo y número juntos (“CC 123456”, “T.I 1011513696”, “C.C 1035419262”, “Ti.1049322140”).
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={8}
                placeholder={'Pega aquí filas desde Excel, Google Forms o SofiaPlus, ej:\nNOMBRE\tDOCUMENTO\nJUAN PEREZ\tT.I 1011513696'}
                className="w-full rounded-2xl border border-gray-300 dark:border-white/15 bg-white dark:bg-slate-950 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-navy-900 dark:text-slate-100 placeholder-slate-400"
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
          {parsing && <p className="text-sm text-gray-500 dark:text-slate-400">Leyendo archivo…</p>}
          {parseError && <p className="text-sm text-red-600 dark:text-rose-400">{parseError}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barra superior de resumen y filtro de errores */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Detectamos{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{records.length} estudiantes</span>
              {' · '}
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{validCount} listos</span>
              {invalidRows.size > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {invalidRows.size} con problemas
                  </span>
                </>
              )}
              . Puedes editar cualquier celda directamente en la tabla.
            </p>

            {invalidRows.size > 0 && (
              <div className="inline-flex rounded-full bg-slate-100 dark:bg-white/10 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setOnlyErrors(false)}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    !onlyErrors
                      ? 'bg-navy-900 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Todas ({records.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyErrors(true)}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    onlyErrors
                      ? 'bg-[#a16074] text-white'
                      : 'text-rose-700 dark:text-rose-300 hover:text-rose-900'
                  }`}
                >
                  Con errores ({invalidRows.size})
                </button>
              </div>
            )}
          </div>

          {/* Aviso prominente tras importar cuando hubo estudiantes con errores */}
          {serverResult && (
            <div
              className={`rounded-2xl border p-4 text-xs space-y-2 ${
                serverResult.skipped.length > 0
                  ? 'bg-amber-50/90 dark:bg-amber-500/10 border-amber-300 dark:border-amber-400/30 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-50/90 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-400/30 text-emerald-900 dark:text-emerald-200'
              }`}
              role="alert"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">
                  {serverResult.skipped.length > 0
                    ? `⚠ Se importaron ${serverResult.created} estudiante(s), pero ${serverResult.skipped.length} NO se añadieron por errores:`
                    : `✓ Se importaron correctamente los ${serverResult.created} estudiantes.`}
                </p>
                {serverResult.skipped.length > 0 && (
                  <Button size="sm" variant="navyGreen" onClick={keepOnlySkippedRows}>
                    Corregir solo los {serverResult.skipped.length} faltantes
                  </Button>
                )}
              </div>
              {serverResult.skipped.length > 0 && (
                <ul className="max-h-36 overflow-y-auto space-y-1 pl-4 list-disc">
                  {serverResult.skipped.map((s, i) => {
                    const st = records[s.index];
                    const nombre = st?.nombre || `Fila ${s.index + 1}`;
                    const doc = st?.identificacion ? `(${st.tipoIdentificacion} ${st.identificacion})` : '(sin identificación válida)';
                    return (
                      <li key={i}>
                        <span className="font-semibold">{nombre}</span> {doc} — {s.reason}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Tabla de mapeo de columnas y edición en vivo por celda */}
          <div className="max-h-80 overflow-auto rounded-2xl border border-slate-200/70 dark:border-white/15 bg-white dark:bg-black">
            <table className="w-full min-w-[760px] border-collapse text-sm dark:bg-black">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#071626] shadow-xs">
                <tr>
                  <th className="w-44 border-b border-slate-200/60 dark:border-white/10 px-3 py-2 text-left align-top">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fila / ID detectado</div>
                    <div className="mt-1 text-[11px] font-normal text-slate-400">Estado de validación</div>
                  </th>
                  {sheet.headers.map((h, i) => {
                    const m = mapping[i];
                    return (
                      <th key={i} className="min-w-44 border-b border-slate-200/60 dark:border-white/10 px-3 py-2 text-left align-top">
                        <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400" title={h}>{h}</div>
                        <select
                          value={m?.target ?? 'ignorar'}
                          onChange={(e) => setTarget(i, e.target.value as CanonicalTarget)}
                          className="mt-1 w-full rounded-full border border-slate-200/80 dark:border-white/15 bg-white dark:bg-slate-950 px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-navy-900/30 dark:text-slate-100"
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
                            <span className="rounded-full bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              dividido
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="dark:bg-black">
                {rowsToRender.map(({ row, ri, rec, rowIssues }) => {
                  const hasError = rowIssues.length > 0;
                  const idIssue = rowIssues.some((msg) => /identificaci|tipo doc|duplicad/i.test(msg));
                  return (
                    <tr
                      key={ri}
                      className={
                        hasError
                          ? 'bg-rose-50/80 dark:bg-rose-500/15'
                          : 'dark:bg-black hover:bg-slate-50/70 dark:hover:bg-white/5'
                      }
                    >
                      <td className="border-b border-slate-100 dark:border-white/10 px-3 py-1.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
                            #{ri + 1}
                          </span>
                          {hasError ? (
                            <span
                              className="inline-flex items-center rounded-full bg-[#a16074] px-2 py-0.5 text-[10px] font-bold text-white"
                              title={rowIssues.join(' · ')}
                            >
                              ⚠ Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                              ✓ {rec?.tipoIdentificacion} {rec?.identificacion}
                            </span>
                          )}
                        </div>
                        {hasError && (
                          <p className="mt-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 leading-tight">
                            {rowIssues.join(' · ')}
                          </p>
                        )}
                      </td>
                      {row.map((c, ci) => {
                        const target = mapping[ci]?.target ?? 'ignorar';
                        const highlightCell =
                          hasError &&
                          ((idIssue && (target === 'identificacion' || target === 'tipoIdentificacion')) ||
                            (target === 'nombre' && rowIssues.some((m) => /nombre/i.test(m))) ||
                            (target === 'email' && rowIssues.some((m) => /email/i.test(m))));
                        return (
                          <td
                            key={ci}
                            className="border-b border-slate-100 dark:border-white/10 px-2 py-1.5 align-middle"
                          >
                            <input
                              type="text"
                              value={c}
                              onChange={(e) => updateCell(ri, ci, e.target.value)}
                              aria-label={`Fila ${ri + 1}, columna ${sheet.headers[ci]}`}
                              placeholder="Vacío — clic para editar"
                              className={`w-full min-w-[130px] rounded-lg border px-2 py-1 text-xs transition-colors focus:outline-none focus:ring-2 ${
                                highlightCell
                                  ? 'border-rose-400 bg-white dark:bg-slate-950 text-rose-900 dark:text-rose-200 ring-1 ring-rose-400 focus:ring-rose-500 font-semibold'
                                  : target !== 'ignorar'
                                  ? 'border-slate-200/80 dark:border-white/15 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:border-navy-900 focus:ring-navy-900/30'
                                  : 'border-transparent bg-transparent text-slate-500 dark:text-slate-400 hover:border-slate-200 focus:bg-white dark:focus:bg-slate-950 focus:border-slate-300'
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lista detallada de problemas detectados antes de importar */}
          {issues.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-2xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-400/20 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">
                ⚠ Hay {issues.length} problema(s) en las filas marcadas en rojo (edita las celdas arriba antes de importar):
              </p>
              {issues.slice(0, 20).map((iss, i) => {
                const st = records[iss.row - 1];
                return (
                  <p key={i}>
                    • <span className="font-semibold">{st?.nombre || `Fila ${iss.row}`}</span>: {iss.message}
                  </p>
                );
              })}
              {issues.length > 20 && <p>…y {issues.length - 20} avisos más.</p>}
            </div>
          )}

          {serverError && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-400/20 p-3 text-xs text-rose-700 dark:text-rose-300">
              <p className="font-semibold">No se pudo importar: {serverError}</p>
              <p className="mt-1">Si el error persiste, verifica que el backend tenga la migración al día (`alembic upgrade head`).</p>
            </div>
          )}

          <div className="flex justify-between gap-3">
            <Button variant="ghost" onClick={reset}>Volver</Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => { reset(); onClose(); }}>
                {serverResult && serverResult.created > 0 ? 'Cerrar' : 'Cancelar'}
              </Button>
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
