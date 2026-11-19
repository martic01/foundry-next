'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { setProofRetention } from '../../app/exam-actions';

// Admin: how long exam camera pictures and voice clips are kept before they are deleted automatically.
export default function ProofRetention({ passDays, maxDays }) {
  const router = useRouter();
  const [pd, setPd] = useState(passDays);
  const [md, setMd] = useState(maxDays);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState({ ok: '', err: '' });
  const changed = Number(pd) !== passDays || Number(md) !== maxDays;
  const save = () => start(async () => {
    const r = await setProofRetention({ passDays: Number(pd), maxDays: Number(md) });
    setMsg(r?.error ? { ok: '', err: r.error } : { ok: 'Saved.', err: '' });
    if (!r?.error) router.refresh();
  });
  return (
    <details className="card mb-6 p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-ink">Camera &amp; microphone captures: automatic deletion ({passDays} days after passing, {maxDays} days at most)</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium uppercase tracking-wide text-inkdim">Delete after the student passes (days)
          <input type="number" min={0} max={365} value={pd} onChange={(e) => setPd(e.target.value)} className="field mt-1 normal-case" />
          <span className="mt-0.5 block text-[10px] normal-case">Default 7. Use 0 to delete at the next clean-up after they pass.</span>
        </label>
        <label className="text-xs font-medium uppercase tracking-wide text-inkdim">Delete everything after (days)
          <input type="number" min={1} max={365} value={md} onChange={(e) => setMd(e.target.value)} className="field mt-1 normal-case" />
          <span className="mt-0.5 block text-[10px] normal-case">Default 30. Applies to every capture, whatever the result.</span>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !changed} className="cta-btn !px-4 !py-2 text-sm">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</button>
        {(msg.ok || msg.err) && <p role="status" className={`text-xs ${msg.err ? 'text-red-600' : 'text-emerald-600'}`}>{msg.err || msg.ok}</p>}
        <p className="text-xs text-inkdim">You can also select and delete single pictures from a student&apos;s attempt below. Update the Privacy Notice if you change these periods.</p>
      </div>
    </details>
  );
}
