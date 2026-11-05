'use client';

// Filters on the three student tags. Shared by the Students page and every batch.
// `value` = { install, whatsapp, terms }, each 'all' or one of the choices below.
export const NO_TAG_FILTER = { install: 'all', whatsapp: 'all', terms: 'all' };

export function tagFilterActive(v) {
  return v.install !== 'all' || v.whatsapp !== 'all' || v.terms !== 'all';
}

// Students with nothing to install count as neither installed nor not installed.
export function matchesTagFilter(tags, v) {
  if (!tags) return !tagFilterActive(v);
  if (v.install === 'yes' && tags.install.state !== 'all') return false;
  if (v.install === 'no' && !['some', 'none'].includes(tags.install.state)) return false;
  if (v.whatsapp === 'yes' && !tags.whatsapp) return false;
  if (v.whatsapp === 'no' && tags.whatsapp) return false;
  if (v.terms === 'yes' && tags.terms.state !== 'agreed') return false;
  if (v.terms === 'no' && tags.terms.state === 'agreed') return false;
  return true;
}

const FILTERS = [
  ['install', 'Installed', ['Installed', 'Not installed']],
  ['whatsapp', 'WhatsApp', ['Joined group', 'Not joined']],
  ['terms', 'Terms', ['Agreed', 'Not agreed']]
];

export default function TagFilters({ value, onChange, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} role="group" aria-label="Filter by installed, WhatsApp group and terms">
      {FILTERS.map(([key, label, [yes, no]]) => (
        <label key={key} className="inline-flex items-center gap-1.5 text-xs">
          <span className="font-medium uppercase tracking-wide text-inkdim">{label}</span>
          <select
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            className="field !w-auto !py-1 text-xs"
            aria-label={`Filter by ${label.toLowerCase()}`}
          >
            <option value="all">All</option>
            <option value="yes">{yes}</option>
            <option value="no">{no}</option>
          </select>
        </label>
      ))}
    </div>
  );
}
