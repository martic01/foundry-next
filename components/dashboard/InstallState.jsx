'use client';

import { createContext, useContext, useState, useTransition } from 'react';
import { CheckCircle2, MessageCircle, ExternalLink } from 'lucide-react';
import { setToolInstalled } from '../../app/dashboard/actions';
import { WHATSAPP_GROUP_URL } from '../../lib/community';

// One shared "what is ticked" state for the whole Installation page, so a
// tool that appears in two courses (VS Code, Git) is ticked in both at once.
const Ctx = createContext(null);

export function InstallProvider({ initial, children }) {
  const [done, setDone] = useState(initial || {});
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function toggle(id, next) {
    setDone((d) => ({ ...d, [id]: next })); // instant; the save follows
    setError('');
    startTransition(async () => {
      const res = await setToolInstalled(id, next);
      if (res?.error) {
        setDone((d) => ({ ...d, [id]: !next })); // put it back, nothing was saved
        setError(res.error);
      }
    });
  }
  return <Ctx.Provider value={{ done, toggle, pending, error }}>{children}</Ctx.Provider>;
}

const useInstall = () => useContext(Ctx);

export function ToolCheck({ id, label }) {
  const { done, toggle, pending } = useInstall();
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium ${done[id] ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-line bg-surfaceMuted text-ink'}`}>
      <input type="checkbox" checked={!!done[id]} disabled={pending} onChange={(e) => toggle(id, e.target.checked)} className="accent-brand" />
      I&apos;ve installed {label}
      {done[id] && <CheckCircle2 className="ml-auto h-4 w-4" />}
    </label>
  );
}

export function CourseProgress({ ids }) {
  const { done, error } = useInstall();
  const n = ids.filter((id) => done[id]).length;
  return (
    <div className="mb-4" aria-live="polite">
      <p className="text-sm text-inkdim">
        <span className="font-semibold text-ink">{n} of {ids.length}</span> installed
        {n === ids.length && <span className="ml-2 inline-flex items-center gap-1 font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" /> All set for this course</span>}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surfaceMuted">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(n / ids.length) * 100}%` }} />
      </div>
      {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}

// The class WhatsApp group: a clear join button plus a tick once joined.
export function WhatsAppGroupCard() {
  const { done, toggle, pending } = useInstall();
  const joined = !!done.whatsapp;
  return (
    <div className={`card mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${joined ? '' : 'border-emerald-300'}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><MessageCircle className="h-5 w-5" /></span>
        <div>
          <p className="font-display text-base font-extrabold text-ink">Join the class WhatsApp group</p>
          <p className="text-sm text-inkdim">Class updates, reminders and help from your instructors and classmates are shared here. Please join before your first class.</p>
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col gap-2 sm:items-end">
        <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer" className="cta-btn w-fit">
          <ExternalLink className="h-4 w-4" /> Join WhatsApp group
        </a>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink">
          <input type="checkbox" checked={joined} disabled={pending} onChange={(e) => toggle('whatsapp', e.target.checked)} className="accent-brand" />
          I&apos;ve joined the group
        </label>
      </div>
    </div>
  );
}
