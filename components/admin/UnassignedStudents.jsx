'use client';

import BatchStudentRow from './BatchStudentRow';
import BulkMoveBar from './BulkMoveBar';
import { useSelection } from './useSelection';

// Paid students who have no batch (e.g. batch assignment failed at
// payment time). Same actions as inside a batch, so they can be placed.
export default function UnassignedStudents({ students, batchChoicesByCourse }) {
  const sel = useSelection();
  return (
    <section className="mb-10 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-500/40 dark:bg-amber-500/10">
      <h2 className="mb-1 font-display text-base font-extrabold text-ink">Unassigned students ({students.length})</h2>
      <p className="mb-3 text-xs text-inkdim">Paid, but not in any batch. Use “Move to…” to place them.</p>
      <BulkMoveBar
        selected={students.filter((s) => sel.has(s.registrationId))}
        choicesFor={(course) => batchChoicesByCourse[course] || []}
        onClear={sel.clear}
      />
      <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
        {students.map((s) => (
          <BatchStudentRow key={s.registrationId} student={s} otherBatches={batchChoicesByCourse[s.course] || []} selected={sel.has(s.registrationId)} onToggle={sel.toggle} />
        ))}
      </div>
    </section>
  );
}
