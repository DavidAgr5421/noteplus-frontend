import { useEffect, useRef, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNotificaciones } from '@/features/notificaciones/hooks/useNotificaciones';
import type { Notificacion, NotificacionTipo } from '@/features/notificaciones/types';
import { classNames } from '@/shared/utils/helpers';
import logoNavbarLight from '@/assets/logo_noteplus_navbar_light.png';

const NAV_LINKS: { to: string; label: string; end?: boolean }[] = [
  { to: '/fichas', label: 'Inicio', end: true },
  { to: '/calendario', label: 'Calendario' },
  { to: '/actividades', label: 'Actividades' },
  { to: '/asistencias', label: 'Asistencias' },
];

const LOGO_GLOW = 'drop-shadow(0 0 2px rgba(255,255,255,0.5))';

const TIPO_ICON: Record<NotificacionTipo, { bg: string; path: string }> = {
  clase_proxima: {
    bg: 'bg-green-600',
    path: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  actividad_por_expirar: {
    bg: 'bg-yellow-500',
    path: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
  ficha_culminada: {
    bg: 'bg-navy-900',
    path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

const STORAGE_KEY = 'notificaciones-archivadas';

/** Notificación de prueba (solo dev) para verificar diseño y descarte. Quitar cuando ya no se necesite. */
const NOTIFICACION_TEST: Notificacion = {
  id: 'test:verificacion',
  tipo: 'actividad_por_expirar',
  titulo: 'Notificación de prueba',
  mensaje: 'Sirve para verificar cómo se ve y cómo se comporta el botón de descarte (X).',
  link: '/fichas',
  fecha: null,
};

function leerArchivadas(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function Navbar() {
  const { user, logout, isLogoutPending } = useAuth();
  const { data } = useNotificaciones(!!user);
  const [archivadas, setArchivadas] = useState<string[]>(leerArchivadas);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const archivar = (id: string) => {
    setArchivadas((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* almacenamiento no disponible, se mantiene solo en memoria */
      }
      return next;
    });
  };

  const restaurar = () => {
    setArchivadas([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nada que limpiar */
    }
  };

  const notificaciones = [
    ...(import.meta.env.DEV ? [NOTIFICACION_TEST] : []),
    ...(data?.notificaciones ?? []),
  ].filter((n) => !archivadas.includes(n.id));

  useEffect(() => {
    if (!panelAbierto) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelAbierto(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelAbierto(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [panelAbierto]);

  return (
    <header className="sticky top-0 z-40 bg-navy-950 shadow-lg shadow-navy-950/40">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-6 md:h-16 md:flex-nowrap md:gap-x-5 md:py-0 lg:px-8">
        <NavLink to="/fichas" className="order-1 shrink-0" aria-label="NotePlus, ir al inicio">
          <img
            src={logoNavbarLight}
            alt="NotePlus"
            width={1373}
            height={237}
            className="h-7 w-auto transition-transform duration-200 hover:scale-105 md:h-9"
            style={{ filter: LOGO_GLOW }}
          />
        </NavLink>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-1 sm:gap-3 md:order-3 md:ml-0">
          <div className="relative" ref={panelRef}>
            <button
              type="button"
              onClick={() => setPanelAbierto((v) => !v)}
              aria-expanded={panelAbierto}
              aria-label={`Notificaciones${user ? ` de ${user.nombre}` : ''}${notificaciones.length > 0 ? `, ${notificaciones.length} sin leer` : ''}`}
              className="relative rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {notificaciones.length > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-navy-950" aria-hidden="true">
                  {notificaciones.length > 9 ? '9+' : notificaciones.length}
                </span>
              )}
            </button>

            {panelAbierto && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:w-96">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-bold text-gray-900">Notificaciones</p>
                  {notificaciones.length > 0 && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-700">
                      {notificaciones.length}
                    </span>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificaciones.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-gray-500">Sin notificaciones por ahora</p>
                      {archivadas.length > 0 && (
                        <button
                          type="button"
                          onClick={restaurar}
                          className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                        >
                          Mostrar archivadas ({archivadas.length})
                        </button>
                      )}
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {notificaciones.map((n) => {
                        const icon = TIPO_ICON[n.tipo];
                        return (
                          <li key={n.id} className="relative">
                            <Link
                              to={n.link}
                              onClick={() => setPanelAbierto(false)}
                              className="flex items-start gap-3 px-4 py-3 pr-10 transition-colors hover:bg-gray-50"
                            >
                              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${icon.bg}`} aria-hidden="true">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
                                </svg>
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-gray-900">{n.titulo}</span>
                                <span className="mt-0.5 block text-sm text-gray-600">{n.mensaje}</span>
                              </span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => archivar(n.id)}
                              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                              aria-label={`Descartar notificación: ${n.titulo}`}
                              title="Descartar notificación"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="mx-1 h-6 w-px bg-white/20" aria-hidden="true" />

          <button
            type="button"
            onClick={() => logout()}
            disabled={isLogoutPending}
            className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-white/10 hover:text-red-300 disabled:opacity-50"
          >
            Cerrar sesión
          </button>
        </div>

        <nav
          className="scrollbar-thin order-3 -mx-1 flex w-full min-w-0 items-center gap-1 overflow-x-auto px-1 pb-1 md:order-2 md:mx-0 md:w-auto md:flex-1 md:px-0 md:pb-0"
          aria-label="Navegación principal"
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                classNames(
                  'shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
