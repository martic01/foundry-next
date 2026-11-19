'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

// Floating "refresh this page's data" button (bottom corner). Re-fetches the page without a full reload.
export default function RefreshFab() {
  const router = useRouter();
  const [busy, start] = useTransition();
  // Pages are not live by themselves: pick up changes the admin made (dates, access) every minute
  // while the tab is open, and the moment the person comes back to it.
  useEffect(() => {
    const go = () => { if (document.visibilityState === 'visible') router.refresh(); };
    const t = setInterval(go, 60000);
    document.addEventListener('visibilitychange', go);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', go); };
  }, [router]);
  return (
    <button type="button" onClick={() => start(() => router.refresh())} aria-label="Refresh" title="Refresh"
      className="fixed bottom-4 right-4 z-[240] flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-lg hover:bg-surfaceMuted">
      <RefreshCw className={`h-5 w-5 ${busy ? 'animate-spin' : ''}`} />
    </button>
  );
}
