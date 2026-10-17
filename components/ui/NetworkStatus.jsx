'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

// A slim banner that appears the moment the browser loses its connection
// and disappears (with a brief "back online") when it returns. Runs on
// every page, so a dropped network is explained instead of silently
// failing.
export default function NetworkStatus() {
  const [state, setState] = useState('online'); // online | offline | back

  useEffect(() => {
    if (!navigator.onLine) setState('offline');
    let t;
    const off = () => { clearTimeout(t); setState('offline'); };
    const on = () => {
      setState('back');
      t = setTimeout(() => setState('online'), 3000);
    };
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    return () => {
      clearTimeout(t);
      window.removeEventListener('offline', off);
      window.removeEventListener('online', on);
    };
  }, []);

  if (state === 'online') return null;
  const down = state === 'offline';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[400] flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium text-white ${down ? 'bg-red-600' : 'bg-emerald-600'}`}
    >
      {down && <WifiOff className="h-4 w-4 flex-shrink-0" />}
      {down ? 'You’re offline — check your internet connection. Changes won’t save until it’s back.' : 'Back online.'}
    </div>
  );
}
