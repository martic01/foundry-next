'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2, Tag as TagIcon, Undo2, ArrowRight } from 'lucide-react';
import { effectivePrice, parsePriceInput } from '../../lib/pricing';
import { formatNaira } from '../../lib/courses';
import { SEAT_LIMIT } from '../../lib/seat-limit';
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
export default function RegistrationControl({ course, settings, seats, defaults }) {
  const cur = effectivePrice({ priceNow: defaults.now, priceWas: defaults.was }, settings);
  const [priceNow, setPriceNow] = useState(String(cur.now));
  const [priceWas, setPriceWas] = useState(cur.was ? String(cur.was) : '');
  const priceCheck = parsePriceInput(priceNow, priceWas);
  const [open, setOpen] = useState(settings.registration_open);
  const [tag, setTag] = useState(settings.tag || 'none');
  const [reopenDate, setReopenDate] = useState(isoToReopenDateInput(settings.reopen_at));
  const [furtherNotice, setFurtherNotice] = useState(!settings.reopen_at);
  const [autoClose, setAutoClose] = useState(settings.auto_close !== false);
  const [isPending, startTransition] = useTransition();

  const closing = !open || TAGS[tag].closes;

  // What is stored right now vs what is on screen: drives the "unsaved / saved" indicator.
  const snap = (v) => ({
    open: v.open, tag: v.tag, autoClose: v.autoClose, priceNow: String(v.priceNow).trim(), priceWas: String(v.priceWas || '').trim(),
    reopen: v.closing ? (v.furtherNotice ? 'further notice' : v.reopenDate || '') : ''
  });
  const current = snap({ open, tag, priceNow, priceWas, closing, furtherNotice, reopenDate, autoClose });
  const [base, setBase] = useState(() => snap({ autoClose: settings.auto_close !== false, open: settings.registration_open, tag: settings.tag || 'none', priceNow: cur.now, priceWas: cur.was, closing: !settings.registration_open || TAGS[settings.tag || 'none'].closes, furtherNotice: !settings.reopen_at, reopenDate: isoToReopenDateInput(settings.reopen_at) }));
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState({ text: '', key: '' });
  const key = JSON.stringify(current);
  const priceDirty = current.priceNow !== base.priceNow || current.priceWas !== base.priceWas;
  const clock = (d) => d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
  const tagName = (t) => (t === 'none' ? 'No tag' : TAGS[t].label);
  const money = (v) => (v ? formatNaira(Number(v)) : 'none');
  const changes = [];
  if (current.open !== base.open) changes.push(['Registration', base.open ? 'Open' : 'Closed', current.open ? 'Open' : 'Closed']);
  if (current.tag !== base.tag) changes.push(['Status tag', tagName(base.tag), tagName(current.tag)]);
  if (current.priceNow !== base.priceNow) changes.push(['Price', money(base.priceNow), money(current.priceNow)]);
  if (current.priceWas !== base.priceWas) changes.push(['Crossed-out price', money(base.priceWas), money(current.priceWas)]);
  if (current.autoClose !== base.autoClose) changes.push(['Auto-close', base.autoClose ? 'On' : 'Off', current.autoClose ? 'On' : 'Off']);
  if (current.reopen !== base.reopen) changes.push(['Reopens', base.reopen || 'not set', current.reopen || 'not set']);
  const dirty = changes.length > 0;
  const shownError = error.key === key ? error.text : '';
  // What students would see if this were saved right now.
  const preview = getAvailability({
    registration_open: open,
    tag,
    reopen_at: closing && !furtherNotice && reopenDate ? `${reopenDate}T00:00:00+01:00` : null,
    auto_close: autoClose,
    auto_closed: autoClose ? settings.auto_closed : null
  });
  const saved = getAvailability(settings);

  function save(pricingOverride) {
    if (!pricingOverride && priceDirty && priceCheck.error) return setError({ text: priceCheck.error, key });
    startTransition(async () => {
      const res = await updateCourseSettings(course.key, {
        pricing: pricingOverride || (priceDirty ? { priceNow, priceWas } : undefined),
        registrationOpen: open,
        tag,
        reopenDate: closing && !furtherNotice ? reopenDate : '',
        untilFurtherNotice: closing && furtherNotice,
        ...(current.autoClose !== base.autoClose ? { autoClose } : {})
      });
      if (res?.error) return setError({ text: res.error, key });
      let next = current;
      if (pricingOverride?.reset) {
        setPriceNow(String(defaults.now));
        setPriceWas(defaults.was ? String(defaults.was) : '');
        next = { ...current, priceNow: String(defaults.now), priceWas: defaults.was ? String(defaults.was) : '' };
      }
      setBase(next);
      setError({ text: '', key: '' });
      setSavedAt(new Date());
    });
  }

  function undo() {
    setOpen(base.open);
    setTag(base.tag);
    setPriceNow(base.priceNow);
    setPriceWas(base.priceWas);
    setAutoClose(base.autoClose);
    setFurtherNotice(base.reopen === 'further notice' || !base.reopen);
    setReopenDate(base.reopen && base.reopen !== 'further notice' ? base.reopen : '');
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

      <div className="mt-5 rounded-lg border border-line p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><TagIcon className="h-4 w-4 text-brand" /> Price</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Price students pay (₦)</span>
            <input value={priceNow} onChange={(e) => setPriceNow(e.target.value)} inputMode="numeric" className="field" disabled={isPending} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Original price, crossed out (₦) — optional</span>
            <input value={priceWas} onChange={(e) => setPriceWas(e.target.value)} inputMode="numeric" placeholder="empty = no discount" className="field" disabled={isPending} />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-inkdim">
          <span>
            Shown as: <span className="font-semibold text-ink">{priceCheck.error ? '—' : formatNaira(priceCheck.now)}</span>
            {!priceCheck.error && priceCheck.was ? <> <span className="line-through">{formatNaira(priceCheck.was)}</span> (save {formatNaira(priceCheck.was - priceCheck.now)})</> : ' (no discount)'}
          </span>
          {priceWas.trim() && <button type="button" onClick={() => setPriceWas('')} className="underline underline-offset-2 hover:text-ink">Remove discount</button>}
          <button type="button" onClick={() => save({ reset: true })} disabled={isPending} className="underline underline-offset-2 hover:text-ink">Reset to default prices</button>
        </div>
        {priceCheck.error && priceDirty && <p className="mt-2 text-xs text-red-600">{priceCheck.error}</p>}
        <p className="mt-2 text-xs text-inkdim">The new price applies to new payments straight away: the landing page, register page and payment check all use it.</p>
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

      <div className={`mt-5 rounded-lg border p-3 text-sm ${settings.auto_closed && autoClose ? 'border-red-200 bg-red-50' : 'border-line bg-surfaceMuted'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-ink">Auto-close for this course</p>
            <p className="text-xs text-inkdim">When ON, registration shows &ldquo;All seats taken&rdquo; once {SEAT_LIMIT} students have paid, or when a class timer for this course has started. Turn it OFF to control this course by hand.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoClose}
            aria-label={`Auto-close for ${course.name}`}
            onClick={() => setAutoClose((v) => !v)}
            disabled={isPending}
            className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full border transition ${autoClose ? 'border-emerald-600 bg-emerald-600' : 'border-line bg-surfaceMuted'}`}
          >
            <span className={`absolute left-1 text-[10px] font-bold uppercase text-white transition-opacity ${autoClose ? 'opacity-100' : 'opacity-0'}`}>On</span>
            <span className={`absolute right-1.5 text-[10px] font-bold uppercase text-inkdim transition-opacity ${autoClose ? 'opacity-0' : 'opacity-100'}`}>Off</span>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${autoClose ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>
        <p className="mt-2 text-xs text-inkdim">
          Seats taken: <span className="font-semibold text-ink">{settings.seats_taken ?? seats.paid} of {SEAT_LIMIT}</span>
          {settings.auto_closed && autoClose && (
            <span className="ml-2 font-semibold text-red-700">
              Closed automatically: {settings.auto_closed === 'full' ? 'the cohort is full.' : 'the class timer has started.'}
            </span>
          )}
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-line p-3 text-xs text-inkdim">
        <span className="font-medium text-ink">Students will see: </span>
        {preview.open ? 'Register now button' : describeClosure(preview)}
        {preview.tagLabel ? ` · tag “${preview.tagLabel}”` : ''}
      </div>

      {dirty && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs" aria-live="polite">
          <p className="mb-2 font-semibold uppercase tracking-wide text-amber-800">{changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}</p>
          <ul className="space-y-1">
            {changes.map(([label, from, to]) => (
              <li key={label} className="flex flex-wrap items-center gap-1.5 text-ink">
                <span className="w-32 text-inkdim">{label}</span>
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 line-through">{from}</span>
                <ArrowRight className="h-3 w-3 text-inkdim" />
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">{to}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={() => save()} disabled={isPending || !dirty} className="cta-btn !px-5 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {isPending ? 'Saving\u2026' : 'Save'}
        </button>
        {dirty && !isPending && (
          <button onClick={undo} className="cta-btn-outline !px-4 !py-2 text-sm"><Undo2 className="h-4 w-4" /> Undo changes</button>
        )}
        <p className="text-sm" role="status" aria-live="polite">
          {isPending ? <span className="text-inkdim">Saving&hellip;</span>
            : shownError ? <span className="text-red-600">{shownError}</span>
            : dirty ? <span className="font-medium text-amber-700">Unsaved changes</span>
            : savedAt ? <span className="font-medium text-emerald-600">Saved at {clock(savedAt)}</span>
            : <span className="text-inkdim">No changes yet</span>}
        </p>
      </div>
    </div>
  );
}
