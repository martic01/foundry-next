'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Megaphone, Video, Link2, NotebookText, X, CheckCircle2, Flag, Award, ClipboardCheck, Bell } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { getRescheduleInfo, decideReschedule } from '../../app/exam-actions';
import { fmtWat, isoToWatLocal } from '../../lib/exam/time';

// Auto-dismiss: toasts clear after ~8s (paused on hover).
// Two kinds of alert, both stored per student in `notifications`:
//   announcement -> a blocking pop-up. It stays on screen until the
//                   student taps "I'm ready" (no Esc / backdrop close).
//                   Several at once are shown one after another.
//   video | link | notes -> a toast with a "View" link; dismiss to clear.
// New rows arrive over Realtime, with a 20s poll as the fallback for
// when Realtime isn't enabled. Marking one read is a single update of
// read_at (the only column a student is allowed to change).
const ICONS = { video: Video, link: Link2, notes: NotebookText, announcement: Megaphone, report: Flag, certificate: Award, exam: ClipboardCheck, update: Bell };
const TOAST_MS = 8000; // toasts leave on their own; the pop-up never does

// One toast with its own auto-dismiss timer. Hovering or focusing it
// pauses the timer so a student can still reach the "View" link.
function Toast({ n, onDone }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    const t = setTimeout(() => onDone(n.id), TOAST_MS);
    return () => clearTimeout(t);
  }, [paused, n.id, onDone]);
  const Icon = ICONS[n.kind] || Megaphone;
  return (
    <div
      className="card pointer-events-auto flex items-start gap-3 p-3.5 shadow-lg"
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{n.title}</p>
        {n.body && <p className="truncate text-xs text-inkdim">{n.body}</p>}
        {typeof n.href === 'string' && /^\/(?![\/\\])/.test(n.href) && (
          <Link href={n.href} onClick={() => onDone(n.id)} className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">
            View
          </Link>
        )}
      </div>
      <button type="button" onClick={() => onDone(n.id)} aria-label="Dismiss" className="rounded p-1 text-inkdim hover:bg-surfaceMuted hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// The admin's reschedule pop-up: shows the request and offers Approve / Decline instead of "I'm ready".
function RescheduleDecision({ n, onClose }) {
  const router = useRouter();
  const id = n.ref.slice('exam-resched:'.length);
  const [info, setInfo] = useState(null);
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    getRescheduleInfo(id).then((r) => { if (!live) return; setInfo(r); if (r?.preferred) setWhen(isoToWatLocal(r.preferred)); });
    return () => { live = false; };
  }, [id]);
  async function decide(decision) {
    setErr('');
    if (decision === 'approve' && !when) { setErr('Choose the new exam date and time first.'); return; }
    setBusy(true);
    const r = await decideReschedule(id, decision, { newStartsAt: when || null, note });
    setBusy(false);
    if (r?.error) { setErr(r.error); return; }
    router.refresh();
    onClose();
  }
  const settled = info && !info.error && info.status !== 'pending';
  return (
    <div className="space-y-3">
      <p className="whitespace-pre-wrap text-sm text-ink">{n.body}</p>
      {!info && <p className="text-xs text-inkdim">Loading the request&hellip;</p>}
      {info?.error && <p className="text-xs text-red-600">{info.error}</p>}
      {info && !info.error && (
        <div className="space-y-2 rounded-lg border border-line p-3 text-xs text-inkdim">
          <p><strong className="text-ink">{info.name}</strong> · attempt {info.attemptNo}</p>
          {info.preferred && <p>Prefers: {fmtWat(info.preferred)} (Lagos time)</p>}
          {settled ? <p className="font-semibold text-ink">Already {info.status}.</p> : (
            <>
              <label className="block font-medium uppercase tracking-wide">New exam time (Lagos time)
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="field mt-1 normal-case" />
              </label>
              <label className="block font-medium uppercase tracking-wide">Note to the student (optional)
                <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="field mt-1 normal-case" />
              </label>
            </>
          )}
        </div>
      )}
      {err && <p role="alert" className="text-xs text-red-600">{err}</p>}
      {settled || info?.error
        ? <button type="button" onClick={onClose} className="cta-btn w-full">Close</button>
        : (
          <div className="flex gap-2">
            <button type="button" disabled={busy || !info} onClick={() => decide('approve')} className="cta-btn flex-1 justify-center">Approve</button>
            <button type="button" disabled={busy || !info} onClick={() => decide('decline')} className="cta-btn-outline flex-1 justify-center">Decline</button>
          </div>
        )}
    </div>
  );
}

export default function NotificationHost({ userId }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const seen = useRef(null);
  const supabaseRef = useRef(null);
  const readyBtn = useRef(null);

  const load = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const q = (cols) => supabase.from('notifications').select(cols).is('read_at', null).order('created_at', { ascending: true }).limit(50);
    let { data, error } = await q('id, kind, title, body, href, created_at, ref');
    if (error) ({ data } = await q('id, kind, title, body, href, created_at')); // database file 14 not run yet
    if (data) {
      setItems(data);
      // Something new arrived for this person: re-render the page so it shows the change without a manual refresh.
      const newest = data.reduce((m, n) => Math.max(m, Date.parse(n.created_at) || 0), 0);
      if (seen.current !== null && newest > seen.current) router.refresh();
      seen.current = Math.max(seen.current || 0, newest);
    }
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;
    load();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    const poll = setInterval(load, 20000);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const markRead = useCallback((id) => {
    setItems((cur) => cur.filter((n) => n.id !== id)); // instant; the write follows
    supabaseRef.current?.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).then(() => {});
  }, []);

  const announcements = items.filter((n) => n.kind === 'announcement');
  const toasts = items.filter((n) => n.kind !== 'announcement');
  const current = announcements[0] || null;

  // Focus the button and lock page scroll while the pop-up is up.
  useEffect(() => {
    if (!current) return undefined;
    readyBtn.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function trapTab(e) {
    // The only focusable control is the button -- keep focus on it.
    if (e.key === 'Tab' && !(typeof current?.ref === 'string' && current.ref.startsWith('exam-resched:'))) {
      e.preventDefault();
      readyBtn.current?.focus();
    }
  }

  return (
    <>
      {current && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 p-4 sm:items-center" onKeyDown={trapTab}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="ann-title" aria-describedby="ann-body" className="card w-full max-w-md p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Megaphone className="h-5 w-5" />
              </span>
              <div>
                <h2 id="ann-title" className="font-display text-lg font-extrabold text-ink">New announcement</h2>
                {announcements.length > 1 && <p className="text-xs text-inkdim">{announcements.length} unread</p>}
              </div>
            </div>
            {typeof current.ref === 'string' && current.ref.startsWith('exam-resched:') ? (
              <RescheduleDecision key={current.id} n={current} onClose={() => markRead(current.id)} />
            ) : (
              <>
                <p id="ann-body" className="mb-2 max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm text-ink">{current.body}</p>
                <p className="mb-5 text-xs text-inkdim">{new Date(current.created_at).toLocaleString()}</p>
                <button ref={readyBtn} type="button" onClick={() => markRead(current.id)} className="cta-btn w-full">
                  <CheckCircle2 className="h-4 w-4" /> I&apos;m ready
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-20 right-4 z-[250] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
          {toasts.slice(-3).map((n) => (
            <Toast key={n.id} n={n} onDone={markRead} />
          ))}
        </div>
      )}
    </>
  );
}
