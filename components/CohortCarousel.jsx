'use client';

import { useEffect, useRef, useState } from 'react';
import AutoPanImage from './AutoPanImage';

const SLIDES = [
  { src: '/images/cohort/hero.webp', alt: 'State AI Training — Learn. Build. Ship. Build with AI, ship real software.' },
  { src: '/images/cohort/stage1.webp', alt: 'Stage 1: HTML, CSS, JavaScript plus AI — master the foundation, with Git and GitHub included.' },
  { src: '/images/cohort/stage2.webp', alt: 'Stage 2: React plus AI — build modern, production-ready apps, with Tailwind CSS, React Router and Git and GitHub.' }
];

export default function CohortCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || paused) return undefined;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  function goTo(i) {
    clearInterval(timerRef.current);
    setIndex(i);
  }

  return (
    <div
      className="card relative w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-80 w-full sm:h-96">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-500 ${i === index ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <AutoPanImage src={slide.src} alt={slide.alt} frameClassName="h-full w-full" />
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-2 w-2 rounded-full transition ${i === index ? 'bg-brand' : 'bg-ink/15'}`}
          />
        ))}
      </div>
    </div>
  );
}
