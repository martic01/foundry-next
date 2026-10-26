'use client';

import { useMemo, useState, useTransition } from 'react';
import { Trash2, Search } from 'lucide-react';
import { setBlocked, adminDeleteStudent, moveStudentToBatch, setRegistrationBlocked, removeFromBatch, deleteRegistration } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';
import SourceBadge from './SourceBadge';
import PaymentChip from './PaymentChip';
import { PAYMENT_STATUSES, REGISTRATION_SOURCES } from '../../lib/payments';

export default function StudentsTable({ students, batchChoicesByCourse = {} }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState('');
  const { confirm, alert } = useDialog();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [pay, setPay] = useState('all'); // payment-status filter
  const [src, setSrc] = useState('all'); // Manual / Paystack filter

  function toggleBlocked(profileId, blocked) {
    startTransition(async () => {
      const res = await setBlocked(profileId, blocked);
      setStatus(res?.error ? res.error : '');
    });
  }

  async function handleDelete(profileId, fullName) {
    // Deliberate confirmation: this permanently deletes the account
    // (auth + profile + every registration tied to it), not a soft block
    // or a batch removal -- there's no undo.
    const ok = await confirm({
      title: `Delete ${fullName || 'this student'} permanently?`,
      message: 'Their account and everything tied to it will be erased. This cannot be undone.',
      confirmLabel: 'Delete permanently',
      tone: 'danger'
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await adminDeleteStudent(profileId);
      setStatus(res?.error ? res.error : '');
    });
  }

  // Change which batch (and therefore which teacher(s)) a student is in.
  // Same course only -- the server enforces it too, and refuses a full batch.
  async function handleMove(student, course, targetId) {
    const target = (batchChoicesByCourse[course.courseKey] || []).find((b) => b.id === targetId);
    if (!target || targetId === course.batchId) return;
    const ok = await confirm({
      title: `Move ${student.full_name || 'this student'}?`,
      message: `They switch to ${target.label}${target.teachers.length ? ` (taught by ${target.teachers.join(', ')})` : ' (no teacher assigned yet)'}. Their class links, videos and announcements change to that batch.`,
      confirmLabel: 'Move student'
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await moveStudentToBatch(course.registrationId, targetId);
      if (res?.error) await alert({ title: 'Couldn\u2019t move them', message: res.error, tone: 'error' });
    });
  }

  // Per-course actions: only this course/batch, never the account.
  async function courseAction(student, course, kind) {
    const where = course.label;
    const ask = {
      remove: { title: `Remove ${student.full_name || 'this student'} from ${where}?`, message: 'They lose access to this course only. Their account, other courses and the payment record are kept.', confirmLabel: 'Remove', tone: 'danger' },
      delete: { title: `Delete the ${where} registration?`, message: 'Erases only this course registration and its payment record. Their account and other courses stay. This cannot be undone.', confirmLabel: 'Delete registration', tone: 'danger' }
    }[kind];
    if (ask && !(await confirm(ask))) return;
    startTransition(async () => {
      const res =
        kind === 'block' ? await setRegistrationBlocked(course.registrationId, !course.blocked)
        : kind === 'remove' ? await removeFromBatch(course.registrationId)
        : await deleteRegistration(course.registrationId);
      if (res?.error) await alert({ title: 'Couldn\u2019t do that', message: res.error, tone: 'error' });
    });
  }

  // A student matches when ONE of their registrations satisfies every
  // active filter together -- so "Paid" + "Manual" means a registration
  // that is both, not "something paid and something manual".
  const regMatches = (c) =>
    (pay === 'all' || c.payment?.status === pay) && (src === 'all' || c.source === src);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = students.filter((s) => {
      if (q && !`${s.full_name || ''} ${s.google_name || ''} ${s.email || ''}`.toLowerCase().includes(q)) return false;
      if (pay === 'all' && src === 'all') return true; // incl. students with no registration yet
      return s.courses.some(regMatches);
    });
    // The list is every student in the school, alphabetical -- a student you
    // just added can be far down it. Search finds them in one keystroke, and
    // "Newest first" puts the latest additions at the top.
    return sort === 'newest'
      ? [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      : filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, query, sort, pay, src]);

  // Counts for the filter chips: how many STUDENTS have at least one
  // registration in each payment state (a student can appear in several).
  const payCounts = useMemo(() => {
    const counts = { all: students.length };
    Object.keys(PAYMENT_STATUSES).forEach((k) => {
      counts[k] = students.filter((s) => s.courses.some((c) => c.payment?.status === k)).length;
    });
    return counts;
  }, [students]);

  const registrationFilterOn = pay !== 'all' || src !== 'all';
  const filtersActive = registrationFilterOn || query.trim() !== '';

  if (!students.length) {
    return <p className="p-4 text-sm text-inkdim">No students yet.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search students</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkdim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="field !pl-9"
          />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="field !w-auto" aria-label="Sort students">
          <option value="name">Sort: Name (A–Z)</option>
          <option value="newest">Sort: Newest first</option>
        </select>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by payment status">
        <span className="text-xs font-medium uppercase tracking-wide text-inkdim">Payment</span>
        {[['all', 'All'], ...Object.entries(PAYMENT_STATUSES).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPay(key)}
            aria-pressed={pay === key}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              pay === key ? 'border-brand bg-brand/10 text-ink' : 'border-line text-inkdim hover:text-ink'
            }`}
          >
            {label} <span className="text-inkdim">({payCounts[key]})</span>
          </button>
        ))}
        <select value={src} onChange={(e) => setSrc(e.target.value)} className="field !w-auto !py-1 text-xs" aria-label="Filter by how they registered">
          <option value="all">Registered: any way</option>
          {Object.entries(REGISTRATION_SOURCES).map(([k, v]) => (
            <option key={k} value={k}>
              Registered: {v.label}
            </option>
          ))}
        </select>
      </div>
      {filtersActive && (
        <p className="mb-2 text-xs text-inkdim">
          {visible.length} of {students.length} match{' '}
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setPay('all');
              setSrc('all');
            }}
            className="font-medium text-brand hover:underline"
          >
            Clear filters
          </button>
        </p>
      )}
      {!visible.length && (
        <p className="p-4 text-sm text-inkdim">{query ? `No student matches \u201c${query}\u201d.` : 'No student matches these filters.'}</p>
      )}
      <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
        {visible.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-ink">{s.full_name || 'Unnamed'}</p>
                {s.google_name && s.google_name !== s.full_name && <span className="truncate text-xs text-inkdim">Gmail: {s.google_name}</span>}
                {s.blocked && (
                  <span className="flex-shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                    Blocked
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-inkdim">{s.email}</p>
              {s.courses.length ? (
                <ul className="mt-1 flex flex-col gap-1">
                  {s.courses.map((c) => (
                    <li
                      key={c.registrationId || c.label}
                      className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-inkdim ${
                        registrationFilterOn && !regMatches(c) ? 'opacity-40' : ''
                      }`}
                    >
                      <span className="truncate">{c.label}</span>
                      <SourceBadge source={c.source} />
                      <PaymentChip payment={c.payment} />
                      {c.payment?.detail && <span>{c.payment.detail}</span>}
                      <span className="flex basis-full flex-wrap items-center gap-2 pl-0.5">
                        <label className="inline-flex items-center gap-1.5">
                          <span className="text-[11px] font-medium uppercase tracking-wide">Batch</span>
                          <select
                            value={c.batchId || ''}
                            onChange={(e) => handleMove(s, c, e.target.value)}
                            disabled={isPending}
                            className="field !w-auto !py-0.5 text-xs"
                            aria-label={`Batch for ${s.full_name || 'student'} in ${c.label}`}
                          >
                            {!c.batchId && <option value="">Unassigned</option>}
                            {(batchChoicesByCourse[c.courseKey] || []).map((b) => (
                              <option key={b.id} value={b.id} disabled={b.id !== c.batchId && b.count >= b.capacity}>
                                {b.label} ({b.count}/{b.capacity}{b.id !== c.batchId && b.count >= b.capacity ? ' full' : ''})
                              </option>
                            ))}
                          </select>
                        </label>
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {c.blocked && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">Blocked here</span>}
                          <button type="button" disabled={isPending} onClick={() => courseAction(s, c, 'block')} className="rounded-md border border-line px-2 py-0.5 text-[11px] hover:border-red-300 hover:text-red-600" title="Only this course">
                            {c.blocked ? 'Unblock here' : 'Block here'}
                          </button>
                          {c.batchId && (
                            <button type="button" disabled={isPending} onClick={() => courseAction(s, c, 'remove')} className="rounded-md border border-line px-2 py-0.5 text-[11px] hover:border-red-300 hover:text-red-600" title="Only this course">
                              Remove
                            </button>
                          )}
                          <button type="button" disabled={isPending} onClick={() => courseAction(s, c, 'delete')} className="rounded-md border border-line px-2 py-0.5 text-[11px] hover:border-red-300 hover:text-red-600" title="Delete this course registration only">
                            Delete
                          </button>
                        </span>
                        <span className="text-[11px]">
                          Teacher: {c.teachers.length ? <span className="font-medium text-ink">{c.teachers.join(', ')}</span> : 'none assigned'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 truncate text-xs text-inkdim">No paid courses yet</p>
              )}
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                onClick={() => toggleBlocked(s.id, !s.blocked)}
                disabled={isPending}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-inkdim hover:border-red-300 hover:text-red-600"
              >
                {s.blocked ? 'Unblock account' : 'Block account'}
              </button>
              <button
                onClick={() => handleDelete(s.id, s.full_name)}
                disabled={isPending}
                className="rounded-md border border-line p-1.5 text-inkdim hover:border-red-300 hover:text-red-600"
                aria-label="Delete student account (all courses)"
                title="Delete the whole account and every course"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {status && <p className="mt-3 text-sm text-red-600">{status}</p>}
    </div>
  );
}
