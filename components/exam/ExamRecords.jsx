'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Ban, Loader2 } from 'lucide-react';
import ProofViewer from './ProofViewer';
import { dismissAttempt, setStudentExamDate, setStudentExam } from '../../app/exam-actions';
import { fmtWat, isoToWatLocal } from '../../lib/exam/time';
import { Sections } from './ExamPanel';

// Per-student exam records for one batch. `admin` adds the controls (own exam date, dismiss an attempt);
// teachers (when the admin allows it) get the read-only version.
export default function ExamRecords({ batchId, students, personal = {}, admin }) {
  const router = useRouter();
    const [pending, start] = useTransition();
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState('');
  const [dates, setDates] = useState(() => Object.fromEntries(students.map((s) => [s.userId, isoToWatLocal(personal[s.userId]?.startsAt || '')])));

  // Keep the date boxes in step with the saved dates after the page refreshes.
  useEffect(() => { setDates(Object.fromEntries(students.map((s) => [s.userId, isoToWatLocal(personal[s.userId]?.startsAt || '')]))); }, [students, personal]);

  const [dismissing, setDismissing] = useState(null); // { id, reason }
  function sendDismiss() {
    const d = dismissing;
    if (!d || d.reason.trim().length < 3) { setMsg('Give a short reason first.'); return; }
    start(async () => {
      const res = await dismissAttempt(d.id, d.reason.trim());
      setMsg(res?.error || 'Attempt dismissed. The student was notified and can take the exam again.');
      if (!res?.error) setDismissing(null);
      router.refresh();
    });
  }
  function setExam(userId, activated) {
    start(async () => {
      const res = await setStudentExam(batchId, userId, { startsAt: dates[userId] || null, activated });
      setMsg(res?.error || (activated ? 'Exam activated for this student. They got a pop-up and an announcement.' : 'Saved for this student.'));
      router.refresh();
    });
  }
  function saveDate(userId, value) {
    start(async () => {
      const res = await setStudentExamDate(batchId, userId, value || null);
      setMsg(res?.error || (value ? 'Student exam date saved. The student was notified.' : 'Back to the batch date. The student was notified.'));
      router.refresh();
    });
  }

  if (!students.length) return <p className="text-sm text-inkdim">No students in this batch yet.</p>;
  return (
    <div>
      {msg && <p role="status" className="mb-3 rounded-lg border border-line bg-surfaceMuted px-3 py-2 text-sm text-ink">{msg}</p>}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {students.map((s) => {
          const isOpen = open === s.userId;
          const sm = s.summary;
          return (
            <li key={s.userId}>
              <button type="button" onClick={() => setOpen(isOpen ? null : s.userId)} aria-expanded={isOpen} className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{s.name}</span>
                  <span className="block truncate text-xs text-inkdim">{s.email}</span>
                </span>
                {s.examActive && s.examAt && (
                  <span className="group relative">
                    <span tabIndex={0} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Exam activated</span>
                    <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-56 rounded-lg border border-line bg-surface p-2 text-xs font-normal text-ink shadow-lg group-hover:block group-focus-within:block">
                      Exam time: <strong>{fmtWat(s.examAt)}</strong> (Lagos time){s.ownDate ? ' · own date' : ' · batch date'}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-3 text-xs text-inkdim">
                  <span>{s.attempts.filter((a) => a.status !== 'dismissed').length} attempt(s)</span>
                  {sm ? <span className={`rounded-full px-2 py-0.5 font-semibold ${sm.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{sm.percent}% · {sm.label}</span> : <span>No result</span>}
                  <ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-line bg-surfaceMuted/40 px-4 py-3">
                  {admin && (
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-xs text-inkdim">This student&apos;s own exam date (Lagos time)
                        <input type="datetime-local" value={dates[s.userId] || ''} onChange={(e) => setDates((d) => ({ ...d, [s.userId]: e.target.value }))} className="field mt-1 w-56" />
                      </label>
                      <button type="button" disabled={pending || !dates[s.userId]} onClick={() => saveDate(s.userId, dates[s.userId])} className="cta-btn-outline">Save date</button>
                      {personal[s.userId]?.activated
                        ? <button type="button" disabled={pending} onClick={() => setExam(s.userId, false)} className="cta-btn-outline">Pause for this student</button>
                        : <button type="button" disabled={pending} onClick={() => setExam(s.userId, true)} className="cta-btn">Activate for this student</button>}
                      {!dates[s.userId] && <span className="text-xs text-inkdim">No date typed: uses the batch date, or 6:00 PM.</span>}
                      {personal[s.userId] && <button type="button" disabled={pending} onClick={() => { setDates((d) => ({ ...d, [s.userId]: '' })); saveDate(s.userId, ''); }} className="text-xs underline text-inkdim">Use batch date</button>}
                    </div>
                  )}
                  {!s.attempts.length && <p className="text-sm text-inkdim">No attempts yet.</p>}
                  {s.attempts.map((a, i) => (
                    <div key={a.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-ink">Attempt {i + 1} · {fmtWat(a.started_at)}{a.paid_ref ? ' · paid retake' : ''}</p>
                        <p className="text-xs text-inkdim">
                          {a.status === 'dismissed' ? `INVALID RESULT: ${a.dismissed_reason || ''}` : a.status === 'in_progress' ? 'In progress' : `${a.score}/${a.total} · ${a.percent}% · ${a.passed ? 'Passed' : 'Not passed'}${a.auto_submitted ? ' · auto-submitted' : ''}${a.violations ? ` · left full screen ${a.violations}×` : ''}`}
                        </p>
                      </div>
                      {a.status === 'submitted' && <div className="mt-2"><Sections sections={a.sections} /></div>}
                      {a.submitted_at && <p className="mt-1 text-xs text-inkdim">Submitted {fmtWat(a.submitted_at)}</p>}
                      {admin && <ProofViewer attemptId={a.id} />}
                      {admin && a.status !== 'dismissed' && (dismissing?.id === a.id ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-inkdim">The result is marked INVALID and no longer counts. A certificate the exam issued because of it is withdrawn, the student is told your reason, and they must write the exam again. The result stays visible, marked invalid, and still counts as one of their 3 free attempts, so a student with no free attempts left must pay the retake fee.</p>
                          <input value={dismissing.reason} onChange={(e) => setDismissing({ id: a.id, reason: e.target.value })} maxLength={300} placeholder="Reason (the student will see it)" className="field" />
                          <div className="flex gap-2">
                            <button type="button" disabled={pending} onClick={sendDismiss} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">{pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />} Invalidate result</button>
                            <button type="button" onClick={() => setDismissing(null)} className="text-xs underline text-inkdim">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setDismissing({ id: a.id, reason: '' })} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"><Ban className="h-3 w-3" /> Invalidate this result</button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
