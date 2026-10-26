'use client';

import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, X, ShieldCheck, ShieldX, Loader2, Search } from 'lucide-react';
import { formatCertDate, normalizeCode } from '../lib/certificates';

// Nav button + pop-up. Asks for a certificate id, checks it against the
// database through /api/certificates/verify, and shows who earned it.
export default function VerifyCertificate() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [state, setState] = useState({ status: 'idle' }); // idle | checking | valid | invalid | error
  const inputRef = useRef(null);

  // A link like /?verify=AB3K-9XQM-2TFW opens the pop-up pre-filled.
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get('verify');
      if (v) { setValue(v.slice(0, 20)); setOpen(true); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => inputRef.current?.focus(), 30);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  async function check(e) {
    e?.preventDefault();
    if (!normalizeCode(value)) return setState({ status: 'error', message: 'Enter the 12-character ID printed at the bottom of the certificate, like AB3K-9XQM-2TFW.' });
    setState({ status: 'checking' });
    try {
      const res = await fetch('/api/certificates/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: value }) });
      const data = await res.json().catch(() => ({}));
      if (data.valid) setState({ status: 'valid', ...data });
      else if (res.ok) setState({ status: 'invalid' });
      else setState({ status: 'error', message: data.error || 'We couldn’t check right now. Please try again.' });
    } catch {
      setState({ status: 'error', message: 'You seem to be offline. Check your connection and try again.' });
    }
  }

  const reset = () => { setState({ status: 'idle' }); setValue(''); setTimeout(() => inputRef.current?.focus(), 30); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-[0.35em] rounded-md p-2.5 text-inkdim hover:text-ink sm:p-0" title="Verify a certificate" aria-label="Verify a certificate">
        <BadgeCheck className="h-5 w-5 flex-shrink-0 sm:h-[1.25em] sm:w-[1.25em]" />
        <span className="hidden sm:inline">Verify certificate</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Verify a certificate">
          <div className="dialog-fade absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="dialog-pop relative w-full max-w-md whitespace-normal rounded-2xl border border-line bg-surface p-6 text-left text-base shadow-xl">
            <button onClick={() => setOpen(false)} aria-label="Close" className="absolute right-3 top-3 rounded-md p-1.5 text-inkdim hover:text-ink"><X className="h-4 w-4" /></button>

            {state.status === 'valid' ? (
              <div className="text-center">
                <span className="pop-check mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700"><ShieldCheck className="h-7 w-7" /></span>
                <p className="eyebrow mb-1">Verified certificate</p>
                <h2 className="font-display text-2xl font-extrabold text-ink">{state.name}</h2>
                <p className="mt-1 break-all text-sm text-inkdim">{state.email}</p>
                <p className="mt-4 text-sm leading-relaxed text-ink">
                  Successfully completed <span className="font-semibold text-brand">{state.course}</span> at The Foundry
                  {state.awardedAt ? <> and was awarded this certificate on <span className="font-semibold">{formatCertDate(state.awardedAt)}</span></> : null}.
                </p>
                <p className="mt-3 rounded-lg bg-brand-light/60 p-3 text-sm italic text-ink">
                  Congratulations, {String(state.name).split(' ')[0]}! This achievement is genuine, earned through dedication, practice and real projects.
                </p>
                <button onClick={reset} className="cta-btn-outline mt-5 !px-4 !py-2 text-xs">Check another certificate</button>
              </div>
            ) : (
              <form onSubmit={check}>
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand"><BadgeCheck className="h-6 w-6" /></span>
                <h2 className="font-display text-xl font-extrabold text-ink">Verify a certificate</h2>
                <p className="mt-1 text-sm text-inkdim">Enter the ID printed at the bottom corner of the certificate to confirm it is genuine.</p>
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => { setValue(e.target.value.toUpperCase().slice(0, 20)); if (state.status !== 'idle') setState({ status: 'idle' }); }}
                  placeholder="XXXX-XXXX-XXXX"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  className="field mt-4 text-center font-mono text-lg tracking-widest"
                  aria-label="Certificate ID"
                />
                {state.status === 'invalid' && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <ShieldX className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>No certificate matches this ID. Check it for typos. If it is right, the certificate was never issued or has been revoked.</span>
                  </p>
                )}
                {state.status === 'error' && <p className="mt-3 text-sm text-red-600">{state.message}</p>}
                <button type="submit" disabled={state.status === 'checking' || !value.trim()} className="cta-btn mt-4 w-full justify-center !py-2.5 text-sm">
                  {state.status === 'checking' ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : <><Search className="h-4 w-4" /> Verify</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
