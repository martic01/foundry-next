'use client';

import { Component, useEffect, useRef, useState } from 'react';
import { Copy, Check, Play, Code2 } from 'lucide-react';

// Shared pieces for every live demo on the Tips page.
// - useInView: demos only run while they are on screen (saves battery, keeps the page fast).
// - DemoErrorBoundary: if ONE demo fails, only that card shows a small message; the rest of the page is fine.
// - DemoCard: preview and code side by side on wide screens, slide between them with two buttons on phones.

export function useInView(ref, margin = '120px') {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return seen;
}

export function useDesktop() {
  const [d, setD] = useState(true);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(min-width: 700px)');
    const f = () => setD(mq.matches);
    f();
    mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', f) : mq.removeListener(f); };
  }, []);
  return d;
}

export function usePageVisible() {
  const [v, setV] = useState(true);
  useEffect(() => {
    const f = () => setV(document.visibilityState !== 'hidden');
    f();
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);
  return v;
}

export function reducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function StageMessage({ children, onRetry }) {
  return (
    <div className="flex h-full min-h-[11rem] flex-col items-center justify-center gap-2 p-4 text-center text-sm text-white/70">
      <p>{children}</p>
      {onRetry && <button type="button" onClick={onRetry} className="rounded border border-white/30 px-3 py-1 text-xs text-white hover:bg-white/10">Try again</button>}
    </div>
  );
}

export class DemoErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error('[tips demo]', err?.message); }
  render() {
    if (this.state.failed) return <StageMessage onRetry={() => this.setState({ failed: false })}>This demo could not load on your device. The rest of the page still works.</StageMessage>;
    return this.props.children;
  }
}

export function CodeBox({ code, lang }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
  }
  return (
    <div className="relative h-full min-w-0 bg-[#0d0e12]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-wide text-white/60">
        <span>{lang}</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded px-2 py-0.5 hover:bg-white/10" aria-label="Copy code">
          {done ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </button>
      </div>
      <pre className="max-h-[22rem] overflow-auto p-3 text-[12px] leading-relaxed text-[#e6e6ea]" tabIndex={0}><code>{code}</code></pre>
    </div>
  );
}

// children: (active) => stage. `active` is true only while the demo is on screen AND visible to the person.
export function DemoCard({ title, text, code, lang = 'code', children }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  const pageOn = usePageVisible();
  const desktop = useDesktop();
  const [tab, setTab] = useState('preview');
  const active = inView && pageOn && (desktop || tab === 'preview');
  return (
    <article ref={ref} className="tip-lift overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="p-4 pb-3">
        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-inkdim">{text}</p>
      </div>
      <div className="flex gap-2 px-4 pb-3 desktop:hidden" role="tablist" aria-label="Show preview or code">
        <button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${tab === 'preview' ? 'border-ink bg-ink text-surface' : 'border-line text-inkdim'}`}><Play className="h-4 w-4" /> Preview</button>
        <button type="button" role="tab" aria-selected={tab === 'code'} onClick={() => setTab('code')} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${tab === 'code' ? 'border-ink bg-ink text-surface' : 'border-line text-inkdim'}`}><Code2 className="h-4 w-4" /> Code</button>
      </div>
      <div className="overflow-hidden">
        <div className={`flex w-[200%] items-start transition-transform duration-300 ease-out desktop:grid desktop:items-stretch desktop:w-full desktop:translate-x-0 desktop:grid-cols-2 ${tab === 'code' ? '-translate-x-1/2' : 'translate-x-0'}`}>
          <div className="w-1/2 min-w-0 desktop:w-auto" aria-hidden={!desktop && tab !== 'preview'}>
            <div className="tip-stage relative h-60 overflow-hidden desktop:h-full desktop:min-h-[16rem] bg-gradient-to-br from-[#14151a] to-[#23252e]">
              <DemoErrorBoundary>{inView ? children(active) : null}</DemoErrorBoundary>
            </div>
          </div>
          <div className="w-1/2 min-w-0 desktop:w-auto" aria-hidden={!desktop && tab !== 'code'}>
            <CodeBox code={code} lang={lang} />
          </div>
        </div>
      </div>
    </article>
  );
}
