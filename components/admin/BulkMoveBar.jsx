'use client';

import { useState, useTransition } from 'react';
import { MoveRight, X } from 'lucide-react';
import { moveStudentsToBatch } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';

// Appears while students are ticked. They all have to be on the same
// course (a batch belongs to one course); the target list is that
// course's other batches. `choicesFor(course)` -> [{ id, label, count, capacity }].
export default function BulkMoveBar({ selected, choicesFor, onClear }) {
  const [target, setTarget] = useState('');
  const [isPending, startTransition] = useTransition();
  const { confirm, alert } = useDialog();

  if (!selected.length) return null;

  const courses = [...new Set(selected.map((s) => s.course))];
  const mixed = courses.length > 1;
  const options = mixed ? [] : (choicesFor(courses[0]) || []);
  const chosen = options.find((b) => b.id === target);
  const free = chosen ? chosen.capacity - chosen.count : 0;

  async function go() {
    if (!chosen) return;
    const ok = await confirm({
      title: `Move ${selected.length} ${selected.length === 1 ? 'student' : 'students'}?`,
      message: `They all switch to ${chosen.label}. Their class links, videos and announcements change to that batch.`,
      confirmLabel: 'Move students'
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await moveStudentsToBatch(selected.map((s) => s.registrationId), chosen.id);
      if (res?.error) {
        await alert({ title: 'Couldn’t move them', message: res.error, tone: 'error' });
        return;
      }
      setTarget('');
      onClear();
    });
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-brand/40 bg-brand/10 p-2.5 text-xs">
      <span className="font-semibold text-ink">{selected.length} selected</span>
      {mixed ? (
        <span className="text-inkdim">Pick students from one course at a time to move them together.</span>
      ) : (
        <>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={isPending || !options.length}
            className="field !w-auto !py-1 text-xs"
            aria-label="Move the selected students to this batch"
          >
            <option value="">{options.length ? 'Move selected to…' : 'No other batch for this course'}</option>
            {options.map((b) => (
              <option key={b.id} value={b.id} disabled={b.count >= b.capacity}>
                {b.label} ({b.count}/{b.capacity}{b.count >= b.capacity ? ' · full' : ''})
              </option>
            ))}
          </select>
          <button type="button" onClick={go} disabled={isPending || !chosen} className="cta-btn !px-3 !py-1.5 text-xs">
            <MoveRight className="h-3.5 w-3.5" /> Move
          </button>
          {chosen && selected.length > free && <span className="text-red-600">Only {free} free {free === 1 ? 'seat' : 'seats'} there.</span>}
        </>
      )}
      <button type="button" onClick={onClear} disabled={isPending} className="ml-auto inline-flex items-center gap-1 text-inkdim hover:text-ink">
        <X className="h-3.5 w-3.5" /> Clear
      </button>
    </div>
  );
}
