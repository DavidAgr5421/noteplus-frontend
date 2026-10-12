import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle, CardContent, FormatoHoraToggle } from '@/shared/ui';
import { useFormatoHora } from '@/shared/hooks/useFormatoHora';
import { useCalendar, useTodayClass } from '../hooks/useAsistencias';
import { useFicha } from '@/features/fichas/hooks/useFichas';
import { ClaseCard, ClaseDetailModal } from '../components/AsistenciaComponents';
import { formatDate, claseHorarioLabel, isToday } from '@/shared/utils/helpers';
import type { Clase } from '../types';

interface CalendarPageProps {
  /** Si se indica, las tarjetas de esta ficha se ven normales y las demás opacas. */
  highlightFichaId?: string;
}

export function CalendarPage({ highlightFichaId }: CalendarPageProps = {}) {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedClase, setSelectedClase] = useState<Clase | null>(null);

  const from = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
  const to = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data: clases } = useCalendar(from, to);
  const { data: todayClass } = useTodayClass();
  const { data: highlightFicha } = useFicha(highlightFichaId || '');
  const { formato } = useFormatoHora();

  const isDimmed = (clase: Clase) => !!highlightFichaId && clase.fichaId !== highlightFichaId;

  const handleOpenDetalle = (clase: Clase) => {
    setSelectedClase(clase);
  };

  const handleMarcarAsistencias = (clase: Clase) => {
    setSelectedClase(null);
    navigate(`/clases/${clase.id}/asistencias`);
  };

  const monthName = currentMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  const daysInMonth = Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const calendarDays = [
    ...Array(firstDayOfMonth).fill(null),
    ...daysInMonth.map(day => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)),
  ];

  const clasesByDate = new Map<string, Clase[]>();
  clases?.forEach(clase => {
    const key = clase.fecha;
    if (!clasesByDate.has(key)) clasesByDate.set(key, []);
    clasesByDate.get(key)!.push(clase);
  });

  return (
    <div className="space-y-6">
      <div className="-mb-3">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            {highlightFichaId && (
              <Link to={`/fichas/${highlightFichaId}`} className="text-sm text-blue-600 hover:underline">
                ← Volver a la ficha
              </Link>
            )}
            <h2 className="text-3xl font-bold text-gray-900">
              {highlightFicha ? `Asistencias — ${highlightFicha.nombre}` : 'Calendario de Clases'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <FormatoHoraToggle />
            <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>Hoy</Button>
          </div>
        </div>
      </div>

      <Card variant="outlined">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl capitalize">{monthName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const dateStr = date ? date.toISOString().split('T')[0] : '';
              const dayClases = date ? clasesByDate.get(dateStr) || [] : [];
              const today = isToday(dateStr);
              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border rounded-lg ${today ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200'}`}
                >
                  {date && (
                    <>
                      <div className={`text-sm font-medium ${today ? 'text-blue-600' : 'text-gray-900'}`}>
                        {date.getDate()}
                      </div>
                      <div className="mt-1 space-y-1">
                        {dayClases.map((clase) => (
                          <ClaseCard
                            key={clase.id}
                            clase={clase}
                            isToday={today}
                            dimmed={isDimmed(clase)}
                            onClick={() => handleOpenDetalle(clase)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {todayClass && (
        <Card variant="outlined" className={`border-blue-300 bg-blue-50 ${isDimmed(todayClass) ? 'opacity-40 saturate-50' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">HOY</span>
              Clase de hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{todayClass.ficha?.nombre}</p>
                <p className="text-sm text-gray-500">{formatDate(todayClass.fecha, 'long')} · {claseHorarioLabel(todayClass, formato)}</p>
              </div>
              <Button onClick={() => todayClass && handleOpenDetalle(todayClass)}>
                Tomar asistencia
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ClaseDetailModal
        isOpen={!!selectedClase}
        onClose={() => setSelectedClase(null)}
        clase={selectedClase}
        onMarcarAsistencias={handleMarcarAsistencias}
      />
    </div>
  );
}