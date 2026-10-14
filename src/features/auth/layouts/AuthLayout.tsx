import { Outlet } from 'react-router-dom';
import { classNames } from '../../../shared/utils/helpers';
import { useModoOscuro } from '../../../shared/hooks/useModoOscuro';
import logoNoteplusLogin from '../../../assets/logo_noteplus_login.png';
import logoNoteplusLight from '../../../assets/logo_noteplus_navbar_light.png';
import { ShowcasePanel } from '../components/ShowcasePanel';

function SharpRule({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 6"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={classNames('h-1.5 w-full text-navy-900 dark:text-slate-500', className)}
    >
      <path d="M0 3 L52 0 H248 L300 3 L248 6 H52 Z" fill="currentColor" />
    </svg>
  );
}

export function AuthLayout() {
  const { oscuro } = useModoOscuro();
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-slate-950 lg:flex-row">
      <section className="flex min-h-screen w-full flex-col items-center justify-center gap-10 px-6 py-12 sm:px-10 lg:w-2/5">
        <div className="flex w-full max-w-sm flex-col items-center gap-5">
          <SharpRule />
          <img
            src={oscuro ? logoNoteplusLight : logoNoteplusLogin}
            alt="NotePlus"
            className="h-auto w-full max-w-[20rem]"
            width={oscuro ? 1373 : 1977}
            height={oscuro ? 237 : 524}
          />
          <SharpRule />
        </div>

        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </section>

      <ShowcasePanel />
    </div>
  );
}
