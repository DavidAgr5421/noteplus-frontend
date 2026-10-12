import { useEffect, useState } from 'react';
import { classNames } from '../../../shared/utils/helpers';
import { showcaseSlides } from './showcaseSlides';

const SLIDE_MS = 5000;

const artworkBackgrounds = [
  'radial-gradient(circle at 25% 20%, rgba(20,96,156,0.55) 0, transparent 55%), radial-gradient(circle at 80% 85%, rgba(36,137,5,0.35) 0, transparent 50%)',
  'radial-gradient(circle at 75% 25%, rgba(36,137,5,0.4) 0, transparent 55%), radial-gradient(circle at 20% 80%, rgba(20,96,156,0.5) 0, transparent 50%)',
  'radial-gradient(circle at 50% 15%, rgba(79,143,196,0.45) 0, transparent 55%), radial-gradient(circle at 15% 90%, rgba(10,52,87,0.7) 0, transparent 55%)',
  'radial-gradient(circle at 30% 75%, rgba(36,137,5,0.35) 0, transparent 55%), radial-gradient(circle at 85% 20%, rgba(20,96,156,0.5) 0, transparent 50%)',
  'radial-gradient(circle at 60% 60%, rgba(20,96,156,0.55) 0, transparent 60%), radial-gradient(circle at 10% 20%, rgba(36,137,5,0.3) 0, transparent 50%)',
  'radial-gradient(circle at 20% 40%, rgba(10,52,87,0.8) 0, transparent 60%), radial-gradient(circle at 90% 70%, rgba(79,143,196,0.4) 0, transparent 55%)',
];

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function SlideArtwork({ index }: { index: number }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/25 bg-white/5">
      <div
        className="absolute inset-0 opacity-40"
        style={{ backgroundImage: artworkBackgrounds[index % artworkBackgrounds.length] }}
        aria-hidden="true"
      />
      <div className="relative z-10 px-6 text-center">
        <svg
          className="mx-auto h-10 w-10 text-white/60"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"
          />
        </svg>
        <p className="mt-3 text-sm font-medium text-white/85">Imagen {index + 1}</p>
        <p className="mt-1 text-xs text-white/50">Boceto · pendiente de recurso</p>
      </div>
    </div>
  );
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

  return (
    <section
      className={classNames(
        'relative flex min-h-[32rem] w-full flex-col overflow-hidden bg-navy-900 px-6 py-10 sm:px-10 lg:min-h-screen lg:w-3/5 lg:px-14 lg:py-14',
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {showcaseSlides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <article
              key={slide.title}
              className={classNames(
                'absolute inset-0 flex flex-col transition-opacity duration-700 ease-in-out',
                isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
              aria-hidden={!isActive}
            >
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-400">
                  NotePlus
                </p>
                <h2 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                  {slide.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">{slide.text}</p>
              </div>
              <div className="mt-6 min-h-0 flex-1 sm:mt-8">
                <SlideArtwork index={index} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-2 sm:mt-8">
        {showcaseSlides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Ir a la diapositiva ${index + 1}: ${slide.title}`}
            aria-current={index === activeIndex}
            className={classNames(
              'h-1.5 rounded-full transition-all duration-300',
              index === activeIndex ? 'w-8 bg-white' : 'w-4 bg-white/30 hover:bg-white/50'
            )}
          />
        ))}
        <span className="ml-auto text-xs tabular-nums text-white/50">
          {activeIndex + 1} / {showcaseSlides.length}
        </span>
      </div>
    </section>
  );
}
