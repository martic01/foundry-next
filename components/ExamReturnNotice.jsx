'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Clock } from 'lucide-react';

// If a student leaves the site during an exam and comes back to some other page (or an old, stuck copy),
// this pop-up tells them to go to the dashboard and refresh, because the timer keeps running.
// The exam page keeps a small note on this device ('foundry-exam-live') while an exam is open.
export const EXAM_LIVE_KEY = 'foundry-exam-live';

export function markExamLive(attemptId, expiresAt) { try { localStorage.setItem(EXAM_LIVE_KEY, JSON.stringify({ id: attemptId, expiresAt, at: Date.now() })); } catch { /* ignore */ } }
export function clearExamLive() { try { localStorage.removeItem(EXAM_LIVE_KEY); } catch { /* ignore */ } }

export default function ExamReturnNotice() {
  const path = usePathname() || '';
  const [live, setLive] = useState(null);

  useEffect(() => {
    const read = () => {
      try {
        const v = JSON.parse(localStorage.getItem(EXAM_LIVE_KEY) || 'null');
        setLive(v && v.expiresAt > Date.now() ? v : null);
        if (v && v.expiresAt <= Date.now()) localStorage.removeItem(EXAM_LIVE_KEY);
      } catch { setLive(null); }
    };
    read();
    const vis = () => { if (document.visibilityState === 'visible') read(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pageshow', read);
    window.addEventListener('storage', read);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('pageshow', read); window.removeEventListener('storage', read); };
  }, [path]);

  if (!live || path.startsWith('/dashboard/exam')) return null;
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 p-4">
      <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 text-center shadow-xl">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600"><Clock className="h-6 w-6" /></span>
        <h2 className="mb-2 text-lg font-bold text-ink">Your exam is still running</h2>
        <p className="mb-2 text-sm text-ink">Go to your dashboard and refresh the page to continue your exam.</p>
        <p className="mb-4 text-sm font-semibold text-red-600">The timer has not stopped. Time is running out.</p>
        <a href="/dashboard/exam" className="cta-btn w-full justify-center">Continue my exam</a>
        <button type="button" onClick={() => { window.location.href = '/dashboard'; }} className="mt-2 text-xs text-inkdim underline">Go to my dashboard</button>
      </div>
    </div>
  );
}
