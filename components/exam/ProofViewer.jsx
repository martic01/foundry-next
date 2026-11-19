'use client';

import { useEffect, useState } from 'react';
import { Camera, Loader2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { deleteProofItems } from '../../app/exam-actions';
import { useDialog } from '../ui/DialogProvider';
import { fmtWat } from '../../lib/exam/time';

// Admin: the camera pictures and microphone clips captured during one attempt.
export default function ProofViewer({ attemptId }) {
  const { confirm } = useDialog();
  const [state, setState] = useState({ open: false, loading: false, items: null, err: '' });
  const [sel, setSel] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null); // index of the picture open in the viewer (inside the site, not a new tab)
  const photos = (state.items || []).filter((x) => x.kind === 'photo');
  useEffect(() => {
    if (view === null) return undefined;
    const key = (e) => {
      if (e.key === 'Escape') setView(null);
      if (e.key === 'ArrowRight') setView((v) => Math.min(photos.length - 1, v + 1));
      if (e.key === 'ArrowLeft') setView((v) => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [view, photos.length]);
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  async function removeSelected() {
    const ok = await confirm({ title: `Delete ${sel.size} selected item${sel.size === 1 ? '' : 's'}?`, message: 'The pictures or recordings are removed for good.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    setBusy(true);
    const r = await deleteProofItems([...sel]);
    setBusy(false);
    if (r?.error) { setState((s) => ({ ...s, err: r.error })); return; }
    setState((s) => ({ ...s, err: '', items: s.items.filter((x) => !sel.has(x.id)) }));
    setSel(new Set());
  }
  async function toggle() {
    if (state.open) { setState((s) => ({ ...s, open: false })); return; }
    setState((s) => ({ ...s, open: true, loading: !s.items, err: '' }));
    if (state.items) return;
    try {
      const r = await fetch(`/api/exams/proof?attempt=${attemptId}`, { cache: 'no-store' });
      const j = await r.json();
      setState({ open: true, loading: false, items: j.items || [], err: r.ok ? '' : j.error || 'Could not load.' });
    } catch { setState({ open: true, loading: false, items: [], err: 'Could not load.' }); }
  }
  return (
    <div className="mt-2">
      <button type="button" onClick={toggle} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
        <Camera className="h-3.5 w-3.5" /> {state.open ? 'Hide' : 'View'} camera / microphone captures
      </button>
      {state.open && (
        <div className="mt-2 rounded-lg border border-line p-3">
          {state.loading && <Loader2 className="h-4 w-4 animate-spin text-inkdim" />}
          {state.err && <p className="text-xs text-red-600">{state.err}</p>}
          {state.items && !state.items.length && !state.err && <p className="text-xs text-inkdim">Nothing was captured for this attempt (or it was deleted after 30 days).</p>}
          {!!state.items?.length && (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <button type="button" onClick={() => setSel(sel.size === state.items.length ? new Set() : new Set(state.items.map((x) => x.id)))} className="rounded border border-line px-2 py-1 text-inkdim hover:text-ink">{sel.size === state.items.length ? 'Clear selection' : 'Select all'}</button>
                <button type="button" disabled={!sel.size || busy} onClick={removeSelected} className="inline-flex items-center gap-1 rounded border border-red-500/50 px-2 py-1 font-medium text-red-600 disabled:opacity-40">{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete selected{sel.size ? ` (${sel.size})` : ''}</button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {state.items.filter((x) => x.kind === 'photo').map((x) => (
                  <div key={x.id} className={`relative rounded ${sel.has(x.id) ? 'ring-2 ring-brand' : ''}`}>
                    <input type="checkbox" checked={sel.has(x.id)} onChange={() => toggleSel(x.id)} aria-label={`Select picture at ${fmtWat(x.at)}`} className="absolute left-1 top-1 z-10 h-4 w-4 accent-brand" />
                    <button type="button" onClick={() => setView(photos.findIndex((p) => p.id === x.id))} className="block w-full text-left" aria-label={`Open picture taken at ${fmtWat(x.at)}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={x.url} alt={`Camera picture at ${fmtWat(x.at)}`} loading="lazy" className="aspect-[4/3] w-full rounded border border-line object-cover" />
                      <span className="block text-[10px] text-inkdim">{fmtWat(x.at)}</span>
                    </button>
                  </div>
                ))}
              </div>
              {state.items.some((x) => x.kind === 'audio') && (
                <ul className="mt-3 space-y-1.5">
                  {state.items.filter((x) => x.kind === 'audio').map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-2 text-[11px] text-inkdim"><input type="checkbox" checked={sel.has(x.id)} onChange={() => toggleSel(x.id)} aria-label={`Select recording at ${fmtWat(x.at)}`} className="h-4 w-4 accent-brand" /><span className="w-40">{fmtWat(x.at)}</span><audio controls preload="none" src={x.url} className="h-8" /></li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
      {view !== null && photos[view] && (
        <div className="fixed inset-0 z-[500] flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label="Camera picture" onClick={() => setView(null)}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-white" onClick={(e) => e.stopPropagation()}>
            <span>Picture {view + 1} of {photos.length} · {fmtWat(photos[view].at)} (Lagos time)</span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => setSel(new Set([photos[view].id]))} className="rounded border border-white/30 px-2 py-1 text-xs hover:bg-white/10">Select this picture</button>
              <button type="button" onClick={() => setView(null)} aria-label="Close" className="rounded p-1.5 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </span>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-12" onClick={(e) => e.stopPropagation()}>
            <button type="button" disabled={view === 0} onClick={() => setView(view - 1)} aria-label="Previous picture" className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30"><ChevronLeft className="h-6 w-6" /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[view].url} alt={`Camera picture at ${fmtWat(photos[view].at)}`} className="max-h-full max-w-full rounded object-contain" />
            <button type="button" disabled={view === photos.length - 1} onClick={() => setView(view + 1)} aria-label="Next picture" className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30"><ChevronRight className="h-6 w-6" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
