interface ComingSoonPageProps {
  title: string;
  description: string;
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-600 dark:text-navy-400">NotePlus</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="mt-3 text-gray-500 dark:text-slate-400">{description}</p>
      <p className="mt-8 inline-block rounded-full border border-dashed border-gray-300 dark:border-white/20 px-5 py-2 text-sm font-medium text-gray-500 dark:text-slate-400">
        Próximamente
      </p>
    </div>
  );
}
