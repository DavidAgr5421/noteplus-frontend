import { Outlet } from 'react-router-dom';
import { ShowcasePanel } from '../components/ShowcasePanel';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden bg-slate-50 dark:bg-black lg:flex-row">
      {/* Panel Izquierdo: Formulario de Autenticación (40-45%) */}
      <section className="flex min-h-screen lg:min-h-0 w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-[42%] xl:w-[38%] overflow-y-auto">
        <div className="mx-auto w-full max-w-sm sm:max-w-md">
          <Outlet />
        </div>
      </section>

      {/* Panel Derecho: Showcase Institucional (55-60%) */}
      <ShowcasePanel className="lg:w-[58%] xl:w-[62%]" />
    </div>
  );
}
