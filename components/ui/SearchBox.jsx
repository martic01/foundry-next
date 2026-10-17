'use client';

import { Search, X } from 'lucide-react';

// One search box used everywhere a list can get long. Controlled:
//   const [q, setQ] = useState('');  <SearchBox value={q} onChange={setQ} />
//   rows.filter((r) => matchesQuery(q, r.name, r.email))
export default function SearchBox({ value, onChange, placeholder = 'Search…', label = 'Search', className = '' }) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkdim" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field !pl-9 !pr-8"
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-inkdim hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  );
}

// Every word typed must appear somewhere in the given fields
// (case-insensitive): "ada gmail" finds "Ada Obi · ada@gmail.com".
export function matchesQuery(query, ...fields) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fields.filter(Boolean).join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}
