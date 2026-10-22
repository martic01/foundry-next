'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, ChevronsDown } from 'lucide-react';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Is this browser able to show a tour? (canvas 2D + no reduced-motion request)
export function canTour() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const c = document.createElement('canvas');
    return !!(c.getContext && c.getContext('2d'));
  } catch {
    return false;
  }
}

// A scroll-driven walk through a 3D scene drawn on a canvas.
//   load()      -> Promise<{ build(), path, hands?, opens(p), handsAlpha(p) }>  (lazy: the models are big)
//   intro       -> the heading shown while the visitor is still outside
//   stages      -> [{ id, from, to, side, icon, title, text, href, extra }]
//   address     -> shown on the signs inside the scene
export default function SceneTour({ id, label, height = '520vh', load, intro, stages, address, links, theme = 'light', children }) {
  const [active, setActive] = useState(false);
  useEffect(() => { setActive(canTour()); }, []);
  if (!active) return children; // server render, reduced motion, no canvas: the plain section
  return <Tour id={id} label={label} height={height} load={load} intro={intro} stages={stages} address={address} links={links} theme={theme} />;
}

function Tour({ id, label, height, load, intro, stages, address, links, theme }) {
  const outerRef = useRef(null);
  const canvasRef = useRef(null);
  const [p, setP] = useState(0); // eased progress, drives the overlay
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const gold = '#e8c36a';

  useEffect(() => {
    const outer = outerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    let cancelled = false, scene = null, mod = null, hands = null, render = null, cameraAt = null;
    let target = 0, shown = 0, raf = 0, visible = false, w = 0, h = 0, lastP = -1, dirty = true, lastDraw = 0;

    const measure = () => {
      const r = outer.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      target = clamp(-r.top / span);
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = true;
    };
    const tick = (t) => {
      raf = 0;
      if (!visible) return;
      measure();
      const d = target - shown;
      if (Math.abs(d) > 0.0004) { shown += d * 0.14; dirty = true; } else shown = target;
      if (scene && scene.env.animated && t - lastDraw > 34) dirty = true; // lights and dance floor keep moving
      if (scene && dirty && w) {
        lastDraw = t;
        const cam = cameraAt(mod.path, shown);
        render(ctx, scene, w, h, { ...cam, opens: mod.opens(shown), time: t, address, hands, handsAlpha: hands ? mod.handsAlpha(shown) : 0, handsRise: mod.handsRise ? mod.handsRise(shown) : 0 });
        dirty = false;
        if (Math.abs(shown - lastP) > 0.002) { lastP = shown; setP(shown); }
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { dirty = true; start(); } }, { rootMargin: '100px' });
    io.observe(outer);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // load the scene and the (large) model data only once this section is wanted
    const begin = async () => {
      try {
        const [m, engine, handsJson] = await Promise.all([load(), import('../lib/room3d/engine'), import('../lib/models/hands.json')]);
        if (cancelled) return;
        mod = m; render = engine.render; cameraAt = engine.cameraAt; hands = handsJson.default || handsJson;
        scene = m.build();
        dirty = true; setReady(true); start();
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    const loader = new IntersectionObserver(([e]) => { if (e.isIntersecting) { loader.disconnect(); begin(); } }, { rootMargin: '600px' });
    loader.observe(outer);
    return () => { cancelled = true; cancelAnimationFrame(raf); io.disconnect(); loader.disconnect(); ro.disconnect(); };
  }, [load, address]);

  const skip = () => {
    const o = outerRef.current;
    if (o) window.scrollTo({ top: o.offsetTop + o.offsetHeight - window.innerHeight * 0.4, behavior: 'smooth' });
  };
  const opacityOf = (s) => {
    const fade = 0.04;
    return clamp(Math.min((p - s.from) / fade, (s.to - p) / fade));
  };
  const bg = theme === 'night' ? 'bg-[#120c24]' : 'bg-[#1d1f24]';

  return (
    <section id={id} aria-label={label} ref={outerRef} className="relative" style={{ height }}>
      <div className={`sticky top-0 h-screen w-full overflow-hidden ${bg}`}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
        {!ready && !failed && <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/80">Loading the 3D tour…</p>}
        {failed && <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/80">The 3D tour couldn&apos;t load. You can still message us below.</p>}

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-6 text-center" style={{ opacity: opacityOf({ from: -1, to: intro.to }), pointerEvents: p < intro.to - 0.04 ? 'auto' : 'none' }}>
          <div className="mb-3 flex flex-col items-center gap-1 text-xs font-semibold uppercase tracking-widest text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,.7)]">
            Scroll to step inside
            <ChevronsDown className="h-5 w-5 animate-bounce" />
          </div>
          <div className="max-w-2xl rounded-2xl bg-black/60 px-5 py-4 text-white shadow-2xl backdrop-blur-sm">
            <p className="eyebrow mb-2 !text-[#e8c36a]">{intro.eyebrow}</p>
            <h2 className="mb-2 font-display text-xl font-extrabold sm:text-3xl">{intro.title}</h2>
            {intro.body}
          </div>
        </div>

        {stages.map((s) => {
          const o = opacityOf(s);
          if (o <= 0.01) return null;
          const live = o > 0.6;
          const pos = s.side === 'left' ? 'sm:left-8 sm:right-auto' : 'sm:right-8 sm:left-auto';
          return (
            <div key={s.id} className={`absolute inset-x-4 bottom-6 sm:bottom-auto sm:top-1/2 sm:w-[22rem] sm:-translate-y-1/2 ${pos}`} style={{ opacity: o, transform: `translateY(${(1 - o) * 14}px)`, pointerEvents: live ? 'auto' : 'none' }}>
              <div className="rounded-2xl border border-white/15 bg-black/60 p-5 text-white shadow-2xl backdrop-blur-md">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#caa03a]/25 text-[#e8c36a]"><s.icon className="h-5 w-5" strokeWidth={2} /></span>
                  <h3 className="font-display text-lg font-extrabold">{s.title}</h3>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-white/85">{s.text}</p>
                <a href={links.ask[s.id]} target="_blank" rel="noopener noreferrer" tabIndex={live ? 0 : -1} className="cta-btn w-full justify-center">
                  <MessageCircle className="h-4 w-4" /> Make enquiry
                </a>
                {s.extra && <div className="mt-3 text-xs text-white/75">{s.extra}</div>}
              </div>
            </div>
          );
        })}

        <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex" aria-hidden="true">
          {stages.map((s) => (
            <span key={s.id} className={`h-2 w-2 rounded-full transition ${p >= s.from - 0.02 && p <= s.to ? 'scale-125' : 'bg-white/35'}`} style={p >= s.from - 0.02 && p <= s.to ? { background: gold } : undefined} />
          ))}
        </div>
        <button type="button" onClick={skip} className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/70">
          Skip tour
        </button>
      </div>
    </section>
  );
}
