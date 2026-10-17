'use client';

import BatchStudentRow from './BatchStudentRow';
import BulkMoveBar from './BulkMoveBar';
import { useSelection } from './useSelection';
import SearchBox, { matchesQuery } from '../ui/SearchBox';
import { useState } from 'react';

// Paid students who have no batch (e.g. batch assignment failed at
// payment time). Same actions as inside a batch, so they can be placed.
export default function UnassignedStudents({ students, batchChoicesByCourse }) {
  const sel = useSelection();
  const [q, setQ] = useState('');
  const shown = students.filter((s) => matchesQuery(q, s.fullName, s.email));
  return (
    <section className="mb-10 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-500/40 dark:bg-amber-500/10">
      <h2 className="mb-1 font-display text-base font-extrabold text-ink">Unassigned students ({students.length})</h2>
      <p className="mb-3 text-xs text-inkdim">Paid, but not in any batch. Use “Move to…” to place them.</p>
      {students.length > 3 && <SearchBox value={q} onChange={setQ} placeholder="Search unassigned students" className="mb-2" />}
      <BulkMoveBar
        selected={students.filter((s) => sel.has(s.registrationId))}
        choicesFor={(course) => batchChoicesByCourse[course] || []}
        onClear={sel.clear}
      />
      <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
        {!shown.length && <p className="p-3 text-sm text-inkdim">No one matches “{q}”.</p>}
        {shown.map((s) => (
          <BatchStudentRow key={s.registrationId} student={s} otherBatches={batchChoicesByCourse[s.course] || []} selected={sel.has(s.registrationId)} onToggle={sel.toggle} />
        ))}
      </div>
    </section>
  );
}
