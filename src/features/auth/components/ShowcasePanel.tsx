import { useEffect, useState } from 'react';
import { classNames } from '../../../shared/utils/helpers';
import { showcaseSlides, type SlideCategory } from './showcaseSlides';

const SLIDE_MS = 6000;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* --- MICRO-UI PREVIEWS EN CÓDIGO VECTORIAL --- */

function MockupFichas() {
  return (
    <div className="space-y-3">
      {/* Tarjeta de Ficha Principal */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/90 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">ADSO (3303306)</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ACTIVA
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">Análisis y Desarrollo de Software</p>
          </div>
          <span className="text-xs font-semibold text-emerald-400 font-mono">68%</span>
        </div>

        {/* Barra de Progreso */}
        <div className="mt-3.5 space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }} />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Ruta lectiva</span>
            <span>22 de 32 semanas</span>
          </div>
        </div>

        {/* Micro-datos */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <strong>32</strong> Aprendices
          </span>
          <span>·</span>
          <span><strong>14</strong> Sesiones</span>
          <span>·</span>
          <span className="text-slate-400">Aula 402</span>
        </div>
      </div>

      {/* Tarjeta Secundaria en perspectiva sutil */}
      <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 opacity-60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">AA (3303305)</span>
          <span className="text-slate-500">· Análisis Administrativo</span>
        </div>
        <span className="font-mono text-emerald-400">92% Avance</span>
      </div>
    </div>
  );
}

function MockupAsistencias() {
  return (
    <div className="space-y-3">
      {/* Cabecera de Clase */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div>
          <span className="text-xs font-semibold text-white">Sesión #14 · Programación Web</span>
          <p className="text-[11px] text-slate-400">Lunes, 26 de Octubre · 07:00 a 11:00</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
          PRESENCIAL
        </span>
      </div>

      {/* Lista de Aprendices con Toggle */}
      <div className="space-y-2">
        {[
          { nombre: 'Carlos Mendoza', doc: 'CC 1.094.821.340', estado: 'ASISTIÓ', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
          { nombre: 'Andrea Gómez', doc: 'CC 1.018.394.112', estado: 'ASISTIÓ', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
          { nombre: 'Mateo Castro', doc: 'CC 1.020.912.845', estado: 'JUSTIFICADA', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
        ].map((item) => (
          <div key={item.nombre} className="flex items-center justify-between rounded-lg bg-slate-800/70 p-2.5 border border-slate-700/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-200">
                {item.nombre.split(' ').map(n => n[0]).join('')}
              </span>
              <div className="truncate">
                <p className="truncate text-xs font-medium text-white">{item.nombre}</p>
                <p className="text-[10px] text-slate-400 font-mono">{item.doc}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${item.badge}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {item.estado}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 font-mono">
        <span>Asistencia acumulada: <strong className="text-emerald-400">96.0%</strong></span>
        <span>24 / 25 presentes</span>
      </div>
    </div>
  );
}

function MockupCalificaciones() {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-800/90 overflow-hidden shadow-sm">
      {/* Cabecera institucional Azul Marino + Verde */}
      <div className="bg-[#0B192C] px-3.5 py-2.5 border-b border-[#172a45] flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-400">
        <span>Aprendiz</span>
        <div className="flex items-center gap-4">
          <span>Taller (30%)</span>
          <span>Proy. (40%)</span>
          <span>Final</span>
          <span>Estado</span>
        </div>
      </div>

      {/* Filas */}
      <div className="divide-y divide-slate-700/50 text-xs">
        {[
          { nombre: 'Valentina Silva', n1: '4.8', n2: '4.6', final: '4.7', estado: 'Aprobado' },
          { nombre: 'Julián Restrepo', n1: '3.8', n2: '4.2', final: '4.0', estado: 'Aprobado' },
          { nombre: 'Mariana Torres', n1: '4.5', n2: '4.9', final: '4.8', estado: 'Aprobado' },
        ].map((row) => (
          <div key={row.nombre} className="px-3.5 py-2 flex items-center justify-between text-slate-200">
            <span className="truncate font-medium text-xs text-white max-w-[120px]">{row.nombre}</span>
            <div className="flex items-center gap-5 font-mono text-[11px] tabular-nums">
              <span className="text-slate-300">{row.n1}</span>
              <span className="text-slate-300">{row.n2}</span>
              <strong className="text-white font-bold">{row.final}</strong>
              <span className="inline-flex rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                {row.estado}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/90 px-3.5 py-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          100% ponderación completa
        </span>
        <span className="font-mono">Promedio: 4.5</span>
      </div>
    </div>
  );
}

function MockupCalendario() {
  return (
    <div className="space-y-3">
      {/* Controles de vista */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-semibold text-white">Semana 42 · Octubre 2026</span>
        <div className="flex rounded-md bg-slate-800 p-0.5 text-[10px] font-medium text-slate-400">
          <span className="rounded bg-[#0B192C] text-emerald-400 px-2 py-0.5">Semana</span>
          <span className="px-2 py-0.5">Mes</span>
        </div>
      </div>

      {/* Columnas de Días */}
      <div className="grid grid-cols-3 gap-2">
        {/* Lunes */}
        <div className="rounded-lg bg-slate-800/80 border border-slate-700/60 p-2 space-y-1.5">
          <div className="text-[10px] font-bold uppercase text-slate-400">LUN 26</div>
          <div className="rounded bg-emerald-950/40 border-l-2 border-emerald-500 p-1.5 text-[10px]">
            <p className="font-semibold text-white truncate">ADSO (3303306)</p>
            <p className="text-emerald-400 font-mono text-[9px]">07:00 - 11:00</p>
            <span className="text-[9px] text-slate-400 block truncate">Lab. Cómputo 3</span>
          </div>
        </div>

        {/* Martes */}
        <div className="rounded-lg bg-slate-800/80 border border-slate-700/60 p-2 space-y-1.5">
          <div className="text-[10px] font-bold uppercase text-slate-400">MAR 27</div>
          <div className="rounded bg-navy-950/40 border-l-2 border-blue-400 p-1.5 text-[10px]">
            <p className="font-semibold text-white truncate">AA (3303305)</p>
            <p className="text-blue-300 font-mono text-[9px]">13:00 - 17:00</p>
            <span className="text-[9px] text-slate-400 block truncate">Aula 204</span>
          </div>
        </div>

        {/* Miércoles */}
        <div className="rounded-lg bg-slate-800/80 border border-slate-700/60 p-2 space-y-1.5">
          <div className="text-[10px] font-bold uppercase text-slate-400">MIÉ 28</div>
          <div className="rounded bg-emerald-950/40 border-l-2 border-emerald-500 p-1.5 text-[10px]">
            <p className="font-semibold text-white truncate">ADSO (3303306)</p>
            <p className="text-emerald-400 font-mono text-[9px]">07:00 - 11:00</p>
            <span className="text-[9px] text-slate-400 block truncate">Lab. Cómputo 3</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-[11px]">0 conflictos de horario en la semana</span>
      </div>
    </div>
  );
}

function MockupEstudiantes() {
  return (
    <div className="space-y-3">
      {/* Barra de búsqueda */}
      <div className="flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-slate-400">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <span className="text-[11px] text-slate-500">Buscar aprendiz por nombre o documento...</span>
      </div>

      {/* Expedientes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-slate-800/80 p-2.5 border border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#a16074]/30 text-[#e2a8b8] text-xs font-bold font-mono">
              DM
            </span>
            <div>
              <p className="text-xs font-semibold text-white">Diego Morales</p>
              <p className="text-[10px] text-slate-400 font-mono">CC 1.094.821.340</p>
            </div>
          </div>
          <span className="rounded-md bg-[#a16074]/20 border border-[#a16074]/40 px-2 py-0.5 text-[10px] font-bold text-[#e2a8b8]">
            3 Fallas · Alerta
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-800/80 p-2.5 border border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
              MT
            </span>
            <div>
              <p className="text-xs font-semibold text-white">Mariana Torres</p>
              <p className="text-[10px] text-slate-400 font-mono">CC 1.020.394.112</p>
            </div>
          </div>
          <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            Al día · 0 fallas
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
        <span>Total: 32 aprendices registrados</span>
        <span className="text-emerald-400 font-medium">Expediente completo</span>
      </div>
    </div>
  );
}

function MockupReportes() {
  return (
    <div className="space-y-3">
      {/* Métricas destacadas */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-800/90 border border-slate-700/60 p-2">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Fichas</p>
          <p className="text-base font-bold text-white font-mono mt-0.5">3</p>
        </div>
        <div className="rounded-lg bg-slate-800/90 border border-slate-700/60 p-2">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Aprobados</p>
          <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">94%</p>
        </div>
        <div className="rounded-lg bg-slate-800/90 border border-slate-700/60 p-2">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Promedio</p>
          <p className="text-base font-bold text-white font-mono mt-0.5">4.3</p>
        </div>
      </div>

      {/* Tarjeta de descarga de Planilla */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/80 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Planilla_Calificaciones_ADSO.xlsx</p>
            <p className="text-[10px] text-slate-400 font-mono">Formato Excel oficial con fórmulas</p>
          </div>
        </div>
        <span className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs">
          Exportar
        </span>
      </div>

      <p className="text-[11px] text-slate-400 text-center">
        Compatible con los estándares institucionales de formación
      </p>
    </div>
  );
}

function renderMockupPreview(category: SlideCategory) {
  switch (category) {
    case 'fichas':
      return <MockupFichas />;
    case 'asistencias':
      return <MockupAsistencias />;
    case 'calificaciones':
      return <MockupCalificaciones />;
    case 'calendario':
      return <MockupCalendario />;
    case 'estudiantes':
      return <MockupEstudiantes />;
    case 'reportes':
      return <MockupReportes />;
    default:
      return <MockupFichas />;
  }
}

export interface ShowcasePanelProps {
  className?: string;
}

export function ShowcasePanel({ className }: ShowcasePanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % showcaseSlides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const currentSlide = showcaseSlides[activeIndex];

  return (
    <section
      className={classNames(
        'relative flex min-h-[38rem] w-full flex-col justify-between overflow-hidden bg-[#071322] px-6 py-10 sm:px-12 lg:min-h-screen lg:px-14 lg:py-14 text-white',
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Iluminación de fondo sutil con acento esmeralda */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-[#0B192C] blur-3xl"
        aria-hidden="true"
      />

      {/* Contenido Superior: Badge & Título de Valor */}
      <div className="relative z-10 max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-xs font-mono text-emerald-400 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>NotePlus v2.0 · {currentSlide.badge}</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl leading-tight">
          {currentSlide.title}
        </h2>
        <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-slate-300 max-w-lg">
          {currentSlide.text}
        </p>
      </div>

      {/* Ventana de Producto / Mockup Visual SaaS */}
      <div className="relative z-10 my-8 sm:my-10 w-full max-w-xl">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/90 backdrop-blur-md shadow-2xl p-4 sm:p-5">
          {/* Barra superior de ventana Mac-style */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
              <span className="ml-2 font-mono text-[11px] text-slate-400">
                noteplus.app/{currentSlide.category}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400/90 font-medium">Sincronizado</span>
            </div>
          </div>

          {/* Micro-UI Dinámica */}
          {renderMockupPreview(currentSlide.category)}
        </div>
      </div>

      {/* Controles del Carrusel (Barras Delgadas Minimalistas) */}
      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          {showcaseSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ir a la diapositiva ${index + 1}: ${slide.title}`}
              aria-current={index === activeIndex}
              className={classNames(
                'h-1.5 rounded-full transition-all duration-300',
                index === activeIndex ? 'w-8 bg-emerald-500' : 'w-4 bg-slate-700 hover:bg-slate-600'
              )}
            />
          ))}
        </div>
        <span className="text-xs font-mono text-slate-400 tabular-nums">
          {activeIndex + 1} / {showcaseSlides.length}
        </span>
      </div>
    </section>
  );
}
