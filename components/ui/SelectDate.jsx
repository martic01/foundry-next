'use client';

import { useState } from 'react';

// Day / month / year (and optionally hour / minute) drop-downs. Phones show a native date box as a blank
// strip in some browsers; plain drop-downs always show what is chosen. value is 'YYYY-MM-DD' or, with
// withTime, 'YYYY-MM-DDTHH:mm' (the same text a date box gives). '' means nothing chosen yet.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');

export default function SelectDate({ value, onChange, withTime = false, yearFrom, yearTo, label = 'Date', disabled = false }) {
  const now = new Date();
  const from = yearFrom ?? now.getFullYear() - 100;
  const to = yearTo ?? now.getFullYear();
  // Partly chosen dates are kept here, because the outside value stays empty until day, month and year are all picked.
  const [part, setPart] = useState(() => {
    const [d0 = '', t0 = ''] = String(value || '').split('T');
    const [y0 = '', m0 = '', dd0 = ''] = d0.split('-');
    const [h0 = '', mi0 = ''] = t0.split(':');
    return { y: y0, m: m0, day: dd0, hh: h0, mm: mi0 };
  });
  const { y, m, day, hh, mm } = part;
  const d = y && m && day ? 'x' : '';
  const years = [];
  for (let i = to; i >= from; i--) years.push(i);
  const daysIn = y && m ? new Date(Number(y), Number(m), 0).getDate() : 31;

  function emit(next) {
    const n = { ...part, ...next };
    if (withTime && n.y && n.m && n.day) { if (n.hh === '') n.hh = '18'; if (n.mm === '') n.mm = '0'; } // exams normally start at 6 PM
    setPart(n);
    if (!n.y || !n.m || !n.day) { onChange(''); return; }
    const dd = Math.min(Number(n.day), new Date(Number(n.y), Number(n.m), 0).getDate());
    const date = `${n.y}-${pad(Number(n.m))}-${pad(dd)}`;
    onChange(withTime ? `${date}T${pad(Number(n.hh || 18))}:${pad(Number(n.mm || 0))}` : date);
  }
  const cls = 'field !px-2.5';
  return (
    <div role="group" aria-label={label} className="space-y-2">
      <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
        <select aria-label="Day" disabled={disabled} value={day ? String(Number(day)) : ''} onChange={(e) => emit({ day: e.target.value })} className={cls}>
          <option value="">Day</option>
          {Array.from({ length: daysIn }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
        <select aria-label="Month" disabled={disabled} value={m ? String(Number(m)) : ''} onChange={(e) => emit({ m: e.target.value })} className={cls}>
          <option value="">Month</option>
          {MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
        </select>
        <select aria-label="Year" disabled={disabled} value={y} onChange={(e) => emit({ y: e.target.value })} className={cls}>
          <option value="">Year</option>
          {years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
        </select>
      </div>
      {withTime && (
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="Hour" disabled={disabled || !d} value={hh ? String(Number(hh)) : ''} onChange={(e) => emit({ hh: e.target.value })} className={cls}>
            <option value="">Hour</option>
            {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{pad(i)}:00 {i < 12 ? 'AM' : 'PM'}</option>)}
          </select>
          <select aria-label="Minute" disabled={disabled || !d} value={mm !== '' ? String(Number(mm)) : ''} onChange={(e) => emit({ mm: e.target.value })} className={cls}>
            <option value="">Minute</option>
            {[0, 15, 30, 45].map((n) => <option key={n} value={n}>{pad(n)}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
