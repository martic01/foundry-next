'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { createBatch } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';

// Admin-made batch: pick the course, optionally name it, set seats (max
// 50), a start date, and teachers. "Fill automatically" off = a batch
// that registration never places anyone into; the admin adds students
// by hand (Move on a student, or the Unassigned list).
export default function CreateBatchForm({ courses, teachers }) {
  const [open, setOpen] = useState(false);
  const [course, setCourse] = useState(courses[0]?.key || '');
  const [label, setLabel] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [startDate, setStartDate] = useState('');
  const [autoAssign, setAutoAssign] = useState(true);
  const [teacherIds, setTeacherIds] = useState(new Set());
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { alert } = useDialog();

  function toggleTeacher(id) {
    setTeacherIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function submit(e) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await createBatch(course, { label, capacity: Number(capacity), startDate, autoAssign, teacherIds: [...teacherIds] });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setLabel('');
      setStartDate('');
      setCapacity('50');
      setTeacherIds(new Set());
      setAutoAssign(true);
      setOpen(false);
      if (res.warning) await alert({ title: 'Batch created', message: res.warning, tone: 'error' });
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="cta-btn mb-8 !px-4 !py-2 text-sm">
        <Plus className="h-4 w-4" /> Create a batch
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card mb-8 flex flex-col gap-4 p-5">
      <p className="font-display text-lg font-semibold text-ink">Create a batch</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Course</span>
          <select value={course} onChange={(e) => setCourse(e.target.value)} className="field" disabled={isPending}>
            {courses.map((c) => (
              <option key={c.key} value={c.key}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Batch name (optional)</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="Leave empty for “… — Batch 2”" className="field" disabled={isPending} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Seats (1–50)</span>
          <input type="number" min={1} max={50} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="field" disabled={isPending} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Course starts (optional)</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field" disabled={isPending} />
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm text-inkdim">
        <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} disabled={isPending} className="mt-1" />
        <span>
          <span className="font-medium text-ink">Fill automatically.</span> New registrations for this course are placed
          in the oldest batch with room. Untick to keep it for students you add by hand.
        </span>
      </label>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-inkdim">Teachers (optional)</legend>
        {!teachers.length ? (
          <p className="text-sm text-inkdim">No teachers registered yet — add them on the Teachers page.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {teachers.map((t) => (
              <label key={t.id} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${teacherIds.has(t.id) ? 'border-brand bg-brand/10 text-ink' : 'border-line text-inkdim'}`}>
                <input type="checkbox" className="sr-only" checked={teacherIds.has(t.id)} onChange={() => toggleTeacher(t.id)} disabled={isPending} />
                {t.full_name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending || !course} className="cta-btn !px-4 !py-2 text-sm">Create batch</button>
        <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="cta-btn-outline !px-4 !py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}
