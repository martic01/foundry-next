'use client';

import { useRef, useState } from 'react';
import { Download, Lock, Loader2, ShieldCheck } from 'lucide-react';
import CertificateArt from './CertificateArt';

// Turns the on-screen SVG into a PNG in the browser (no libraries, no
// server round trip) and saves it.
async function downloadPng(svgEl, filename) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('render'));
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 3072;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('encode');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// `data` null  => LOCKED: the empty template, no download.
// `data` given => unlocked, filled in, downloadable.
export default function CertificateViewer({ data = null }) {
  const svgRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = !data;

  async function handleDownload() {
    if (locked || !svgRef.current) return;
    setBusy(true);
    setError('');
    try {
      await downloadPng(svgRef.current, `Foundry-Certificate-${data.code}.png`);
    } catch {
      setError('We couldn’t create the image on this browser. Try again, or use a different browser such as Chrome.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-line shadow-sm">
        <CertificateArt ref={svgRef} data={data} className={`block h-auto w-full ${locked ? 'opacity-60 saturate-50' : ''}`} />
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-brand ring-1 ring-brand/60">
              <Lock className="h-6 w-6" />
            </span>
            <p className="rounded-full bg-black/70 px-4 py-1.5 text-sm font-semibold text-white">Locked</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {locked ? (
          <button disabled className="cta-btn !px-5 !py-2.5 text-sm opacity-50" title="Unlocks when the admin awards your certificate">
            <Lock className="h-4 w-4" /> Download unavailable
          </button>
        ) : (
          <>
            <button onClick={handleDownload} disabled={busy} className="cta-btn !px-5 !py-2.5 text-sm">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</> : <><Download className="h-4 w-4" /> Download certificate</>}
            </button>
            <p className="flex items-center gap-1.5 text-xs text-inkdim">
              <ShieldCheck className="h-4 w-4 text-brand" /> Anyone can check it with ID <span className="font-mono font-semibold text-ink">{data.codeFormatted}</span> using “Verify certificate” on the Foundry site.
            </p>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
