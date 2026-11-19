'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Maximize, ShieldAlert, CheckCircle2, WifiOff, Loader2, ChevronLeft, ChevronRight, Send, Flag } from 'lucide-react';
import ProctorCam from './ProctorCam';
import { stopAllMedia } from '../../lib/exam/media';
import { saveExamAnswers, submitExam, recordExamViolation } from '../../app/exam-actions';
import { EXAM_RULES } from '../../lib/exam/config';

// The live exam. Built so a bad connection cannot cost the student marks:
//  - every answer is kept on this device straight away and sent to the server in the background (retried until it works);
//  - the countdown is measured against the SERVER's clock (not the device clock) and keeps running offline;
//  - when time is up the answers lock and are submitted automatically, retrying until the connection returns.
const pad = (n) => String(n).padStart(2, '0');
function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export default function ExamRunner({ attemptId, questions, sections, initialAnswers, expiresAt, startedAt, serverNow, candidate = '', title = 'Final examination' }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false); // our own dialog: the shared one would sit behind the full-screen exam
  const storeKey = `foundry-exam:${attemptId}`;
  const offset = useRef(serverNow - Date.now()); // server clock minus device clock
  const deadline = expiresAt;

  const [answers, setAnswers] = useState(() => {
    let local = {};
    try { local = JSON.parse(localStorage.getItem(storeKey) || '{}') || {}; } catch { /* private mode */ }
    return { ...initialAnswers, ...local };
  });
  // Questions arrive grouped by subject. Like JAMB, the student works one subject at a time and can
  // jump between subjects and questions freely.
  const groups = useMemo(() => {
    const out = [];
    questions.forEach((q) => {
      let g = out[out.length - 1];
      if (!g || g.key !== q.section) { g = { key: q.section, label: sections.find((s) => s.key === q.section)?.label || q.section, qs: [] }; out.push(g); }
      g.qs.push(q);
    });
    return out;
  }, [questions, sections]);
  const [pos, setPos] = useState({ s: 0, i: 0 });
  const [left, setLeft] = useState(() => deadline - serverNow);
  const [net, setNet] = useState('saved'); // saved | saving | offline
  const [finishing, setFinishing] = useState(false);
  const [flags, setFlags] = useState(() => { try { return JSON.parse(localStorage.getItem(`${storeKey}:flags`) || '{}') || {}; } catch { return {}; } }); // marked for review (this device only)
  // ---- Lockdown: full screen, no back button, strikes for leaving ----
  const fsSupported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
  const [inFs, setInFs] = useState(true); // true until the first client check, to avoid a flash
  const [strikes, setStrikes] = useState(null); // { n, max } after a violation
  const [mediaOk, setMediaOk] = useState(false); // camera/mic working
  const readyRef = useRef(false);
  const armedRef = useRef(false); // violations only count once the exam has really begun (3 seconds after the timer shows)
  const wasFs = useRef(false);
  const lastStrike = useRef(0);
  const dirty = useRef(false);
  const latest = useRef(answers);
  const busy = useRef(false);
  const done = useRef(false);

  latest.current = answers;
  const answeredCount = useMemo(() => questions.filter((q) => Number.isInteger(answers[q.id])).length, [answers, questions]);

  const persistLocal = useCallback((a) => { try { localStorage.setItem(storeKey, JSON.stringify(a)); } catch { /* ignore */ } }, [storeKey]);

  // Send the latest answers to the server. Never throws; marks offline and tries again later.
  const sync = useCallback(async () => {
    if (busy.current || done.current || !dirty.current) return;
    busy.current = true;
    setNet('saving');
    const snapshot = latest.current;
    try {
      const res = await saveExamAnswers(attemptId, snapshot);
      if (res?.finished) { done.current = true; setFinishing(true); stopAllMedia(); document.fullscreenElement && document.exitFullscreen?.().catch(() => {}); router.refresh(); return; }
      if (res?.error) throw new Error(res.error);
      if (latest.current === snapshot) dirty.current = false;
      setNet(dirty.current ? 'saving' : 'saved');
    } catch { setNet('offline'); }
    busy.current = false;
    if (dirty.current && !done.current) setTimeout(sync, 400);
  }, [attemptId, router]);

  function choose(qid, pos) {
    if (finishing || left <= 0) return;
    setAnswers((a) => { const n = { ...a, [qid]: pos }; persistLocal(n); return n; });
    dirty.current = true;
    setNet('saving');
  }

  // Background sync: soon after a change, every 5s while there is unsent work, and when the network returns.
  useEffect(() => {
    const t = setInterval(() => { if (dirty.current) sync(); }, 5000);
    const on = () => sync();
    window.addEventListener('online', on);
    return () => { clearInterval(t); window.removeEventListener('online', on); };
  }, [sync]);
  useEffect(() => { if (!dirty.current) return undefined; const t = setTimeout(sync, 1200); return () => clearTimeout(t); }, [answers, sync]);

  // Final submit with retries (used by the button and by the timer).
  const submitNow = useCallback(async (auto) => {
    if (done.current) return;
    setFinishing(true);
    let wait = 1500;
    for (;;) {
      try {
        const res = await submitExam(attemptId, latest.current, auto);
        if (res?.ok) { done.current = true; try { localStorage.removeItem(storeKey); } catch { /* ignore */ } router.refresh(); return; }
        if (res?.error && /sign in|Unknown/i.test(res.error)) { router.refresh(); return; }
        if (res?.error && /Too early/i.test(res.error)) { setFinishing(false); return; }
      } catch { setNet('offline'); }
      await new Promise((r) => setTimeout(r, wait));
      wait = Math.min(wait * 1.6, 10000);
    }
  }, [attemptId, router, storeKey]);

  // The countdown. When it reaches zero the exam is submitted for the student.
  useEffect(() => {
    const t = setInterval(() => {
      const l = deadline - (Date.now() + offset.current);
      setLeft(l);
      if (l <= 0 && !done.current && !busy.current) { clearInterval(t); submitNow(true); }
    }, 500);
    return () => clearInterval(t);
  }, [deadline, submitNow]);

  useEffect(() => {
    const warn = (e) => { if (!done.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const strike = useCallback(async () => {
    if (done.current || !armedRef.current || Date.now() - lastStrike.current < 2000) return; // no strikes during set-up or the first seconds
    lastStrike.current = Date.now();
    try {
      const res = await recordExamViolation(attemptId, latest.current);
      if (res?.finished) { done.current = true; router.refresh(); return; }
      if (res?.violations) setStrikes({ n: res.violations, max: res.max });
    } catch { setStrikes((s) => ({ n: (s?.n || 0) + 1, max: EXAM_RULES.maxViolations })); }
  }, [attemptId, router]);

  useEffect(() => {
    const check = () => {
      const on = !!document.fullscreenElement;
      setInFs(on || !document.documentElement.requestFullscreen);
      if (on) wasFs.current = true;
      else if (wasFs.current && document.documentElement.requestFullscreen) { wasFs.current = false; strike(); }
    };
    const vis = () => {
      if (document.visibilityState === 'hidden' && !done.current) strike();
      else if (document.visibilityState === 'visible' && !done.current) { sync(); router.refresh(); } // came back to the exam: send saved answers and fetch fresh state
    };
    check();
    document.addEventListener('fullscreenchange', check);
    document.addEventListener('visibilitychange', vis);
    // The device back button does nothing during the exam.
    history.pushState(null, '', location.href);
    const back = () => history.pushState(null, '', location.href);
    window.addEventListener('popstate', back);
    return () => {
      document.removeEventListener('fullscreenchange', check);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('popstate', back);
    };
  }, [strike, sync, router]);
  // Whatever way the exam ends (submitted, time up, strikes, page left), camera, microphone and full screen go off.
  useEffect(() => () => { stopAllMedia(); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); }, []);
  // Developer tools: the usual shortcuts are blocked, and opening them any other way (docked panel) counts as a violation.
  useEffect(() => {
    const key = (e) => {
      const k = (e.key || '').toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const bad = e.key === 'F12'
        || (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k))
        || (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k))
        || (mod && ['u', 's', 'p'].includes(k));
      if (bad) { e.preventDefault(); e.stopPropagation(); if (armedRef.current && (k === 'f12' || ['i', 'j', 'c', 'k'].includes(k))) strike(); }
    };
    window.addEventListener('keydown', key, true);
    let hits = 0;
    const t = setInterval(() => {
      if (!armedRef.current || done.current) return;
      const open = window.outerWidth - window.innerWidth > 220 || window.outerHeight - window.innerHeight > 260;
      hits = open ? hits + 1 : 0;
      if (hits === 3) strike(); // still open after ~6 seconds
    }, 2000);
    return () => { window.removeEventListener('keydown', key, true); clearInterval(t); };
  }, [strike]);
  const enterFs = () => { document.documentElement.requestFullscreen?.().catch(() => {}); };

  // Submit stays locked for the first minutes of the exam (measured on the server's clock).
  const elapsedMs = Date.now() + offset.current - startedAt;
  const lockMs = EXAM_RULES.minSubmitMinutes * 60000 - elapsedMs;
  const submitLocked = lockMs > 0;
  const [, tick] = useState(0);
  useEffect(() => { if (!submitLocked) return undefined; const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, [submitLocked]);
  const lockText = `${pad(Math.floor(Math.max(0, lockMs) / 60000))}:${pad(Math.floor((Math.max(0, lockMs) % 60000) / 1000))}`;
  function onSubmit() { if (!submitLocked) setConfirming(true); }

  const ready = inFs && mediaOk;
  readyRef.current = ready;
  useEffect(() => {
    if (!ready || armedRef.current) return undefined;
    const t = setTimeout(() => { armedRef.current = true; }, 3000);
    return () => clearTimeout(t);
  }, [ready]);
  const group = groups[pos.s];
  const q = group.qs[pos.i];
  const isLast = pos.s === groups.length - 1 && pos.i === group.qs.length - 1;
  const isFirst = pos.s === 0 && pos.i === 0;
  function go(dir) {
    setPos((p) => {
      const g = groups[p.s];
      if (dir > 0) return p.i < g.qs.length - 1 ? { s: p.s, i: p.i + 1 } : p.s < groups.length - 1 ? { s: p.s + 1, i: 0 } : p;
      return p.i > 0 ? { s: p.s, i: p.i - 1 } : p.s > 0 ? { s: p.s - 1, i: groups[p.s - 1].qs.length - 1 } : p;
    });
  }
  function toggleFlag(id) {
    setFlags((f) => { const n = { ...f }; if (n[id]) delete n[id]; else n[id] = 1; try { localStorage.setItem(`${storeKey}:flags`, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  }
  const answeredIn = (g) => g.qs.filter((x) => Number.isInteger(answers[x.id])).length;
  const urgent = left < 5 * 60 * 1000;
  const warn = left < 15 * 60 * 1000;
  const flaggedCount = Object.keys(flags).filter((id) => questions.some((x) => x.id === id)).length;
  const unanswered = questions.length - answeredCount;
  // Questions marked for review, numbered inside their subject.
  const reviewList = [];
  groups.forEach((g, si) => g.qs.forEach((x, i) => { if (flags[x.id]) reviewList.push({ id: x.id, si, i, label: `${g.label} ${i + 1}`, done: Number.isInteger(answers[x.id]) }); }));

  return (
    <div className="fixed inset-0 z-[400] flex select-none flex-col bg-surfaceMuted" onContextMenu={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()}>
      {!inFs && !finishing && (
        <div className="fixed inset-0 z-[410] flex items-center justify-center bg-black/80 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-lg border border-line bg-surface p-6 text-center shadow-xl">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surfaceMuted text-ink">{strikes ? <ShieldAlert className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}</span>
            <h2 className="mb-2 text-lg font-semibold text-ink">{strikes ? 'You left full screen' : 'Full screen required'}</h2>
            <p className="mb-2 text-sm text-inkdim">The exam must be taken in full screen. Leaving full screen or switching to another app is recorded as a violation.</p>
            {strikes && <p className="mb-2 text-sm font-semibold text-red-600">Violation {strikes.n} of {strikes.max}. At {strikes.max} your exam is submitted automatically with the answers you have given so far. The timer is still running.</p>}
            <button type="button" onClick={enterFs} className="cta-btn mt-2 w-full justify-center"><Maximize className="h-4 w-4" /> Return to full screen</button>
          </div>
        </div>
      )}
      {confirming && !finishing && (
        <div className="fixed inset-0 z-[420] flex items-center justify-center bg-black/70 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-ink">Submit your exam?</h2>
            {reviewList.length > 0 && (
              <div role="alert" className="mb-4 rounded-md border-2 border-amber-500 bg-amber-100 p-3 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                <p className="mb-1 text-sm font-bold uppercase tracking-wide">Wait: {reviewList.length} question{reviewList.length === 1 ? ' is' : 's are'} still marked for review</p>
                <p className="mb-2 text-sm font-semibold">{reviewList.map((r) => r.label).join(', ')}</p>
                <button type="button" onClick={() => { setConfirming(false); setPos({ s: reviewList[0].si, i: reviewList[0].i }); }} className="rounded border border-amber-700 px-2.5 py-1 text-xs font-semibold hover:bg-amber-200 dark:hover:bg-amber-900">Go and review them</button>
              </div>
            )}
            <p className="mb-5 text-sm text-inkdim">
              {unanswered ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. ` : 'You have answered every question. '}
              Once you submit you cannot change anything.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setConfirming(false); submitNow(false); }} className="cta-btn flex-1 justify-center"><Send className="h-4 w-4" /> Submit exam</button>
              <button type="button" onClick={() => setConfirming(false)} className="cta-btn-outline flex-1 justify-center">Go back</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{title}</p>
            <p className="truncate text-xs text-inkdim">{candidate ? `Candidate: ${candidate} · ` : ''}{ready ? `${answeredCount} of ${questions.length} answered` : 'Setting up'}</p>
          </div>
          <div className="flex items-center gap-4">
            <p className={`hidden items-center gap-1.5 text-xs sm:inline-flex ${net === 'offline' ? 'font-semibold text-amber-600' : 'text-inkdim'}`} role="status">
              {net === 'offline' ? <><WifiOff className="h-3.5 w-3.5" /> Offline: answers are kept on this device</>
                : net === 'saving' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving</>
                : <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> All answers saved</>}
            </p>
            {ready && <div className={`rounded-md border px-3 py-1.5 text-right ${urgent ? 'border-red-500/60 bg-red-500/10' : warn ? 'border-amber-500/60 bg-amber-500/10' : 'border-line bg-surfaceMuted'}`}>
              <p className="text-[10px] font-medium uppercase tracking-wide text-inkdim">Time remaining</p>
              <p className={`flex items-center justify-end gap-1.5 font-mono text-lg font-semibold tabular-nums ${urgent ? 'text-red-600' : warn ? 'text-amber-600' : 'text-ink'}`} aria-live="off"><Clock className="h-4 w-4" />{fmt(left)}</p>
            </div>}
          </div>
        </div>
        {strikes && inFs && !finishing && <p role="alert" className="border-t border-red-500/40 bg-red-500/10 px-4 py-1.5 text-center text-xs font-semibold text-red-600">Violation {strikes.n} of {strikes.max} recorded. At {strikes.max} the exam is submitted automatically.</p>}
      </header>

      <div className="flex-1 overflow-y-auto">
        {finishing ? (
          <div className="mx-auto mt-16 max-w-md rounded-lg border border-line bg-surface p-8 text-center">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-ink" />
            <p className="font-semibold text-ink">{left <= 0 ? 'Time is up. Submitting your exam…' : 'Submitting your exam…'}</p>
            {net === 'offline' && <p className="mt-2 text-sm text-inkdim">Your connection dropped. Your answers are safe and will be sent as soon as it returns. Please keep this page open.</p>}
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-5 px-4 py-5 pb-24 desktop:grid-cols-[minmax(0,1fr)_300px] desktop:pb-8">
            {/* Question */}
            <main>
              {!ready ? (
              <div className="mx-auto mt-10 max-w-md rounded-lg border border-line bg-surface p-8 text-center">
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-ink" />
                <p className="font-semibold text-ink">Setting up your exam…</p>
                <p className="mt-2 text-sm text-inkdim">The questions and timer appear as soon as full screen and your camera or microphone are working.</p>
              </div>
              ) : (
              <>
              <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Exam sections">
                {groups.map((g, si) => {
                  const on = si === pos.s;
                  return (
                    <button key={g.key} type="button" role="tab" aria-selected={on} onClick={() => setPos({ s: si, i: 0 })}
                      className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${on ? 'border-ink text-ink' : 'border-transparent text-inkdim hover:text-ink'}`}>
                      {g.label} <span className="ml-1 text-xs font-normal text-inkdim">{answeredIn(g)}/{g.qs.length}</span>
                    </button>
                  );
                })}
              </div>

              <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
                  <p className="text-sm font-medium text-inkdim">Question {pos.i + 1} of {group.qs.length} <span className="text-inkdim/70">· {group.label}</span></p>
                  <button type="button" onClick={() => toggleFlag(q.id)} aria-pressed={!!flags[q.id]} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${flags[q.id] ? 'border-amber-500/60 bg-amber-500/10 text-ink' : 'border-line text-inkdim hover:text-ink'}`}>
                    <Flag className="h-3.5 w-3.5" /> {flags[q.id] ? 'Marked for review' : 'Mark for review'}
                  </button>
                </div>
                <p className="mb-5 whitespace-pre-wrap break-words text-base leading-relaxed text-ink sm:text-[17px]">{q.q}</p>
                <div role="radiogroup" aria-label="Choose one answer" className="space-y-2.5">
                  {q.options.map((opt, n) => {
                    const on = answers[q.id] === n;
                    return (
                      <button key={n} type="button" role="radio" aria-checked={on} onClick={() => choose(q.id, n)}
                        className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-sm transition sm:text-[15px] ${on ? 'border-ink bg-surfaceMuted text-ink ring-1 ring-ink' : 'border-line text-ink hover:bg-surfaceMuted'}`}>
                        <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${on ? 'border-ink bg-ink text-surface' : 'border-line text-inkdim'}`}>{'ABCD'[n]}</span>
                        <span className="min-w-0 whitespace-pre-wrap break-words">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {Number.isInteger(answers[q.id]) && (
                  <button type="button" onClick={() => choose(q.id, null)} className="mt-3 text-xs text-inkdim underline">Clear my answer</button>
                )}
              </section>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button type="button" onClick={() => go(-1)} disabled={isFirst} className="cta-btn-outline disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button>
                <button type="button" onClick={() => go(1)} disabled={isLast} className="cta-btn-outline disabled:opacity-40">{pos.i === group.qs.length - 1 && !isLast ? `Next section` : 'Next'} <ChevronRight className="h-4 w-4" /></button>
              </div>
              </>
              )}
            </main>

            {/* Side panel */}
            <aside className="space-y-4">
              <ProctorCam attemptId={attemptId} paused={finishing} onLive={setMediaOk} />
              {ready && (
              <>
              <div className="rounded-lg border border-line bg-surface p-4">
                <p className="mb-2 text-sm font-semibold text-ink">{group.label} questions</p>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 desktop:grid-cols-5">
                  {group.qs.map((x, i) => {
                    const done = Number.isInteger(answers[x.id]);
                    return (
                      <button key={x.id} type="button" onClick={() => setPos({ s: pos.s, i })} aria-label={`Question ${i + 1}${done ? ', answered' : ''}${flags[x.id] ? ', marked for review' : ''}`}
                        className={`relative rounded border py-1.5 text-xs font-medium ${i === pos.i ? 'ring-2 ring-ink' : ''} ${done ? 'border-ink bg-ink text-surface' : 'border-line text-inkdim hover:bg-surfaceMuted'}`}>
                        {i + 1}{flags[x.id] && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-inkdim">
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-ink" />Answered</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-line" />Not answered</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Review</span>
                </div>
              </div>
              <div className="rounded-lg border border-line bg-surface p-4">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink"><Flag className="h-3.5 w-3.5 text-amber-500" /> Review ({reviewList.length})</p>
                {reviewList.length === 0 ? <p className="text-xs text-inkdim">Use “Mark for review” on a question to find it again here.</p> : (
                  <div className="flex flex-wrap gap-1.5">
                    {reviewList.map((r) => (
                      <button key={r.id} type="button" onClick={() => setPos({ s: r.si, i: r.i })} className="rounded border border-amber-500/60 bg-amber-500/10 px-2 py-1 text-xs font-medium text-ink hover:bg-amber-500/20">{r.label}{r.done ? '' : ' •'}</button>
                    ))}
                  </div>
                )}
                {reviewList.length > 0 && <p className="mt-2 text-[11px] text-inkdim">• = not answered yet</p>}
              </div>
              <div className="rounded-lg border border-line bg-surface p-4">
                <p className="mb-3 text-xs text-inkdim">{answeredCount} answered · {unanswered} not answered{flaggedCount ? ` · ${flaggedCount} for review` : ''}</p>
                <button type="button" onClick={onSubmit} disabled={submitLocked} className="cta-btn w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /> Submit exam</button>
                {submitLocked && <p className="mt-2 text-center text-xs text-inkdim">You can submit after {EXAM_RULES.minSubmitMinutes} minutes of writing. Unlocks in {lockText}.</p>}
                {reviewList.length > 0 && !submitLocked && <p className="mt-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-400">{reviewList.length} question{reviewList.length === 1 ? '' : 's'} still marked for review.</p>}
              </div>
              </>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
