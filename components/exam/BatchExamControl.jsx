'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Power, Save, ChevronDown } from 'lucide-react';
import { saveExamSchedule, setTeacherExamView } from '../../app/exam-actions';
import { isoToWatLocal, fmtWat, defaultExamStart } from '../../lib/exam/time';
import { EXAM_RULES } from '../../lib/exam/config';

// Admin controls for one batch's exam: date/time, optional automatic opening, pass mark, on/off, teacher access.
export default function BatchExamControl({ batchId, schedule, provisionalIso, teacherCanView, sections, bankSizes, settings, ownDateCount = 0 }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [startsAt, setStartsAt] = useState(isoToWatLocal(schedule?.starts_at || provisionalIso || defaultExamStart(EXAM_RULES.defaultExamHourWAT)));
  const [activateAt, setActivateAt] = useState(isoToWatLocal(schedule?.activate_at || ''));
  const [pass, setPass] = useState(schedule?.pass_percent || 50);
  const [note, setNote] = useState(schedule?.note || '');
  const [activated, setActivated] = useState(!!schedule?.activated);
  const [minutes, setMinutes] = useState(settings.durationMinutes);
  const [fee, setFee] = useState(settings.retakeFee);
  const [counts, setCounts] = useState(settings.counts);
  const total = sections.reduce((n, s) => n + (Number(counts[s.key]) || 0), 0);
  const passMark = Math.ceil((total * (Number(pass) || 0)) / 100);
  const [tView, setTView] = useState(!!teacherCanView);
  const [msg, setMsg] = useState({ ok: '', err: '' });
  const [open, setOpen] = useState(false); // the form stays folded until the admin opens it
  const [moveOwn, setMoveOwn] = useState(true);

  const saved = !!schedule;
  const changed = !saved || startsAt !== isoToWatLocal(schedule.starts_at) || activateAt !== isoToWatLocal(schedule.activate_at || '') || Number(pass) !== schedule.pass_percent || note !== (schedule.note || '') || activated !== !!schedule.activated || Number(minutes) !== settings.durationMinutes || Number(fee) !== settings.retakeFee || sections.some((s) => Number(counts[s.key]) !== settings.counts[s.key]);

  function save(nextActivated = activated) {
    setMsg({ ok: '', err: '' });
    start(async () => {
      const res = await saveExamSchedule(batchId, { startsAt, activateAt: activateAt || null, activated: nextActivated, passPercent: Number(pass), note, moveOwn, retakeFee: Number(fee), durationMinutes: Number(minutes), counts: Object.fromEntries(sections.map((s) => [s.key, Number(counts[s.key])])) });
      if (res?.error) return setMsg({ ok: '', err: res.error });
      setActivated(nextActivated);
      setMsg(res.notice ? { ok: '', err: res.notice } : { ok: 'Saved. Students in this batch were notified of anything that concerns them.', err: '' });
      router.refresh();
    });
  }
  function togglePerm(v) {
    setTView(v);
    start(async () => {
      const res = await setTeacherExamView(batchId, v);
      if (res?.error) { setTView(!v); setMsg({ ok: '', err: res.error }); } else setMsg({ ok: 'Teacher access saved.', err: '' });
      router.refresh();
    });
  }

  const live = activated || (schedule?.activate_at && Date.parse(schedule.activate_at) <= Date.now());
  return (
    <div className="space-y-4">
      <p className="text-sm">
        Status: <strong className={live ? 'text-emerald-700' : 'text-amber-700'}>{live ? 'Open to students' : 'Hidden from students'}</strong>
        {saved && <span className="text-inkdim"> · exam date {fmtWat(schedule.starts_at)}</span>}
        {!saved && <span className="text-inkdim"> · not saved yet (the date below is the provisional one: a week after the last class)</span>}
      </p>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-surfaceMuted">
        {open ? 'Close exam settings' : 'Open exam settings'} <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {(msg.ok || msg.err) && <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${msg.err ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300' : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>{msg.err || msg.ok}</p>}
      {open && (
        <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-inkdim">Exam date and time (Lagos time)
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="field mt-1 normal-case" />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-inkdim">Open automatically at (optional)
          <input type="datetime-local" value={activateAt} onChange={(e) => setActivateAt(e.target.value)} className="field mt-1 normal-case" />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-inkdim">Pass mark (%)
          <input type="number" min={1} max={100} value={pass} onChange={(e) => setPass(e.target.value)} className="field mt-1 normal-case" />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-inkdim">Note to students (optional)
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="field mt-1 normal-case" />
        </label>
      </div>
      <div className="rounded-lg border border-line p-3">
        <p className="mb-2 text-sm font-semibold text-ink">Exam length and questions</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-inkdim sm:col-span-4">Exam time (minutes)
            <input type="number" min={10} max={360} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="field mt-1 max-w-[10rem] normal-case" />
          </label>
          {sections.map((s) => (
            <label key={s.key} className="block text-xs font-medium uppercase tracking-wide text-inkdim">{s.label}
              <input type="number" min={0} max={bankSizes[s.key]} value={counts[s.key]} onChange={(e) => setCounts((c) => ({ ...c, [s.key]: e.target.value }))} className="field mt-1 normal-case" />
              <span className="mt-0.5 block text-[10px] normal-case text-inkdim">of {bankSizes[s.key]} available</span>
            </label>
          ))}
        </div>
        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-inkdim">Retake fee after the 3 free attempts (₦)
          <input type="number" min={100} max={1000000} value={fee} onChange={(e) => setFee(e.target.value)} className="field mt-1 max-w-[10rem] normal-case" />
          <span className="mt-0.5 block text-[10px] normal-case text-inkdim">Default ₦5,000. Applies to payments started after you save.</span>
        </label>
        <p className="mt-2 text-xs text-inkdim">Total {total} questions · pass mark {pass}% = {passMark} correct · {minutes} minutes. Changes apply to attempts that start after you save; exams already running keep their own settings.</p>
      </div>
      <p className="text-xs text-inkdim">Students only see the Exam tab once the exam is open: either you press Activate, or the automatic time arrives. Changing the date notifies the batch; use the student list below to move just one student.</p>
      {ownDateCount > 0 && (
        <label className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-ink">
          <input type="checkbox" className="mt-0.5 accent-brand" checked={moveOwn} onChange={(e) => setMoveOwn(e.target.checked)} />
          <span>{ownDateCount} student{ownDateCount === 1 ? ' has' : 's have'} their own exam date (set by you or by an approved reschedule). A student&apos;s own date wins over the batch date. Tick this to move them to the new batch date too; untick to leave them as they are.</span>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => save()} disabled={pending || !changed} className="cta-btn disabled:opacity-50">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save schedule</button>
        <button type="button" onClick={() => save(!activated)} disabled={pending} className={activated ? 'cta-btn-outline' : 'cta-btn'}><Power className="h-4 w-4" /> {activated ? 'Pause exam (hide from students)' : 'Activate exam now'}</button>
      </div>
        </div>
      )}
      {!open && (
        <button type="button" onClick={() => save(!activated)} disabled={pending || changed} title={changed ? 'Save your changes first' : ''} className={activated ? 'cta-btn-outline' : 'cta-btn'}><Power className="h-4 w-4" /> {activated ? 'Pause exam (hide from students)' : 'Activate exam now'}</button>
      )}
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" className="accent-brand" checked={tView} disabled={pending} onChange={(e) => togglePerm(e.target.checked)} /> Teachers assigned to this batch may view its exam records
      </label>
    </div>
  );
}
