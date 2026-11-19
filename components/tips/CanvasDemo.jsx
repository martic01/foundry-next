'use client';

import { useEffect, useRef, useState } from 'react';
import { RUNNERS } from './jsRunners';
import { reducedMotion, StageMessage } from './Stage';

// One <canvas>, one animation loop. The loop only runs while `active`; the canvas is capped at 2x pixel
// density so phones with huge screens do not do four times the work for nothing.
export default function CanvasDemo({ id, active }) {
  const box = useRef(null);
  const cv = useRef(null);
  const [err, setErr] = useState(false);
  const [tries, setTries] = useState(0);
  const live = useRef({ frame: null, size: null });

  // Build (and rebuild on resize) the animation.
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    let cancelled = false;
    const build = () => {
      try {
        const w = Math.max(120, Math.round(el.clientWidth)), h = Math.max(160, Math.round(el.clientHeight));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const c = cv.current, ctx = c.getContext('2d');
        c.width = w * dpr; c.height = h * dpr; c.style.width = `${w}px`; c.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        live.current = { frame: RUNNERS[id](ctx, w, h), size: [w, h] };
        if (reducedMotion()) { for (let i = 0; i < 40; i++) live.current.frame(i / 60, 1); } // a still picture only
      } catch (e) { console.error('[tips canvas]', e?.message); if (!cancelled) setErr(true); }
    };
    build();
    let t;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { clearTimeout(t); t = setTimeout(build, 150); }) : null;
    ro?.observe(el);
    return () => { cancelled = true; clearTimeout(t); ro?.disconnect(); };
  }, [id, tries]);

  // The loop.
  useEffect(() => {
    if (!active || err || reducedMotion()) return undefined;
    let raf, last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      try { live.current.frame?.(now / 1000, dt * 60); } catch (e) { console.error('[tips canvas]', e?.message); setErr(true); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, err, tries]);

  if (err) return <StageMessage onRetry={() => { setErr(false); setTries((n) => n + 1); }}>This animation could not start on your device.</StageMessage>;
  return <div ref={box} className="absolute inset-0"><canvas ref={cv} className="block" role="img" aria-label="Animation preview" /></div>;
}
