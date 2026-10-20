'use client';

import { useState, useTransition } from 'react';
import { Flag, Clock } from 'lucide-react';
import { EXPIRY_PRESETS, isExpired, formatExpiry } from '../../lib/expiry';
import { reportContent } from '../../app/admin/actions';

// Shared bits for the three Content managers (class links, videos,
// announcements). An "audience" is the string 'all' (every batch) or a
// batch id -- exactly what the server actions' parseAudience() expects.

// Admins can aim content at 'all' batches; a teacher's options have no
// 'all', so their form starts on their first batch instead.
export function defaultAudienceFor(options) {
  return options.some((o) => o.value === 'all') ? 'all' : options[0]?.value || 'all';
}

export function audienceOf(item) {
  return item.batch_id || 'all';
}

export function AudienceSelect({ value, onChange, options, disabled, label = 'Show to' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="field">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AudienceChip({ batchId, options }) {
  const all = !batchId;
  const label = all ? 'All batches' : options.find((o) => o.value === batchId)?.label || 'One batch';
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        all ? 'border-brand/40 bg-brand/10 text-brand-dark' : 'border-line bg-surfaceMuted text-inkdim'
      }`}
    >
      {label}
    </span>
  );
}

export const iconBtn =
  'rounded-md border border-line p-1.5 text-inkdim transition hover:border-brand/40 hover:text-brand disabled:opacity-40';
export const dangerBtn =
  'rounded-md border border-line p-1.5 text-inkdim transition hover:border-red-300 hover:text-red-600 disabled:opacity-40';

// "Never expires" / a preset / a custom date & time. Controlled: `value`
// is { mode, custom } (see lib/expiry.js -- expiryToIso turns it into the
// ISO string the server actions take).
export function ExpirySelect({ value, onChange, disabled, label = 'Expires' }) {
  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">{label}</span>
        <select value={value.mode} onChange={(e) => onChange({ ...value, mode: e.target.value })} disabled={disabled} className="field">
          {EXPIRY_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {value.mode === 'custom' && (
        <label className="mt-2 block">
          <span className="mb-1 block text-[11px] text-inkdim">Date and time (Lagos time)</span>
          <input type="datetime-local" value={value.custom} onChange={(e) => onChange({ ...value, custom: e.target.value })} disabled={disabled} className="field" />
        </label>
      )}
      {value.mode !== 'never' && <p className="mt-1 text-[11px] text-inkdim">It&apos;s deleted automatically once it expires.</p>}
    </div>
  );
}

export function ExpiryChip({ item }) {
  if (!item?.expires_at) return null;
  const expired = isExpired(item);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        expired ? 'border-red-200 bg-red-50 text-red-600' : 'border-amber-300/60 bg-amber-50 text-amber-700'
      }`}
      title={new Date(item.expires_at).toLocaleString()}
    >
      <Clock className="h-3 w-3" /> {expired ? 'Expired \u00b7 removing soon' : `Expires ${formatExpiry(item.expires_at)}`}
    </span>
  );
}

// Who may change an item: the admin always; a teacher only what they
// posted. `ownerKey` is the column that records the poster.
export function canModify(viewer, item, ownerKey) {
  return viewer.role === 'admin' || (!!viewer.userId && item[ownerKey] === viewer.userId);
}

// For a teacher looking at something they can't change: a small inline
// "Report" form that sends a note to the admin.
export function ReportButton({ kind, itemId }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [state, setState] = useState({ sent: false, error: '' });
  const [isPending, startTransition] = useTransition();

  if (state.sent) return <span className="text-xs text-emerald-600">Reported — thanks.</span>;

  function send() {
    startTransition(async () => {
      const res = await reportContent(kind, itemId, text);
      if (res?.error) setState({ sent: false, error: res.error });
      else setState({ sent: true, error: '' });
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={iconBtn + ' inline-flex items-center gap-1 !px-2 text-xs'} aria-label="Report this to the admin">
        <Flag className="h-3.5 w-3.5" /> Report
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-line bg-surface p-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} placeholder="What's wrong with this? The admin will see your note." className="field resize-none text-xs" disabled={isPending} />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={send} disabled={isPending || text.trim().length < 3} className="cta-btn !px-3 !py-1.5 text-xs">Send report</button>
        <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="cta-btn-outline !px-3 !py-1.5 text-xs">Cancel</button>
      </div>
    </div>
  );
}

// ---- Feedback bits: something visibly happens on every action ----

export function ProgressBar({ value = 0, indeterminate = false, tone = 'brand' }) {
  const bar = tone === 'red' ? 'bg-red-500' : tone === 'green' ? 'bg-green-600' : 'bg-brand';
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={indeterminate ? undefined : value} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`bar-shimmer relative h-full overflow-hidden rounded-full ${bar} transition-[width] duration-300 ease-out`}
        style={{ width: indeterminate ? '100%' : `${Math.max(3, Math.min(100, value))}%` }}
      />
    </div>
  );
}

// A row that is being deleted / saved: dimmed, striped, with a label, so
// it is obvious the click registered while the server works.
export function BusyOverlay({ label = 'Working…' }) {
  return (
    <div className="busy-stripes absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-surface/70 backdrop-blur-[1px]" aria-live="polite">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink shadow-sm">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        {label}
      </span>
    </div>
  );
}

export function Spinner({ className = 'h-3.5 w-3.5' }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />;
}
