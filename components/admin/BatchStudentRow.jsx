'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { removeFromBatch, setRegistrationBlocked, moveStudentToBatch, deleteRegistration } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';
import SourceBadge from './SourceBadge';
import PaymentChip from './PaymentChip';

// One student inside a batch (or in the "unassigned" list). Every button
// here affects ONLY this course/batch -- block them here, move them,
// remove them from it, or delete this registration -- never their account
// or their other courses (account-wide block/delete live on the Students page). `otherBatches` is already limited to
// the same course by the page: [{ id, label, count, capacity }].
export default function BatchStudentRow({ student: s, otherBatches, selected, onToggle }) {
  const [isPending, startTransition] = useTransition();
  const { confirm, alert } = useDialog();

  // Errors pop up as a dialog rather than a line at the bottom of the
  // panel -- with up to 50 rows, an inline message is easy to miss.
  function run(action, ...args) {
    startTransition(async () => {
      const res = await action(...args);
      if (res?.error) await alert({ title: 'Couldn\u2019t do that', message: res.error, tone: 'error' });
    });
  }

  async function handleMove(e) {
    const select = e.target;
    const targetId = select.value;
    select.value = '';
    if (!targetId) return;
    const target = otherBatches.find((b) => b.id === targetId);
    const ok = await confirm({
      title: `Move ${s.fullName}?`,
      message: `They will switch to ${target?.label}. Their class links, videos and announcements change to that batch.`,
      confirmLabel: 'Move student'
    });
    if (ok) run(moveStudentToBatch, s.registrationId, targetId);
  }

  async function handleRemove() {
    const ok = await confirm({
      title: `Remove ${s.fullName} from ${s.batchLabel || 'this batch'}?`,
      message: 'They lose access to this course only. Their account, any other course and the payment record are kept.',
      confirmLabel: 'Remove',
      tone: 'danger'
    });
    if (ok) run(removeFromBatch, s.registrationId);
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${s.fullName}\u2019s registration for this course?`,
      message: 'This erases only this course registration and its payment record. Their account and other courses stay. This cannot be undone.',
      confirmLabel: 'Delete registration',
      tone: 'danger'
    });
    if (ok) run(deleteRegistration, s.registrationId);
  }

  const small = 'rounded-md border border-line px-2.5 py-1 text-xs text-inkdim transition hover:border-red-300 hover:text-red-600 disabled:opacity-40';

  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {onToggle && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggle(s.registrationId)}
            className="mt-1 h-4 w-4 flex-shrink-0"
            aria-label={`Select ${s.fullName}`}
          />
        )}
        <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-ink">{s.fullName}</p>
          <SourceBadge source={s.source} />
          <PaymentChip payment={s.payment} />
          {s.regBlocked && (
            <span className="flex-shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
              Blocked here
            </span>
          )}
          {s.blocked && (
            <span className="flex-shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600" title="Their whole account is blocked (Students page)">
              Account blocked
            </span>
          )}
        </div>
        <p className="truncate text-xs text-inkdim">
          {s.email} · Age {s.age}
          {s.payment?.detail ? ` \u00b7 ${s.payment.detail}` : ''}
        </p>
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
        <select
          defaultValue=""
          onChange={handleMove}
          disabled={isPending || !otherBatches.length}
          className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-inkdim"
          aria-label={`Move ${s.fullName} to another batch`}
        >
          <option value="">{otherBatches.length ? 'Move to…' : 'No other batch'}</option>
          {otherBatches.map((b) => (
            <option key={b.id} value={b.id} disabled={b.count >= b.capacity}>
              {b.label} ({b.count}/{b.capacity}{b.count >= b.capacity ? ' · full' : ''})
            </option>
          ))}
        </select>
        <button onClick={() => run(setRegistrationBlocked, s.registrationId, !s.regBlocked)} disabled={isPending} className={small} title="Only affects this course">
          {s.regBlocked ? 'Unblock here' : 'Block here'}
        </button>
        {s.batchId && (
          <button onClick={handleRemove} disabled={isPending} className={small} title="Only affects this course">
            Remove
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-md border border-line p-1.5 text-inkdim transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
          aria-label={`Delete ${s.fullName}'s registration for this course`}
          title="Delete this course registration only"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
