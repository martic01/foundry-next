'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Wrench, MessageCircle } from 'lucide-react';
import { WHATSAPP_GROUP_URL } from '../../lib/community';

// Shown on the dashboard home while something is still outstanding. It lists
// ONLY the tools for the courses this student is enrolled in, plus the
// WhatsApp group. `plan` comes from lib/installs.js installPlan(). Once
// everything is ticked on the Installation page the server stops rendering it.
export default function InstallReminderModal({ plan }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const courses = plan.courses.map((c) => ({ ...c, tools: c.tools.filter((t) => !t.done) })).filter((c) => c.tools.length);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-4" role="alertdialog" aria-modal="true" aria-labelledby="install-title">
      <div className="card relative my-8 max-h-[85vh] w-full max-w-md overflow-y-auto p-6">
        <button onClick={() => setDismissed(true)} aria-label="Close" className="absolute right-3 top-3 rounded-md p-1 text-inkdim hover:text-ink">
          <X className="h-4 w-4" />
        </button>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Wrench className="h-5 w-5" />
        </div>
        <h2 id="install-title" className="mb-1 font-display text-lg font-extrabold text-ink">Get ready for class</h2>
        <p className="mb-4 text-sm text-inkdim">You <span className="font-semibold text-ink">must</span> do these before your first class, or you won&apos;t be able to follow along.</p>

        <div className="mb-4 rounded-lg border border-brand/40 bg-brand-light p-3 text-sm text-ink">
          <p className="mb-1 font-semibold">Important: tick the boxes</p>
          <p className="text-inkdim">
            When you finish installing a tool, open the Installation page and <span className="font-semibold text-ink">tick the checkbox next to it</span>. Do the same after you join the WhatsApp group. This is how your teacher knows you are ready. If you don&apos;t tick them, you will show as not installed.
          </p>
        </div>

        {courses.map((c) => (
          <div key={c.key} className="mb-3 rounded-lg border border-line bg-surfaceMuted p-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-inkdim">{c.name}: install</p>
            <ul className="space-y-1">
              {c.tools.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm text-ink"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> {t.label}</li>
              ))}
            </ul>
          </div>
        ))}

        {plan.whatsappPending && (
          <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900"><MessageCircle className="h-4 w-4" /> Join the class WhatsApp group</p>
            <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer" className="cta-btn w-full justify-center">Join WhatsApp group</a>
            <p className="mt-2 text-xs text-emerald-900">After you join, tick <strong>&ldquo;I&apos;ve joined the group&rdquo;</strong> on the Installation page.</p>
          </div>
        )}

        <Link href="/dashboard/installation" className="cta-btn-outline w-full justify-center" onClick={() => setDismissed(true)}>
          {courses.length ? 'Go to Installation' : 'Open Installation page'} &rarr;
        </Link>
      </div>
    </div>
  );
}
