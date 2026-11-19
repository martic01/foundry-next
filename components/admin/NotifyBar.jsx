'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, Send, X, Loader2 } from 'lucide-react';
import { setNotifyMode, sendPendingNotification, sendAllPending, discardPendingNotification } from '../../app/notify-actions';

// Admin-wide bar: the Auto / Manual switch for notifications about admin changes, and (in Manual mode)
// the list of notifications waiting for the admin to press Send.
export default function NotifyBar({ mode, pending }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const run = (fn, ok) => start(async () => { const r = await fn(); setMsg(r?.error || ok || ''); router.refresh(); });
  const manual = mode === 'manual';
  return (
    <div className="mb-6 rounded-xl border border-line bg-surface text-sm">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left">
        <span className="inline-flex items-center gap-2 font-medium text-ink">
          <Bell className="h-4 w-4 text-brand" /> Student notifications: {manual ? 'Manual' : 'Automatic'}
          {pending.length > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">{pending.length} waiting to send</span>}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-inkdim">When I change something that concerns students:</span>
            <div role="group" className="inline-flex rounded-lg bg-surfaceMuted p-1">
              {[['auto', 'Notify automatically'], ['manual', 'I will send it myself']].map(([k, l]) => (
                <button key={k} type="button" disabled={busy} onClick={() => run(() => setNotifyMode(k), 'Saved.')} className={`rounded-md px-3 py-1 text-xs font-medium ${mode === k ? 'bg-surface text-ink shadow-sm' : 'text-inkdim'}`}>{l}</button>
              ))}
            </div>
          </div>
          {msg && <p role="status" className="text-xs text-inkdim">{msg}</p>}
          {manual && !pending.length && <p className="text-xs text-inkdim">Nothing waiting. When you change something, a Send button will appear here.</p>}
          {pending.length > 0 && (
            <>
              <ul className="space-y-2">
                {pending.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2.5">
                    <span className="min-w-0 text-xs text-ink"><span className="block truncate font-medium">{p.label}</span><span className="text-inkdim">{p.recipients} student{p.recipients === 1 ? '' : 's'}</span></span>
                    <span className="flex gap-2">
                      <button type="button" disabled={busy} onClick={() => run(() => sendPendingNotification(p.id), 'Sent.')} className="cta-btn !px-3 !py-1.5 text-xs">{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send notification</button>
                      <button type="button" disabled={busy} onClick={() => run(() => discardPendingNotification(p.id), 'Removed.')} aria-label="Discard" className="rounded p-1.5 text-inkdim hover:bg-surfaceMuted"><X className="h-4 w-4" /></button>
                    </span>
                  </li>
                ))}
              </ul>
              {pending.length > 1 && <button type="button" disabled={busy} onClick={() => run(sendAllPending, 'All sent.')} className="cta-btn-outline text-xs">Send all</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
