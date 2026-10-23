import { Link, useLocation } from 'react-router-dom';

interface FichaNavTabsProps {
  fichaId: string;
  activeTab: 'detalle' | 'actividades' | 'calificaciones' | 'asistencias' | 'estudiantes';
  fichaNombre?: string;
  fichaCodigo?: string;
  onTabClick?: (tab: 'detalle' | 'actividades' | 'calificaciones' | 'asistencias' | 'estudiantes') => void;
}

export function FichaNavTabs({
  fichaId,
  activeTab,
  fichaNombre,
  fichaCodigo,
  onTabClick,
}: FichaNavTabsProps) {
  const location = useLocation();

  const tabs = [
    {
      id: 'detalle' as const,
      label: 'Detalle',
      to: `/fichas/${fichaId}`,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'actividades' as const,
      label: 'Actividades',
      to: `/fichas/${fichaId}/actividades`,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: 'calificaciones' as const,
      label: 'Calificaciones',
      to: `/fichas/${fichaId}/actividades#calificaciones`,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
        </svg>
      ),
    },
    {
      id: 'asistencias' as const,
      label: 'Asistencias',
      to: `/fichas/${fichaId}/asistencias`,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM9.5 14.5l2 2 3.5-4" />
        </svg>
      ),
    },
    {
      id: 'estudiantes' as const,
      label: 'Estudiantes',
      to: `/fichas/${fichaId}/estudiantes`,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.87M15.5 3.13a3.5 3.5 0 010 6.74" />
        </svg>
      ),
    },
  ];

  return (
    <nav aria-label="Navegación de la ficha" className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Enlace rápido de volver */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link
            to="/fichas"
            className="inline-flex items-center gap-1 hover:text-navy-900 dark:hover:text-emerald-300 transition-colors"
            title="Volver a la lista de fichas"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Mis Fichas
          </Link>
          {activeTab !== 'detalle' && (
            <>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <Link
                to={`/fichas/${fichaId}`}
                className="inline-flex items-center gap-1 hover:text-navy-900 dark:hover:text-emerald-300 transition-colors text-slate-600 dark:text-slate-300"
                title="Volver al detalle de esta ficha"
              >
                {fichaNombre || 'Detalles'}
                {fichaCodigo && <span className="text-slate-400 dark:text-slate-500">({fichaCodigo})</span>}
              </Link>
            </>
          )}
        </div>

        {/* Pestañas de navegación tipo pills */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-full border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-1 shadow-xs max-w-full">
          {tabs.map((tab) => {
            const isCurrent = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={tab.to}
                onClick={() => {
                  if (onTabClick) {
                    onTabClick(tab.id);
                  }
                  // Si estamos en actividades y clicamos calificaciones o viceversa
                  if (location.pathname.includes('/actividades')) {
                    if (tab.id === 'calificaciones') {
                      document.getElementById('seccion-calificaciones')?.scrollIntoView({ behavior: 'smooth' });
                    } else if (tab.id === 'actividades') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                  isCurrent
                    ? 'bg-navy-900 text-emerald-400 shadow-xs dark:bg-black dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white'
                }`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
