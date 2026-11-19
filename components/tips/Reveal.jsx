'use client';

import { useEffect, useRef, useState } from 'react';

// Fades and slides a card up the first time it scrolls into view. Content is visible by default, so if
// scripts fail nothing is ever hidden. `delay` (ms) staggers neighbouring cards.
export default function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight) return undefined; // already on screen
    setHidden(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setHidden(false); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} data-hidden={hidden} style={{ transitionDelay: `${delay}ms` }} className={`tip-reveal ${className}`}>{children}</div>;
}
