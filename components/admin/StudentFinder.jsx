'use client';

import { useMemo, useState } from 'react';
import SearchBox, { matchesQuery } from '../ui/SearchBox';
import BatchStudentRow from './BatchStudentRow';
import BulkMoveBar from './BulkMoveBar';
import { useSelection } from './useSelection';

const MAX = 30;

// "Find a student anywhere": type a name or email, tick the people you
// want, then act on them (move in bulk, or use each row's own buttons)
// without opening every batch. `students` is everyone enrolled, each with
// a `batchLabel`; `batchChoicesByCourse[course]` lists that course's batches.
export default function StudentFinder({ students, batchChoicesByCourse }) {
  const [q, setQ] = useState('');
  const sel = useSelection();
  const query = q.trim();

  const matches = useMemo(
    () => (query.length < 2 ? [] : students.filter((s) => matchesQuery(query, s.fullName, s.email, s.batchLabel))),
    [students, query]
  );
  const shown = matches.slice(0, MAX);
  const selected = students.filter((s) => sel.has(s.registrationId));
  const choicesFor = (course) => batchChoicesByCourse[course] || [];

  return (
    <section className="card mb-8 p-5">
      <h2 className="mb-1 font-display text-base font-extrabold text-ink">Find a student</h2>
      <p className="mb-3 text-xs text-inkdim">Search across every batch by name, email or batch, then tick students to move them together.</p>
      <SearchBox value={q} onChange={setQ} placeholder="Type at least 2 letters of a name or email" label="Find a student in any batch" />
      {query.length >= 2 && (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-inkdim">
            <span>
              {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              {matches.length > MAX ? ` — showing the first ${MAX}, narrow the search to see the rest` : ''}
            </span>
            {!!shown.length && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={shown.every((s) => sel.has(s.registrationId))}
                  onChange={(e) => (e.target.checked ? sel.setAll([...sel.ids, ...shown.map((s) => s.registrationId)]) : sel.setAll([...sel.ids].filter((id) => !shown.some((s) => s.registrationId === id))))}
                />
                Select all shown
              </label>
            )}
          </div>
          <BulkMoveBar selected={selected} choicesFor={choicesFor} onClear={sel.clear} />
          {!shown.length ? (
            <p className="rounded-lg border border-line p-3 text-sm text-inkdim">No student matches “{query}”.</p>
          ) : (
            <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
              {shown.map((s) => (
                <div key={s.registrationId}>
                  <p className="px-3 pt-2 text-[11px] font-medium uppercase tracking-wide text-inkdim">{s.batchLabel}</p>
                  <BatchStudentRow
                    student={s}
                    otherBatches={choicesFor(s.course).filter((b) => b.id !== s.batchId)}
                    selected={sel.has(s.registrationId)}
                    onToggle={sel.toggle}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
