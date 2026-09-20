'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Wrench } from 'lucide-react';

// Rendered by app/dashboard/page.jsx only when installationPending is
// true -- once the student ticks both checkboxes on /dashboard/installation,
// that prop stops being true and this stops rendering at all (rather than
// this component tracking "seen it" itself, which would mean it stops
// nagging even if the student still hasn't actually installed anything).
export default function InstallReminderModal() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="card relative my-8 w-full max-w-sm max-h-[85vh] overflow-y-auto p-6">
        <button
          onClick={() => setDismissed(true)}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1 text-inkdim hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Wrench className="h-5 w-5" />
        </div>
        <h2 className="mb-1 font-display text-lg font-extrabold text-ink">Set up your laptop first</h2>
        <p className="mb-5 text-sm text-inkdim">
          You <span className="font-semibold text-ink">must</span> install VS
          Code and Git before your first class -- you won&apos;t be able to
          follow along otherwise.
        </p>
        <Link href="/dashboard/installation" className="cta-btn w-full" onClick={() => setDismissed(true)}>
          Go to Installation &rarr;
        </Link>
      </div>
    </div>
  );
}
