'use client';

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
