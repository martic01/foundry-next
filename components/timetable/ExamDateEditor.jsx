'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { isoToWatLocal } from '../../lib/exam/time';
import { setBatchExamDate } from '../../app/exam-actions';

// Admin: change the final exam's date and time right from the timetable (Lagos time, normally 6:00 PM).
export default function ExamDateEditor({ batchId, exam }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const saved = isoToWatLocal(exam.startsAt);
  const [value, setValue] = useState(saved);
  const [msg, setMsg] = useState({ ok: '', err: '' });
  const save = () => start(async () => {
    const r = await setBatchExamDate(batchId, value);
    setMsg(r?.error ? { ok: '', err: r.error } : { ok: 'Exam date saved.', err: '' });
    if (!r?.error) router.refresh();
  });
  return (
    <div className="mb-4 rounded-lg border border-line p-4">
      <p className="mb-1 text-sm font-semibold text-ink">Final exam date and time</p>
      <p className="mb-3 text-xs text-inkdim">{exam.provisional ? 'Not confirmed yet: a week after the last class, 6:00 PM. Save to confirm it.' : 'Confirmed. Lagos time; exams normally start at 6:00 PM.'} Opening the exam to students is done in the Exams tab.</p>
      <div className="flex flex-wrap items-end gap-2">
        <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="field max-w-[15rem]" aria-label="Exam date and time (Lagos time)" />
        <button type="button" onClick={save} disabled={pending || !value || value === saved} className="cta-btn !px-4 !py-2 text-sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save exam date
        </button>
      </div>
      {(msg.ok || msg.err) && <p role="status" className={`mt-2 text-sm ${msg.err ? 'text-red-600' : 'text-emerald-600'}`}>{msg.err || msg.ok}</p>}
    </div>
  );
}
