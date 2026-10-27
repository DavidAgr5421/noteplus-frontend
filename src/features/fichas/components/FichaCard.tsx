import { useState, useRef, useEffect } from 'react';
import type { Ficha } from '../types';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { formatHora, getShortDayName } from '@/shared/utils/helpers';

interface FichaCardProps {
  ficha: Ficha;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onFinalize?: () => void;
  onReopen?: () => void;
  isArchived?: boolean;
}

function horarioResumenTexto(ficha: Ficha, formato: '12h' | '24h'): string {
  const horarios = [...(ficha.horarios ?? [])].sort(
    (a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora)
  );
  if (horarios.length === 0) return 'Sin horario';

  const partes = horarios.map((h) => {
    const dia = getShortDayName(h.diaSemana);
    const hora = formatHora(h.hora, formato);
    return `${dia} ${hora}`;
  });

  return partes.join(' · ');
}

function trimestreTexto(ficha: Ficha): string {
  if (ficha.trimestre?.trim()) {
    const t = ficha.trimestre.trim();
    return t.startsWith('T') ? `T${t.substring(1)}` : t;
  }
  const [year, month] = ficha.fechaInicio.split('-').map(Number);
  if (!year || !month) return 'T?';
  return `T${Math.ceil(month / 3)} ${year}`;
}

function programaDescripcion(nombre: string): string {
  const n = nombre.toUpperCase().trim();
  if (n === 'AA') return 'Análisis Administrativo';
  if (n === 'ADSO') return 'Análisis y Desarrollo de Software';
  if (n === 'CGSIG') return 'Gestión y Seguridad de la Información';
  return 'Formación Académica';
}

export function FichaCard({
  ficha,
  onClick,
  onEdit,
  onArchive,
  onDelete,
  onFinalize,
  onReopen,
  isArchived = false,
}: FichaCardProps) {
  const isFinalizada = ficha.finalizada;
  const { formato } = useFormatoHora();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    if (!menuAbierto) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuAbierto]);

  // Cálculo de progreso de clases
  const total = ficha.totalClases || 1;
  const restantes = ficha.clasesRestantes ?? ficha.totalClases;
  const realizadas = Math.max(0, total - restantes);
  const porcentaje = Math.min(100, Math.max(0, Math.round((realizadas / total) * 100)));

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group relative flex flex-col justify-between rounded-xl bg-white p-3.5 shadow-2xs transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:bg-black dark:border-white/15 dark:hover:border-white/30 border border-slate-200/90 border-l-4 ${
        isArchived
          ? 'border-l-slate-400'
          : isFinalizada
          ? 'border-l-emerald-600'
          : 'border-l-emerald-500'
      } cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}
    >
      <div>
        {/* Cabecera Compacta en 1 sola fila */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300 shrink-0">
              #{ficha.codigo}
            </span>
            {/* El acrónimo nunca se corta (shrink-0) */}
            <h3 className="shrink-0 font-bold text-sm text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400 transition-colors">
              {ficha.nombre}
            </h3>
            {/* Solo la descripción secundaria aplica truncate si falta espacio */}
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate min-w-0 hidden sm:inline">
              · {programaDescripcion(ficha.nombre)}
            </span>
            {(isArchived || isFinalizada) && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${
                  isArchived
                    ? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                }`}
              >
                {isArchived ? 'Archivada' : 'Finalizada'}
              </span>
            )}
          </div>

          {/* Menú contextual de tres puntos (···) */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuAbierto((prev) => !prev);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white focus:outline-none"
              aria-label="Opciones de la ficha"
              title="Opciones"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {menuAbierto && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-black"
              >
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(false);
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10 text-left font-medium"
                  >
                    <span>Editar ficha</span>
                  </button>
                )}

                {!isArchived && !isFinalizada && onFinalize && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(false);
                      onFinalize();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-emerald-700 hover:bg-slate-50 dark:text-emerald-400 dark:hover:bg-white/10 text-left font-medium"
                  >
                    <span>Finalizar ficha</span>
                  </button>
                )}

                {isFinalizada && !isArchived && onReopen && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(false);
                      onReopen();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-blue-700 hover:bg-slate-50 dark:text-blue-400 dark:hover:bg-white/10 text-left font-medium"
                  >
                    <span>Reabrir ficha</span>
                  </button>
                )}

                {onArchive && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(false);
                      onArchive();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10 text-left font-medium"
                  >
                    <span>{isArchived ? 'Desarchivar' : 'Archivar'}</span>
                  </button>
                )}

                {onDelete && !ficha.finalizada && !isArchived && (
                  <>
                    <div className="my-1 border-t border-slate-100 dark:border-white/10" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAbierto(false);
                        onDelete();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 text-left font-semibold"
                    >
                      <span>Eliminar ficha</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cuerpo Condensado en 2 filas */}
        {/* Fila 1: Horario · Aprendices · Trimestre */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {horarioResumenTexto(ficha, formato)}
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span>{ficha.numeroEstudiantes ?? 0} estudiantes</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-slate-500 dark:text-slate-400">{trimestreTexto(ficha)}</span>
        </div>

        {/* Fila 2: Barra de progreso lineal delgada con progreso */}
        <div className="mt-2.5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <span className="font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
            {realizadas}/{total} sesiones · {porcentaje}%
          </span>
        </div>
      </div>

      {/* Pie integrado con botón Gestionar → */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          {restantes} clases restantes
        </span>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition-all hover:bg-[#0B192C] hover:text-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-emerald-600 dark:hover:text-white"
        >
          <span>{isArchived ? 'Consultar' : 'Gestionar'}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
