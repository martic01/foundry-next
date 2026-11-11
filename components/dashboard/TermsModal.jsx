'use client';

import { useState, useTransition } from 'react';
import { ScrollText, ExternalLink } from 'lucide-react';
import { acceptTerms, declineTermsDeleteAccount } from '../../app/dashboard/actions';

// Blocks the dashboard until a student who was registered by the admin accepts
// the terms and policy, or chooses to delete their account instead.
export default function TermsModal() {
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  function accept() {
    setError('');
    start(async () => {
      const res = await acceptTerms();
      if (res?.error) setError(res.error);
    });
  }
  function decline() {
    setError('');
    start(async () => {
      const res = await declineTermsDeleteAccount();
      if (res?.error) setError(res.error);
      else window.location.href = '/';
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="terms-title" aria-describedby="terms-desc">
      <div className="card my-8 w-full max-w-md p-5 sm:p-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand"><ScrollText className="h-5 w-5" /></div>
        <h2 id="terms-title" className="mb-1 font-display text-lg font-extrabold text-ink">Terms and policy</h2>
        <p id="terms-desc" className="mb-3 text-sm text-inkdim">
          The school registered you for a course. Before you continue, please read and accept our terms and policy, including the refund, minimum-age and privacy rules. If you are under 18, a parent or guardian must agree for you.
        </p>
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          Read the Terms &amp; Policy <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="mb-4 ml-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          Privacy Notice <ExternalLink className="h-3.5 w-3.5" />
        </a>

        {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p>}

        {!confirmDelete ? (
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="button" onClick={accept} disabled={pending} className="cta-btn w-full justify-center sm:flex-1">
              {pending ? 'Saving…' : 'I accept terms and policy'}
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} disabled={pending} className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:flex-1">
              Delete account (don&apos;t agree)
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:bg-red-500/10">
            <p className="mb-3 text-sm font-medium text-red-800 dark:text-red-200">Your account and registration will be deleted. This cannot be undone. Are you sure?</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={decline} disabled={pending} className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:flex-1">
                {pending ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={pending} className="cta-btn-outline w-full justify-center sm:flex-1">Go back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
