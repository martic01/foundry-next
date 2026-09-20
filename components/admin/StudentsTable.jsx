'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { setBlocked, adminDeleteStudent } from '../../app/admin/actions';

export default function StudentsTable({ students }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState('');

  function toggleBlocked(profileId, blocked) {
    startTransition(async () => {
      const res = await setBlocked(profileId, blocked);
      setStatus(res?.error ? res.error : '');
    });
  }

  function handleDelete(profileId, fullName) {
    // A plain confirm() is a deliberately minimal safeguard here, but a
    // real one: this permanently deletes the account (auth + profile +
    // every registration tied to it), not a soft block or a batch
    // removal -- there's no undo.
    if (!window.confirm(`Permanently delete ${fullName || 'this student'}'s account? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const res = await adminDeleteStudent(profileId);
      setStatus(res?.error ? res.error : '');
    });
  }

  if (!students.length) {
    return <p className="p-4 text-sm text-inkdim">No students yet.</p>;
  }

  return (
    <div>
      <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
        {students.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-ink">{s.full_name || 'Unnamed'}</p>
                {s.blocked && (
                  <span className="flex-shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                    Blocked
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-inkdim">{s.email}</p>
              <p className="mt-0.5 truncate text-xs text-inkdim">
                {s.courses.length ? s.courses.join(' · ') : 'No paid courses yet'}
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                onClick={() => toggleBlocked(s.id, !s.blocked)}
                disabled={isPending}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-inkdim hover:border-red-300 hover:text-red-600"
              >
                {s.blocked ? 'Unblock' : 'Block'}
              </button>
              <button
                onClick={() => handleDelete(s.id, s.full_name)}
                disabled={isPending}
                className="rounded-md border border-line p-1.5 text-inkdim hover:border-red-300 hover:text-red-600"
                aria-label="Delete student"
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
