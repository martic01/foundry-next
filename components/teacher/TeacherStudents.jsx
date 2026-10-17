'use client';

import { useState } from 'react';
import SearchBox, { matchesQuery } from '../ui/SearchBox';
import { ReportButton } from '../admin/content-shared';

// The teacher's students, grouped by batch, with a search box that works
// across every batch. Each student has a Report button that sends a note
// to the admin (the teacher can't block or remove students themselves).
// `batches`: [{ id, label, course, capacity, students: [{ id, name }] }]
export default function TeacherStudents({ batches }) {
  const [q, setQ] = useState('');
  const total = batches.reduce((n, b) => n + b.students.length, 0);
  const groups = batches
    .map((b) => ({ ...b, shown: b.students.filter((s) => matchesQuery(q, s.name)) }))
    .filter((b) => !q.trim() || b.shown.length);

  return (
    <div>
      {total > 0 && <SearchBox value={q} onChange={setQ} placeholder="Search your students by name" label="Search students" className="mb-5" />}
      {!groups.length && <p className="text-sm text-inkdim">No student matches “{q}”.</p>}
      <div className="flex flex-col gap-6">
        {groups.map((b) => (
          <section key={b.id} className="card p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-ink">
                {b.label} <span className="text-sm font-normal text-inkdim">· {b.course}</span>
              </h2>
              <span className="text-xs text-inkdim">
                {q.trim() ? `${b.shown.length} of ` : ''}
                {b.students.length}/{b.capacity} students
              </span>
            </div>
            {!b.students.length ? (
              <p className="text-sm text-inkdim">No students in this batch yet.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-line">
                {b.shown.map((s, i) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm text-ink">
                    <span className="flex gap-2">
                      <span className="w-6 text-right text-xs text-inkdim">{i + 1}.</span> {s.name}
                    </span>
                    <span className="max-w-full sm:w-72">
                      <ReportButton kind="student" itemId={s.id} />
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
