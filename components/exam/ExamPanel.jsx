'use client';

import DateField from '../ui/DateField';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Play, CreditCard, CalendarClock, Award, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { startExam, requestReschedule } from '../../app/exam-actions';
import { EXAM_RULES } from '../../lib/exam/config';
import { fmtWat } from '../../lib/exam/time';
import { stopAllMedia, resetCameraFails } from '../../lib/exam/media';
import ExamSetup from './ExamSetup';

const Err = ({ children }) => children ? <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">{children}</p> : null;

export default function ExamPanel({ view }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const [paying, setPaying] = useState(false);
  const [showReq, setShowReq] = useState(false);
  const [reason, setReason] = useState('');
  const [preferred, setPreferred] = useState('');
  const { state, schedule, total, passMark, passPercent, attempts, request, nextNo = 1, fee = EXAM_RULES.retakeFeeNaira, used = 0, summary, durationMinutes, counts, sections } = view;
  const hours = durationMinutes >= 60 && durationMinutes % 60 === 0 ? `${durationMinutes / 60} hour${durationMinutes === 60 ? '' : 's'}` : `${durationMinutes} minutes`;

  const [setup, setSetup] = useState(false);
  // No exam is running here: make sure the camera, microphone and full screen are off.
  useEffect(() => { resetCameraFails(); stopAllMedia(); if (document.fullscreenElement && !setup) document.exitFullscreen?.().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function begin() {
    setErr(''); setSetup(false);
    start(async () => {
      const res = await startExam();
      if (res?.error) return setErr(res.error);
      router.refresh();
    });
  }

  async function payAndStart() {
    setErr(''); setPaying(true);
    try {
      const r = await fetch('/api/exams/pay', { method: 'POST' });
      const init = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(init.error || 'Could not start the payment.');
      const { default: PaystackPop } = await import('@paystack/inline-js');
      new PaystackPop().resumeTransaction(init.accessCode, {
        onSuccess: async () => {
          try {
            const v = await fetch('/api/exams/pay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: init.reference }) });
            const j = await v.json().catch(() => ({}));
            if (!v.ok) setErr(j.error || 'Payment could not be confirmed yet. Refresh in a minute; if you were charged your exam will unlock.');
          } catch { setErr('Could not confirm the payment. Refresh this page in a minute; if you were charged your exam will unlock.'); }
          setPaying(false); router.refresh();
        },
        onCancel: () => setPaying(false),
        onError: () => { setPaying(false); setErr('The payment window had a problem. Please try again.'); }
      });
    } catch (e) { setPaying(false); setErr(e.message); }
  }

  function sendRequest() {
    setErr('');
    if (reason.trim().split(/\s+/).filter(Boolean).length < 3) return setErr('Please explain your reason in at least 3 words.');
    start(async () => {
      const res = await requestReschedule({ reason, preferred });
      if (res?.error) return setErr(res.error);
      setShowReq(false); router.refresh();
    });
  }

  const last = [...attempts].filter((a) => a.status === 'submitted').pop();
  // One request per attempt: before the 1st try it must be before the exam date; before a retake any time while waiting.
  const canAsk = ['not_open', 'hidden', 'wait', 'ready', 'pay'].includes(state) && !request && !!schedule && (nextNo > 1 || Date.parse(schedule.startsAt) > Date.now());

  return (
    <div className="space-y-5">
      {state === 'passed' && summary && (
        <div className="card border-emerald-300 p-6">
          <p className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-5 w-5" /> You passed</p>
          <p className="font-display text-3xl font-extrabold text-ink">{summary.percent}% <span className="text-lg text-brand-dark">{summary.label}</span></p>
          <p className="text-sm text-inkdim">{summary.score} of {summary.total} correct</p>
          <Link href="/dashboard/certificate" className="cta-btn mt-4 inline-flex"><Award className="h-4 w-4" /> Download your certificate</Link>
        </div>
      )}

      {state === 'not_open' && (
        <div className="card p-6">
          <p className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-brand-dark"><CalendarClock className="h-5 w-5" /> The exam opens</p>
          <p className="font-display text-xl font-extrabold text-ink">{fmtWat(schedule.startsAt)} <span className="text-sm font-normal text-inkdim">Lagos time</span></p>
          {schedule.note && <p className="mt-1 text-sm text-inkdim">{schedule.note}</p>}
        </div>
      )}

      {state === 'ready' && (
        <div className="card p-6">
          <p className="mb-1 font-display text-lg font-extrabold text-ink">{view.attemptNo > 1 ? `Attempt ${view.attemptNo}` : 'Your exam is open'}</p>
          <p className="mb-4 text-sm text-inkdim">When you press Start, your {hours} begin and cannot be paused. Make sure your charger and internet are ready.{view.free === false ? ' Your retake fee has been received.' : ''}</p>
          <button type="button" onClick={() => { setErr(''); setSetup(true); }} disabled={pending} className="cta-btn">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start exam</button>
        </div>
      )}

      {state === 'wait' && (
        <div className="card p-6">
          <p className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-amber-700"><Clock className="h-5 w-5" /> Next attempt</p>
          <p className="font-display text-xl font-extrabold text-ink">{fmtWat(view.until)} <span className="text-sm font-normal text-inkdim">Lagos time</span></p>
          <p className="mt-1 text-sm text-inkdim">There is a {EXAM_RULES.gapHours}-hour gap after every attempt. You will get a fresh set of questions.</p>
          {used >= EXAM_RULES.freeAttempts && (
            <p className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-ink">You have used all {EXAM_RULES.freeAttempts} free attempts. To write again you must pay ₦{fee.toLocaleString()}.</p>
          )}
        </div>
      )}

      {state === 'pay' && (
        <div className="card border-2 border-brand p-6">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-brand-dark">Payment required to write again</p>
          <p className="font-display text-4xl font-extrabold text-ink">₦{fee.toLocaleString()}</p>
          <p className="mb-4 mt-2 text-sm text-inkdim">You have used all {EXAM_RULES.freeAttempts} free attempts. To retake the exam you must pay <strong className="text-ink">₦{fee.toLocaleString()}</strong>. Once the payment is confirmed the exam starts straight away, with a fresh set of questions.</p>
          <button type="button" onClick={payAndStart} disabled={paying} className="cta-btn w-full justify-center sm:w-auto">{paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay ₦{fee.toLocaleString()} and start</button>
        </div>
      )}

      {schedule && ['wait', 'ready', 'pay'].includes(state) && <p className="text-xs text-inkdim">Your exam time: <strong className="text-ink">{fmtWat(schedule.startsAt)}</strong> (Lagos time){schedule.personal ? ' · set just for you' : ''}</p>}
      {state === 'hidden' && <div className="card p-6 text-sm text-inkdim">The exam is not open yet. You will get an alert when the school opens it.</div>}
      <Err>{err}</Err>

      {(() => {
        const bad = [...attempts].filter((a) => a.status === 'dismissed' && a.dismissed_by).pop();
        const after = bad && attempts.some((a) => a.status === 'submitted' && Date.parse(a.started_at) > Date.parse(bad.started_at));
        return bad && !after ? (
          <div role="alert" className="rounded-lg border border-red-500/50 bg-red-500/10 p-5">
            <p className="mb-1 text-sm font-semibold text-red-600">Invalid result: {bad.percent}% ({bad.score}/{bad.total})</p>
            <p className="text-sm text-ink">The school invalidated this result. Reason: {bad.dismissed_reason}</p>
            <div className="my-3"><Sections sections={bad.sections} /></div>
            <p className="text-sm text-inkdim">This result no longer counts, and anything that came from it (such as a certificate) has been cancelled. It still uses one of your {EXAM_RULES.freeAttempts} free attempts. You must write the exam again{used >= EXAM_RULES.freeAttempts ? <>; because all your free attempts are used, the retake fee of <strong className="text-ink">₦{fee.toLocaleString()}</strong> applies</> : ''}.</p>
          </div>
        ) : null;
      })()}

      {last && state !== 'passed' && (
        <div className="card p-5">
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-ink">{last.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />} Last result: {last.percent}% ({last.score}/{last.total})</p>
          <Sections sections={last.sections} />
        </div>
      )}

      {canAsk && (
        <div className="card p-5">
          {!showReq ? (
            <button type="button" onClick={() => setShowReq(true)} className="cta-btn-outline"><CalendarClock className="h-4 w-4" /> Ask to move my exam date</button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-inkdim">You can ask <strong>once for each attempt</strong> (this is attempt {nextNo}). The school decides and will tell you. Exams normally start at 6:00 PM Lagos time.</p>
              <label className="block text-xs font-medium uppercase tracking-wide text-inkdim">Reason
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} className="field mt-1 normal-case" />
              </label>
              <div className="text-xs font-medium uppercase tracking-wide text-inkdim">Day you would prefer (optional, Lagos time)
                <DateField type="datetime-local" className="mt-1 max-w-xs" label="Preferred day and time" placeholder="Tap to choose a day and time" value={preferred} onChange={setPreferred} />
              </div>
              <Err>{err}</Err>
              <div className="flex gap-2">
                <button type="button" onClick={sendRequest} disabled={pending} className="cta-btn">{pending && <Loader2 className="h-4 w-4 animate-spin" />} Send request</button>
                <button type="button" onClick={() => setShowReq(false)} className="cta-btn-outline">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      {request && (
        <p className="rounded-lg border border-line p-3 text-sm text-inkdim">
          Reschedule request for attempt {nextNo}: <strong className="text-ink">{request.status}</strong>{request.admin_note ? ` · ${request.admin_note}` : ''}
        </p>
      )}

      <div className="card p-5">
        <p className="mb-2 text-sm font-semibold text-ink">Exam rules</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-inkdim">
          <li>{total} multiple-choice questions, picked at random from the course notes: {sections.filter((s) => counts[s.key] > 0).map((s) => `${s.label} ${counts[s.key]}`).join(', ')}. The exam is split into these sections and you can move between them freely.</li>
          <li>The exam is monitored: your browser asks to use your camera and microphone, and a small picture of you is taken every 10 minutes while you write (or your voice is recorded if your camera does not work). They are seen only by the school and deleted soon after you pass.</li>
          <li>The exam runs in full screen with the menu hidden. Leaving full screen or switching to another app is a violation; after {EXAM_RULES.maxViolations} the exam is submitted automatically. The back button is disabled.</li>
          <li>You have {hours}. When time runs out your exam is submitted automatically.</li>
          <li>Pass mark: {passPercent}% ({passMark} of {total}). 70% and above is Good, 80% and above is Great, 100% is Perfect.</li>
          <li>You have {EXAM_RULES.freeAttempts} free attempts, with a {EXAM_RULES.gapHours}-hour gap between them and new questions each time. After that, each retake costs ₦{fee.toLocaleString()}.</li>
          <li>If your internet drops, keep the page open: your answers are kept on your device and sent when you reconnect.</li>
          <li>When you pass, your certificate is made automatically.</li>
        </ul>
      </div>

      {attempts.length > 0 && (
        <div className="card overflow-hidden">
          <p className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">Your attempts</p>
          <ul className="divide-y divide-line text-sm">
            {attempts.map((a, i) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <span className="text-ink">Attempt {i + 1} · {fmtWat(a.started_at)}</span>
                <span className="text-inkdim">{a.status === 'dismissed' ? `Invalid result (${a.percent}%)` : a.status === 'in_progress' ? 'In progress' : `${a.percent}% · ${a.passed ? 'Passed' : 'Not passed'}${a.auto_submitted ? ' · auto-submitted' : ''}`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {setup && <ExamSetup hours={hours} busy={pending} onStart={begin} onCancel={() => setSetup(false)} />}
    </div>
  );
}

export function Sections({ sections }) {
  const list = Object.values(sections || {});
  if (!list.length) return null;
  return (
    <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {list.map((s) => <li key={s.label} className="flex justify-between gap-2"><span className="text-inkdim">{s.label}</span><span className="font-medium text-ink">{s.score}/{s.total}</span></li>)}
    </ul>
  );
}
