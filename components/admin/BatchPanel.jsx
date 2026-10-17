'use client';

import { useState, useTransition } from 'react';
import { Play, Pause, RotateCcw, Square, Pencil, Check, ChevronDown, ChevronUp, Presentation, X, UserPlus } from 'lucide-react';
import { updateBatchDetails, batchTimerAction, assignTeacherToBatch } from '../../app/admin/actions';
import { getTimerState } from '../../lib/batch-timer';
import { PAYMENT_STATUSES } from '../../lib/payments';
import { StatusPill, CountdownBoxes, useServerClock } from '../BatchTimer';
import BatchStudentRow from './BatchStudentRow';
import BulkMoveBar from './BulkMoveBar';
import { useSelection } from './useSelection';
import { useDialog } from '../ui/DialogProvider';
import SearchBox, { matchesQuery } from '../ui/SearchBox';

// One batch: rename it, set its start date, run its 9-week clock, and
// manage the students in it. Announcements, class links and videos for a
// batch are managed on the Content page, where each can be aimed at one
// batch or all of them.
export default function BatchPanel({ batch, students, otherBatches, serverNow, teachers = [], teacherIds = [] }) {
  const [label, setLabel] = useState(batch.label);
  const [startDate, setStartDate] = useState(batch.start_date || '');
  const [capacity, setCapacity] = useState(String(batch.capacity));
  const [autoAssign, setAutoAssign] = useState(batch.auto_assign !== false);
  const [editing, setEditing] = useState(false);
  const [showStudents, setShowStudents] = useState(true);
  const [payFilter, setPayFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const sel = useSelection();
  const [status, setStatus] = useState({ text: '', kind: '' });

  const { confirm } = useDialog();
  const assigned = teachers.filter((t) => teacherIds.includes(t.id));
  const available = teachers.filter((t) => !teacherIds.includes(t.id));
  const now = useServerClock(serverNow);
  const timer = getTimerState(batch, now);

  function run(action, ...args) {
    startTransition(async () => {
      const res = await action(...args);
      setStatus(res?.error ? { text: res.error, kind: 'error' } : { text: '', kind: '' });
      return res;
    });
  }

  function saveDetails() {
    startTransition(async () => {
      const res = await updateBatchDetails(batch.id, { label, startDate, capacity: Number(capacity), autoAssign });
      if (res?.error) {
        setStatus({ text: res.error, kind: 'error' });
      } else {
        setStatus({ text: '', kind: '' });
        setEditing(false);
      }
    });
  }

  // Start / pause / resume are reversible and run straight away.
  // Restart and End throw away or finalise progress, so they ask first.
  const TIMER_CONFIRMS = {
    restart: {
      title: 'Restart the timer?',
      message: `The 9-week countdown for ${batch.label} starts again from the beginning.`,
      confirmLabel: 'Restart'
    },
    end: {
      title: 'End class for this batch?',
      message: `Students in ${batch.label} will see the class as ended.`,
      confirmLabel: 'End class',
      tone: 'danger'
    }
  };

  async function confirmTimer(action) {
    const ask = TIMER_CONFIRMS[action];
    if (ask && !(await confirm(ask))) return;
    run(batchTimerAction, batch.id, action);
  }

  // Payment breakdown for THIS batch -- the counts double as filter
  // chips for the student list below. Only states someone is actually in
  // are offered, so a batch where everyone paid just shows "All".
  const payCounts = Object.keys(PAYMENT_STATUSES).reduce((acc, k) => {
    acc[k] = students.filter((s) => s.payment?.status === k).length;
    return acc;
  }, {});
  const shownStudents = students.filter(
    (s) => (payFilter === 'all' || s.payment?.status === payFilter) && matchesQuery(query, s.fullName, s.email)
  );
  const narrowed = payFilter !== 'all' || query.trim() !== '';

  const btn =
    'inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium transition disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className="card p-6">
      {/* Header: name + start date (editable), seat count */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        {editing ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Batch name (students see this)</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} className="field" disabled={isPending} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Course starts</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field" disabled={isPending} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Seats (max 50)</span>
              <input type="number" min={1} max={50} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="field !w-24" disabled={isPending} />
            </label>
            <label className="flex items-center gap-2 pb-2 text-xs text-inkdim">
              <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} disabled={isPending} />
              Fill automatically
            </label>
            <div className="flex gap-2">
              <button onClick={saveDetails} disabled={isPending || !label.trim()} className="cta-btn !px-4 !py-2 text-xs">
                <Check className="h-3.5 w-3.5" /> Save
              </button>
              <button
                onClick={() => {
                  setLabel(batch.label);
                  setStartDate(batch.start_date || '');
                  setCapacity(String(batch.capacity));
                  setAutoAssign(batch.auto_assign !== false);
                  setEditing(false);
                }}
                disabled={isPending}
                className="cta-btn-outline !px-4 !py-2 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-lg font-semibold text-ink">{batch.label}</p>
              <button
                onClick={() => setEditing(true)}
                className="rounded-md border border-line p-1.5 text-inkdim hover:border-brand/40 hover:text-brand"
                aria-label="Edit batch name and start date"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-inkdim">
              {students.length}/{batch.capacity} students{students.length >= batch.capacity ? ' \u00b7 Full' : ''}{batch.auto_assign === false ? ' \u00b7 Manual only (not filled automatically)' : ''}
              {batch.start_date ? ` \u00b7 Course starts ${new Date(`${batch.start_date}T12:00:00Z`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}` : ' \u00b7 No start date set'}
            </p>
          </div>
        )}
      </div>

      {/* Teachers */}
      <div className="mb-5 rounded-lg border border-line bg-surfaceMuted p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">Teachers</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand" title="The admin is in every batch but is not counted as a student">
            Admin · every batch
          </span>
          {assigned.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pl-2.5 pr-1 text-xs font-medium text-ink">
              <Presentation className="h-3 w-3 text-brand" /> {t.full_name}
              <button
                type="button"
                onClick={() => run(assignTeacherToBatch, batch.id, t.id, false)}
                disabled={isPending}
                aria-label={`Remove ${t.full_name} from this batch`}
                className="rounded-full p-0.5 text-inkdim hover:bg-surfaceMuted hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {!assigned.length && <span className="text-xs text-inkdim">No teacher assigned yet.</span>}
          {!!available.length && (
            <label className="inline-flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-inkdim" />
              <select
                value=""
                onChange={(e) => e.target.value && run(assignTeacherToBatch, batch.id, e.target.value, true)}
                disabled={isPending}
                className="field !w-auto !py-1 text-xs"
                aria-label="Assign a teacher to this batch"
              >
                <option value="">Assign a teacher&hellip;</option>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* Class timer */}
      <div className="mb-5 rounded-lg border border-line bg-surfaceMuted p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-inkdim">Class timer · 9 weeks</p>
            <StatusPill status={timer.status} />
          </div>
        </div>

        {(timer.status === 'running' || timer.status === 'paused') && (
          <div className="mb-3">
            <CountdownBoxes seconds={timer.remainingSeconds} dim={timer.status === 'paused'} size="sm" />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {timer.status === 'not_started' && (
            <button onClick={() => confirmTimer('start')} disabled={isPending} className="cta-btn !px-4 !py-2 text-xs">
              <Play className="h-3.5 w-3.5" /> Start batch
            </button>
          )}
          {timer.status === 'running' && (
            <button onClick={() => confirmTimer('pause')} disabled={isPending} className={`${btn} hover:border-amber-400 hover:text-amber-600`}>
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}
          {timer.status === 'paused' && (
            <button onClick={() => confirmTimer('resume')} disabled={isPending} className="cta-btn !px-4 !py-2 text-xs">
              <Play className="h-3.5 w-3.5" /> Resume
            </button>
          )}
          {timer.status !== 'not_started' && (
            <button
              onClick={() => confirmTimer('restart')}
              disabled={isPending}
              className={`${btn} hover:border-brand/40 hover:text-brand`}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </button>
          )}
          {(timer.status === 'running' || timer.status === 'paused') && (
            <button
              onClick={() => confirmTimer('end')}
              disabled={isPending}
              className={`${btn} hover:border-red-300 hover:text-red-600`}
            >
              <Square className="h-3.5 w-3.5" /> End
            </button>
          )}
        </div>
      </div>

      {/* Students */}
      <div>
        <button
          onClick={() => setShowStudents((v) => !v)}
          className="mb-2 flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-inkdim hover:text-ink"
        >
          <span>Students ({students.length})</span>
          {showStudents ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showStudents && students.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter students by payment status">
            {[['all', 'All', students.length], ...Object.entries(PAYMENT_STATUSES).filter(([k]) => payCounts[k] > 0).map(([k, v]) => [k, v.label, payCounts[k]])].map(
              ([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPayFilter(key)}
                  aria-pressed={payFilter === key}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                    payFilter === key ? 'border-brand bg-brand/10 text-ink' : 'border-line text-inkdim hover:text-ink'
                  }`}
                >
                  {label} ({count})
                </button>
              )
            )}
          </div>
        )}
        {showStudents && students.length > 0 && (
          <SearchBox value={query} onChange={setQuery} placeholder="Search this batch by name or email" label="Search students in this batch" className="mb-2" />
        )}
        {showStudents && !!shownStudents.length && (
          <label className="mb-2 flex w-fit items-center gap-2 text-xs text-inkdim">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={shownStudents.every((s) => sel.has(s.registrationId))}
              onChange={(e) => (e.target.checked ? sel.setAll([...sel.ids, ...shownStudents.map((s) => s.registrationId)]) : sel.setAll([...sel.ids].filter((id) => !shownStudents.some((s) => s.registrationId === id))))}
            />
            Select all{narrowed ? ' shown' : ''}
          </label>
        )}
        {showStudents && (
          <BulkMoveBar
            selected={students.filter((s) => sel.has(s.registrationId))}
            choicesFor={() => otherBatches}
            onClear={sel.clear}
          />
        )}
        {showStudents && (
          <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
            {shownStudents.map((s) => (
              <BatchStudentRow key={s.registrationId} student={s} otherBatches={otherBatches} selected={sel.has(s.registrationId)} onToggle={sel.toggle} />
            ))}
            {!students.length && <p className="p-3 text-sm text-inkdim">No students in this batch yet.</p>}
            {!!students.length && !shownStudents.length && <p className="p-3 text-sm text-inkdim">No one in this batch matches that filter.</p>}
          </div>
        )}
      </div>

      {status.text && <p className="mt-3 text-sm text-red-600">{status.text}</p>}
    </div>
  );
}
