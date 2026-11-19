'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { decideReschedule } from '../../app/exam-actions';
import { fmtWat, isoToWatLocal } from '../../lib/exam/time';

export default function RescheduleRequests({ items }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [when, setWhen] = useState(() => Object.fromEntries(items.map((r) => [r.id, isoToWatLocal(r.preferred_at || '')])));
  const [note, setNote] = useState({});
  const [msg, setMsg] = useState('');
  const whenOf = (r) => (r.id in when ? when[r.id] : isoToWatLocal(r.preferred_at || ''));
  function decide(id, decision) {
    start(async () => {
      const res = await decideReschedule(id, decision, { newStartsAt: (id in when ? when[id] : isoToWatLocal(items.find((x) => x.id === id)?.preferred_at || '')) || null, note: note[id] || '' });
      setMsg(res?.error || (decision === 'approve' ? 'Approved. The student was notified.' : 'Declined. The student was notified.'));
      router.refresh();
    });
  }
  if (!items.length) return null;
  return (
    <div className="card mb-8 border-amber-300 p-5">
      <p className="mb-3 text-sm font-semibold text-ink">Reschedule requests ({items.length})</p>
      {msg && <p role="status" className="mb-3 text-sm text-inkdim">{msg}</p>}
      <ul className="space-y-4">
        {items.map((r) => (
          <li key={r.id} className="rounded-lg border border-line p-3 text-sm">
            <p className="font-medium text-ink">{r.name} <span className="font-normal text-inkdim">· {r.batchLabel} · attempt {r.attempt_no || 1}</span></p>
            <p className="text-inkdim">Reason: {r.reason}</p>
            {r.preferred_at && <p className="text-inkdim">Prefers: {fmtWat(r.preferred_at)}</p>}
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-inkdim">New exam date (Lagos time)
                <input type="datetime-local" value={whenOf(r)} onChange={(e) => setWhen((w) => ({ ...w, [r.id]: e.target.value }))} className="field mt-1" />
              </label>
              <label className="text-xs text-inkdim">Note to student (optional)
                <input value={note[r.id] || ''} maxLength={300} onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))} className="field mt-1" />
              </label>
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={pending || !whenOf(r)} onClick={() => decide(r.id, 'approve')} className="cta-btn">Approve</button>
              <button type="button" disabled={pending} onClick={() => decide(r.id, 'decline')} className="cta-btn-outline">Decline</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
