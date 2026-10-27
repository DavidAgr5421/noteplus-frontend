import { useMemo, useRef, useState } from 'react';
import { Modal } from '@/shared/ui';
import { TARGET_OPTIONS } from '../lib/aliases';
import { inferMapping } from '../lib/infer';
import { parseFileToSheet, parseTextToSheet, sheetToRecords, type ParsedSheet } from '../lib/parse';
import { validateRecords } from '../lib/validate';
import { downloadXLSX } from '../lib/export';
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
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const analyzeSheet = (s: ParsedSheet) => {
    if (s.rows.length === 0) {
      setParseError('No se encontraron filas con datos en el archivo o texto ingresado.');
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
      setParseError('No se pudo leer el archivo. Comprueba que sea un archivo válido de Excel (.xlsx, .xls), CSV o TXT.');
    } finally {
      setParsing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const headers = ['Nombre Completo', 'Tipo Documento', 'Número Documento', 'Correo Electrónico', 'Teléfono / Contacto'];
    const rows = [
      ['Carlos Andrés Pérez Gómez', 'CC', '1098765432', 'carlos.perez@ejemplo.com', '3001234567'],
      ['María Fernanda López Díaz', 'TI', '1012345678', 'maria.lopez@ejemplo.com', '3109876543'],
      ['Alejandro Ruiz Valencia', 'CC', '1023456789', 'alejandro.ruiz@ejemplo.com', '3204567890'],
    ];
    await downloadXLSX('plantilla_aprendices_noteplus.xlsx', headers, rows);
  };

  const records = useMemo(
    () => (sheet ? sheetToRecords(sheet, mapping) : []),
    [sheet, mapping],
  );
  const issues = useMemo(() => validateRecords(records), [records]);

  // Mapa de fila (1-based) -> lista de mensajes de error
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
  const validCount = Math.max(0, records.length - invalidRows.size);

  const setTarget = (idx: number, target: CanonicalTarget) => {
    setMapping((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, target, confidence: 1, reason: 'Asignado manualmente' } : m)),
    );
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    setSheet((prev) => {
      if (!prev) return prev;
      const nextRows = prev.rows.map((r, ri) =>
        ri === rowIndex ? r.map((c, ci) => (ci === colIndex ? value : c)) : r,
      );
      return { ...prev, rows: nextRows };
    });
  };

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

  const handleModalClose = () => {
    reset();
    onClose();
  };

  const handleConfirmImport = () => {
    const recordsToImport = invalidRows.size > 0
      ? records.filter((_, idx) => !invalidRows.has(idx + 1))
      : records;
    if (recordsToImport.length > 0) {
      onConfirm(recordsToImport);
    }
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
      onClose={handleModalClose}
      size="full"
      hideCloseButton
      headerClassName="p-0 border-0"
      dialogClassName="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl rounded-none sm:rounded-2xl flex flex-col bg-white dark:bg-[#0B192C] overflow-hidden"
      contentClassName="p-0 flex flex-col flex-1 overflow-hidden"
    >
      {/* ========================================================
          1. CABECERA UNIFICADA DEL MODAL (HEADER GLOBAL)
      ======================================================== */}
      <div className="bg-[#0B192C] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span>Importar Aprendices a la Ficha</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Sube una lista desde Excel, SofiaPlus o pega los datos directamente.
          </p>
        </div>
        <button
          type="button"
          onClick={handleModalClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Cerrar modal"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* CUERPO DEL MODAL */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white dark:bg-[#0B192C]">
        {!sheet ? (
          <div className="space-y-5">
            {/* ========================================================
                2. PESTAÑAS DE MÉTODO DE ENTRADA (TABS SEGMENTADOS)
            ======================================================== */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
              <button
                type="button"
                onClick={() => setTab('archivo')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'archivo'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>Subir Archivo</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('pegar')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'pegar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                <span>Copiar y Pegar</span>
              </button>
            </div>

            {/* ========================================================
                3. PESTAÑA 1: SUBIR ARCHIVO (DRAG & DROP MODERNA)
            ======================================================== */}
            {tab === 'archivo' ? (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                  }}
                  className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-900/60 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[#00875A] dark:text-emerald-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Haz clic para seleccionar o arrastra tu archivo aquí
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Formatos compatibles: Excel (.xlsx, .xls), CSV o TXT delimitado por tabulaciones (Hasta 5 MB).
                    </p>
                  </div>
                </div>

                {/* Barra de ayuda y descarga de plantilla */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p>
                    Detecta automáticamente columnas de Nombre, Cédula/TI, Correo y Celular.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#00875A] dark:text-emerald-400 hover:underline"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>Descargar plantilla de ejemplo (.xlsx)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ========================================================
                  4. PESTAÑA 2: COPIAR Y PEGAR (ÁREA ASISTIDA)
              ======================================================== */
              <div className="space-y-4">
                <div>
                  <textarea
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    placeholder={'Pega aquí filas copiadas desde Excel, Google Sheets o SofiaPlus, ej:\n\nNOMBRE\tDOCUMENTO\tCORREO\tTELEFONO\nJuan David Pérez Gómez\tCC 1098765432\tjuan.perez@ejemplo.com\t3001234567\nMaría Fernanda López\tTI 1012345678\tmaria.lopez@ejemplo.com\t3109876543'}
                    className="font-mono text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-950 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-4 w-full h-48 resize-none leading-relaxed text-slate-800 dark:text-slate-200 outline-none transition-all placeholder-slate-400"
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    Copia las celdas directamente de tu hoja de cálculo y pégalas aquí. Las tabulaciones serán reconocidas automáticamente como columnas.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!pasted.trim()}
                    onClick={() => analyzeSheet(parseTextToSheet(pasted))}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#00875A] hover:bg-[#007048] active:bg-[#005e3c] transition-colors disabled:opacity-50 shadow-xs"
                  >
                    <span>Procesar y Validar Datos</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {parsing && (
              <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <span>Procesando y analizando columnas del archivo...</span>
              </div>
            )}

            {parseError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <svg className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{parseError}</span>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================
              5. PASO DE VALIDACIÓN DE DATOS (PREVISUALIZACIÓN)
          ======================================================== */
          <div className="space-y-4">
            {/* Barra de Estado del Procesamiento */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Detectamos <span className="font-bold text-slate-900 dark:text-white">{records.length} aprendices</span>:{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{validCount} listos para guardar</span>
                {invalidRows.size > 0 && (
                  <>
                    {' · '}
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {invalidRows.size} fila(s) con errores
                    </span>
                  </>
                )}
              </div>

              {invalidRows.size > 0 && (
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-950 text-xs font-semibold shrink-0">
                  <button
                    type="button"
                    onClick={() => setOnlyErrors(false)}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      !onlyErrors
                        ? 'bg-[#0B192C] text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Ver todos ({records.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlyErrors(true)}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      onlyErrors
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
                    }`}
                  >
                    Solo con errores ({invalidRows.size})
                  </button>
                </div>
              )}
            </div>

            {/* Aviso tras importar cuando hubo errores de servidor */}
            {serverResult && (
              <div
                className={`rounded-xl border p-4 text-xs space-y-2 ${
                  serverResult.skipped.length > 0
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                }`}
                role="alert"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold flex items-center gap-1.5">
                    {serverResult.skipped.length > 0 ? (
                      <>
                        <svg className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Se importaron {serverResult.created} estudiante(s), pero {serverResult.skipped.length} tuvieron observaciones:</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Se importaron exitosamente los {serverResult.created} aprendices.</span>
                      </>
                    )}
                  </p>
                  {serverResult.skipped.length > 0 && (
                    <button
                      type="button"
                      onClick={keepOnlySkippedRows}
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-[#00875A] hover:bg-[#007048] text-white transition-colors"
                    >
                      Corregir solo los {serverResult.skipped.length} faltantes
                    </button>
                  )}
                </div>
                {serverResult.skipped.length > 0 && (
                  <ul className="max-h-32 overflow-y-auto space-y-1 pl-4 list-disc text-[11px]">
                    {serverResult.skipped.map((s, i) => (
                      <li key={i}>
                        <span className="font-semibold">{records[s.index]?.nombre || `Fila ${s.index + 1}`}</span> — {s.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* VISTA 1: ESCRITORIO / TABLET (TABLA COMPACTA EDITABLE) */}
            <div className="hidden sm:block max-h-80 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071626]">
              <table className="w-full min-w-[720px] border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#071626] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="w-36 px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Fila / Estado
                    </th>
                    {sheet.headers.map((h, i) => {
                      const m = mapping[i];
                      return (
                        <th key={i} className="min-w-40 px-3 py-2 text-left">
                          <div className="truncate text-slate-600 dark:text-slate-400 font-medium mb-1" title={h}>
                            {h}
                          </div>
                          <select
                            value={m?.target ?? 'ignorar'}
                            onChange={(e) => setTarget(i, e.target.value as CanonicalTarget)}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-emerald-500 outline-none"
                            aria-label={`Mapeo para columna ${h}`}
                          >
                            {TARGET_OPTIONS.map((o) => (
                              <option key={o.valor} value={o.valor}>
                                {o.etiqueta}
                              </option>
                            ))}
                          </select>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {rowsToRender.map(({ row, ri, rec, rowIssues }) => {
                    const hasError = rowIssues.length > 0;
                    return (
                      <tr
                        key={ri}
                        className={
                          hasError
                            ? 'border-l-4 border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }
                      >
                        <td className="px-3 py-2 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-400 font-bold">#{ri + 1}</span>
                            {hasError ? (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300"
                                title={rowIssues.join(' · ')}
                              >
                                Error
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                                {rec?.tipoIdentificacion} {rec?.identificacion}
                              </span>
                            )}
                          </div>
                          {hasError && (
                            <p className="mt-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400 leading-tight">
                              {rowIssues.join(' · ')}
                            </p>
                          )}
                        </td>
                        {row.map((c, ci) => (
                          <td key={ci} className="px-2 py-1.5 align-middle">
                            <input
                              type="text"
                              value={c}
                              onChange={(e) => updateCell(ri, ci, e.target.value)}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500 outline-none"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* VISTA 2: TELÉFONOS MÓVILES (<640px - CARD VIEW APILADA) */}
            <div className="block sm:hidden space-y-3 max-h-80 overflow-y-auto pr-1">
              {rowsToRender.map(({ row, ri, rec, rowIssues }) => {
                const hasError = rowIssues.length > 0;
                return (
                  <div
                    key={ri}
                    className={`rounded-xl border p-3 space-y-2.5 ${
                      hasError
                        ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        Aprendiz #{ri + 1}
                      </span>
                      {hasError ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                          Fila con observaciones
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                          Listo ({rec?.tipoIdentificacion} {rec?.identificacion})
                        </span>
                      )}
                    </div>

                    {hasError && (
                      <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        {rowIssues.join(' · ')}
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      {sheet.headers.map((h, ci) => {
                        const target = mapping[ci]?.target ?? 'ignorar';
                        return (
                          <div key={ci}>
                            <label className="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-0.5">
                              {h} <span className="text-emerald-600 font-normal">({target})</span>
                            </label>
                            <input
                              type="text"
                              value={row[ci] || ''}
                              onChange={(e) => updateCell(ri, ci, e.target.value)}
                              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Callout de resumen de errores */}
            {issues.length > 0 && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <svg className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <span className="font-semibold">Atención: </span>
                  <span>Corrige las filas marcadas con errores en la tabla antes de guardar, o bien continúa para importar únicamente los aprendices con datos válidos.</span>
                </div>
              </div>
            )}

            {serverError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                <span className="font-semibold">Error al importar: </span>
                <span>{serverError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          6. PIE DE ACCIONES DEL MODAL (FOOTER FIJO)
      ======================================================== */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
        <div>
          {sheet ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span>Volver / Cambiar archivo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleModalClose}
              className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {sheet && (
            <button
              type="button"
              onClick={handleModalClose}
              className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
          )}

          {sheet && (
            <button
              type="button"
              disabled={isLoading || (invalidRows.size === 0 ? records.length === 0 : validCount === 0)}
              onClick={handleConfirmImport}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold shadow-xs bg-[#00875A] hover:bg-[#007048] active:bg-[#005e3c] text-white transition-colors disabled:opacity-50"
            >
              {isLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              <span>
                {invalidRows.size === 0
                  ? `Importar ${records.length} Aprendices Listos`
                  : validCount > 0
                  ? `Importar ${validCount} Aprendices Válidos`
                  : 'Sin aprendices válidos'}
              </span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
