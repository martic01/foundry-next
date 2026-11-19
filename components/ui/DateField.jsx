'use client';

import { useId } from 'react';

// The phone's own date picker, but with a visible hint while nothing is chosen (some phones draw an empty,
// invisible box). type: 'date' or 'datetime-local'.
export default function DateField({ value, onChange, type = 'date', placeholder, min, max, label, className = '' }) {
  const id = useId();
  const empty = !value;
  const hint = placeholder || (type === 'date' ? 'Tap to choose a date' : 'Tap to choose a day and time');
  return (
    <div className={`relative ${className}`}>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} min={min} max={max} aria-label={label || hint}
        className={`field normal-case ${empty ? '[@media(hover:none)]:[&::-webkit-datetime-edit]:opacity-0' : ''}`} />
      {empty && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 hidden items-center text-sm text-inkdim [@media(hover:none)]:flex">{hint}</span>}
    </div>
  );
}
