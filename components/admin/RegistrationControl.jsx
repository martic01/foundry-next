'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { updateCourseSettings } from '../../app/admin/actions';
import { TAGS, TAG_OPTIONS, getAvailability, describeClosure, isoToReopenDateInput } from '../../lib/course-status';

const TAG_STYLES = {
  coming_soon: 'bg-ink/80 text-white',
  ended: 'bg-red-600 text-white',
  limited_seats: 'bg-amber-500 text-white',
  sold_out: 'bg-red-600 text-white'
};

export function TagBadge({ tag, className = '' }) {
  if (!tag || tag === 'none') return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${TAG_STYLES[tag]} ${className}`}>
      {TAGS[tag].label}
    </span>
  );
}

// One course's registration controls. `seats` = { paid, batches, capacity }
// for the usage line (informational -- the admin picks the tag).
export default function RegistrationControl({ course, settings, seats }) {
  const [open, setOpen] = useState(settings.registration_open);
  const [tag, setTag] = useState(settings.tag || 'none');
  const [reopenDate, setReopenDate] = useState(isoToReopenDateInput(settings.reopen_at));
  const [furtherNotice, setFurtherNotice] = useState(!settings.reopen_at);
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [isPending, startTransition] = useTransition();

  const closing = !open || TAGS[tag].closes;
  // What students would see if this were saved right now.
  const preview = getAvailability({
    registration_open: open,
    tag,
    reopen_at: closing && !furtherNotice && reopenDate ? `${reopenDate}T00:00:00+01:00` : null
  });
  const saved = getAvailability(settings);

  function save() {
    startTransition(async () => {
      const res = await updateCourseSettings(course.key, {
        registrationOpen: open,
        tag,
        reopenDate: closing && !furtherNotice ? reopenDate : '',
        untilFurtherNotice: closing && furtherNotice
      });
      setStatus(res?.error ? { text: res.error, kind: 'error' } : { text: 'Saved.', kind: 'ok' });
    });
  }

  // Earliest pickable day is TOMORROW (Lagos): a reopen date is stored as
  // midnight at the start of that day, so "today" would already be in the
  // past and the server would refuse it.
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });

  return (
    <div className="card p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-extrabold text-ink">{course.name}</p>
          <p className="text-xs text-inkdim">
            {seats.paid} registered across {seats.batches} batch{seats.batches === 1 ? '' : 'es'} · {seats.capacity} seats per batch
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              saved.open ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
            }`}
          >
            {saved.open ? 'Registration open' : 'Registration closed'}
          </span>
          <TagBadge tag={saved.tag} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">Registration &amp; payment</p>
          <div className="inline-flex rounded-lg bg-surfaceMuted p-1 text-sm font-medium">
            {[
              [true, 'Open'],
              [false, 'Closed']
            ].map(([val, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setOpen(val)}
                disabled={isPending}
                className={`rounded-md px-4 py-1.5 transition ${open === val ? (val ? 'bg-emerald-600 text-white shadow-sm' : 'bg-red-600 text-white shadow-sm') : 'text-inkdim hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-inkdim">Closing blocks the Register page and payment for this course.</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">Status tag</p>
          <select value={tag} onChange={(e) => setTag(e.target.value)} disabled={isPending} className="field">
            {TAG_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t === 'none' ? 'No tag' : TAGS[t].label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-inkdim">Coming soon, Ended and All seats taken also close registration.</p>
        </div>
      </div>

      {closing && (
        <div className="mt-5 rounded-lg border border-line bg-surfaceMuted p-4">
          <p className="mb-3 text-sm font-semibold text-ink">When does registration reopen?</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" checked={!furtherNotice} onChange={() => setFurtherNotice(false)} className="accent-brand" disabled={isPending} />
              On this date
            </label>
            <input
              type="date"
              value={reopenDate}
              min={tomorrow}
              onChange={(e) => {
                setReopenDate(e.target.value);
                setFurtherNotice(false);
              }}
              className="field !w-auto"
              disabled={isPending}
            />
            <label className="flex items-center gap-2 text-sm text-ink sm:ml-4">
              <input type="radio" checked={furtherNotice} onChange={() => setFurtherNotice(true)} className="accent-brand" disabled={isPending} />
              Until further notice
            </label>
          </div>
          <p className="mt-2 text-xs text-inkdim">On the chosen date (Lagos time) registration opens by itself.</p>
        </div>
      )}

      <div className="mt-5 rounded-lg border border-dashed border-line p-3 text-xs text-inkdim">
        <span className="font-medium text-ink">Students will see: </span>
        {preview.open ? 'Register now button' : describeClosure(preview)}
        {preview.tagLabel ? ` · tag “${preview.tagLabel}”` : ''}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={isPending} className="cta-btn !px-5 !py-2 text-sm">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
        </button>
        {status.text && <p className={`text-sm ${status.kind === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{status.text}</p>}
      </div>
    </div>
  );
}
