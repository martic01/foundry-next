'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

// Small floating "install the app" button for the home page. Chrome/Edge/Android
// fire `beforeinstallprompt` when the manifest qualifies; we keep that event and
// replay it on tap. iPhone Safari has no such event, so it gets a short tip.
export default function InstallAppButton() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(true); // hidden until we know
  const [ios, setIos] = useState(false);
  const [tip, setTip] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setInstalled(standalone);
    setIos(isIos);
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); setTip(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || (!deferred && !ios)) return null;

  async function click() {
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch { /* ignore */ }
      setDeferred(null);
    } else {
      setTip((t) => !t);
    }
  }

  return (
    <div className="fixed bottom-16 left-4 z-40 print:hidden">
      {tip && (
        <div role="dialog" className="mb-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-3 text-xs text-ink shadow-lg">
          <button type="button" onClick={() => setTip(false)} aria-label="Close" className="float-right -mr-1 -mt-1 p-1 text-inkdim"><X className="h-3.5 w-3.5" /></button>
          To install: tap the <strong>Share</strong> button in Safari, then <strong>Add to Home Screen</strong>.
        </div>
      )}
      <button
        type="button"
        onClick={click}
        aria-label="Install The Foundry app"
        title="Install app"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-2 ring-surface transition hover:scale-105 active:scale-95"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}
