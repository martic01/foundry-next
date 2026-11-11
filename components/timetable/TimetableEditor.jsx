'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Undo2, Loader2, Check, ChevronDown, ArrowRight, Pencil } from 'lucide-react';
import { WEEKDAYS, TZ_LABEL, defaultTimetable, fmtTime, fmtDate } from '../../lib/timetable';
import { saveTimetable, resetTimetable, updateBatchStart, setTeacherPermissions } from '../../app/schedule-actions';
import { useDialog } from '../ui/DialogProvider';
import TimetableView from './TimetableView';

// Editor used by the admin (always) and by a teacher when the admin has
// allowed it for that batch. Rows are edited as a plain list; saving
// replaces the batch's whole timetable.
export default function TimetableEditor({ batchId, title, course, rows: initial, isDefault, startDate: startInit, canEditStart, canEditRows, admin, perms }) {
  const router = useRouter();
  const { confirm } = useDialog();
  const [pending, start] = useTransition();
  const keyed = (list) => list.map((r, i) => ({ ...r, _k: `k${i}` }));
  const [rows, setRows] = useState(() => keyed(initial));
  const [base, setBase] = useState(() => keyed(initial));
  const [nextKey, setNextKey] = useState(10000);
  const [open, setOpen] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [baseStart, setBaseStart] = useState(startInit || '');
  const [startDate, setStartDate] = useState(startInit || '');
  const [flags, setFlags] = useState(perms || { start: false, timetable: false });
  const [msg, setMsg] = useState({ ok: '', err: '' });

  const say = (ok, err = '') => setMsg({ ok, err });
  const set = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const add = () => setRows((rs) => {
    const last = rs[rs.length - 1];
    setNextKey((n) => n + 1);
    return [...rs, { _k: `k${nextKey}`, week: last?.week || 1, weekday: last?.weekday || 2, starts: last?.starts || '17:00', ends: last?.ends || '19:00', topic: '', note: '' }];
  });
  const del = (i) => setRows((rs) => rs.filter((_, j) => j !== i));

  const clock = (d) => d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
  const label = (r) => `${WEEKDAYS[r.weekday] || '?'} week ${r.week}`;
  const FIELDS = [['week', 'Week', (v) => v], ['weekday', 'Day', (v) => WEEKDAYS[v]], ['starts', 'Starts', fmtTime], ['ends', 'Ends', fmtTime], ['topic', 'Topic', (v) => v || 'empty'], ['note', 'Note', (v) => v || 'none']];
  const changes = [];
  if (canEditStart && startDate !== baseStart) changes.push(['Batch start date', baseStart ? fmtDate(baseStart) : 'not set', startDate ? fmtDate(startDate) : 'not set']);
  if (canEditRows) {
    const baseBy = Object.fromEntries(base.map((r) => [r._k, r]));
    const nowKeys = new Set(rows.map((r) => r._k));
    rows.forEach((r) => {
      const b = baseBy[r._k];
      if (!b) return changes.push([`Added class`, '—', `${label(r)}, ${fmtTime(r.starts)}`]);
      FIELDS.forEach(([k, name, fmt]) => {
        if ((r[k] ?? '') !== (b[k] ?? '')) changes.push([`${label(b)} · ${name}`, String(fmt(b[k] ?? '')), String(fmt(r[k] ?? ''))]);
      });
    });
    base.forEach((b) => { if (!nowKeys.has(b._k)) changes.push([`Removed class`, `${label(b)}, ${fmtTime(b.starts)}`, '—']); });
  }
  const rowsDirty = canEditRows && JSON.stringify(rows.map(({ _k, ...r }) => r)) !== JSON.stringify(base.map(({ _k, ...r }) => r));
  const dirty = changes.length > 0;

  function undo() {
    setRows(base.map((r) => ({ ...r })));
    setStartDate(baseStart);
    say('');
  }
  function saveAll() {
    start(async () => {
      if (rowsDirty) {
        const res = await saveTimetable(batchId, rows.map(({ _k, ...r }) => r));
        if (res?.error) return say('', res.error);
        setBase(rows.map((r) => ({ ...r })));
      }
      if (canEditStart && startDate !== baseStart) {
        const res = await updateBatchStart(batchId, startDate);
        if (res?.error) return say('', res.error);
        setBaseStart(startDate);
      }
      setSavedAt(new Date());
      say('');
      router.refresh();
    });
  }
  async function reset() {
    if (!(await confirm({ title: 'Reset timetable?', message: 'This removes your saved changes and goes back to the standard schedule for this course.', confirmLabel: 'Reset', tone: 'danger' }))) return;
    start(async () => {
      const res = await resetTimetable(batchId);
      if (res?.error) return say('', res.error);
      const d = keyed(defaultTimetable(course));
      setRows(d); setBase(d);
      say('Back to the standard schedule.');
      router.refresh();
    });
  }
  function savePerms(next) {
    setFlags(next);
    start(async () => {
      const res = await setTeacherPermissions(batchId, next);
      if (res?.error) { setFlags(flags); return say('', res.error); }
      say('Teacher permissions saved.');
      router.refresh();
    });
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-lg font-extrabold text-ink">{title}</h2>
      <p className="mb-4 text-xs text-inkdim">All times are {TZ_LABEL}. {isDefault ? 'Showing the standard schedule: nothing is saved yet, so pressing Save stores it for this batch.' : 'A custom timetable is saved for this batch.'}</p>

      {(msg.ok || msg.err) && (
        <p role="status" className={`mb-4 rounded-lg border px-3 py-2 text-sm ${msg.err ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300' : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>{msg.err || msg.ok}</p>
      )}

      <div className="card mb-5 p-4">
        <p className="mb-1 text-sm font-semibold text-ink">Batch start date</p>
        <p className="mb-3 text-xs text-inkdim">The date of the first class (or any day in the first week). Class dates are worked out from it. Press Save below to keep a change.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!canEditStart || pending} className="field max-w-[12rem]" aria-label="Batch start date" />
          {!canEditStart && <span className="text-xs text-inkdim">Only the admin can change this.</span>}
        </div>
      </div>

      {admin && (
        <div className="card mb-5 p-4">
          <p className="mb-2 text-sm font-semibold text-ink">What this batch&apos;s teachers may do</p>
          {[['start', 'Edit the batch start date'], ['timetable', 'Edit the timetable (days, times, topics)']].map(([k, label]) => (
            <label key={k} className="mb-1.5 flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="accent-brand" checked={!!flags[k]} disabled={pending} onChange={(e) => savePerms({ ...flags, [k]: e.target.checked })} /> Allow teachers to {label.toLowerCase()}
            </label>
          ))}
          <p className="text-xs text-inkdim">Applies to every teacher assigned to this batch. Untick to stop them at any time.</p>
        </div>
      )}

      {canEditRows && (
        <div className="card mb-6 p-4">
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-left">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink"><Pencil className="h-4 w-4 text-brand" /> Edit timetable <span className="text-xs font-normal text-inkdim">({rows.length} classes)</span></span>
            <ChevronDown className={`h-4 w-4 text-inkdim transition ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (<div className="mt-4">
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="card p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <label className="block text-xs text-inkdim">Week
                    <input type="number" min={1} max={52} value={r.week} onChange={(e) => set(i, 'week', Number(e.target.value))} className="field mt-1" />
                  </label>
                  <label className="block text-xs text-inkdim">Day
                    <select value={r.weekday} onChange={(e) => set(i, 'weekday', Number(e.target.value))} className="field mt-1">
                      {WEEKDAYS.map((d, n) => n ? <option key={n} value={n}>{d}</option> : null)}
                    </select>
                  </label>
                  <label className="block text-xs text-inkdim">Starts
                    <input type="time" value={r.starts} onChange={(e) => set(i, 'starts', e.target.value)} className="field mt-1" />
                  </label>
                  <label className="block text-xs text-inkdim">Ends
                    <input type="time" value={r.ends} onChange={(e) => set(i, 'ends', e.target.value)} className="field mt-1" />
                  </label>
                  <div className="col-span-2 flex items-end sm:col-span-1">
                    <button type="button" onClick={() => del(i)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                  </div>
                </div>
                <label className="mt-2 block text-xs text-inkdim">Topic
                  <input value={r.topic} maxLength={200} onChange={(e) => set(i, 'topic', e.target.value)} className="field mt-1" />
                </label>
                <label className="mt-2 block text-xs text-inkdim">Note (optional)
                  <input value={r.note || ''} maxLength={300} onChange={(e) => set(i, 'note', e.target.value)} className="field mt-1" />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={add} className="cta-btn-outline"><Plus className="h-4 w-4" /> Add a class</button>
            <button type="button" onClick={reset} disabled={pending} className="cta-btn-outline"><Undo2 className="h-4 w-4" /> Reset to standard</button>
          </div>
          <p className="mt-2 text-xs text-inkdim">Classes are sorted by week, day and time when saved.</p>
          </div>)}
        </div>
      )}

      {(canEditRows || canEditStart) && (<>
        {dirty && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs" aria-live="polite">
            <p className="mb-2 font-semibold uppercase tracking-wide text-amber-800">{changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}</p>
            <ul className="space-y-1">
              {changes.map(([lab, from, to], i) => (
                <li key={i} className="flex flex-wrap items-center gap-1.5 text-ink">
                  <span className="text-inkdim sm:w-48">{lab}</span>
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 line-through">{from}</span>
                  <ArrowRight className="h-3 w-3 text-inkdim" />
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">{to}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={saveAll} disabled={pending || !dirty} className="cta-btn !px-5 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {pending ? 'Saving\u2026' : 'Save'}
          </button>
          {dirty && !pending && <button type="button" onClick={undo} className="cta-btn-outline !px-4 !py-2 text-sm"><Undo2 className="h-4 w-4" /> Undo changes</button>}
          <p className="text-sm" role="status" aria-live="polite">
            {pending ? <span className="text-inkdim">Saving&hellip;</span>
              : dirty ? <span className="font-medium text-amber-700">Unsaved changes</span>
              : savedAt ? <span className="font-medium text-emerald-600">Saved at {clock(savedAt)}</span>
              : <span className="text-inkdim">No changes yet</span>}
          </p>
        </div>
      </>)}

      <p className="mb-2 text-sm font-semibold text-ink">{canEditRows ? 'Saved timetable' : 'Timetable'}</p>
      <TimetableView rows={base} isDefault={false} startDate={baseStart || null} title={title} />
    </div>
  );
}
