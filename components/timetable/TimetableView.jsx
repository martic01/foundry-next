'use client';

import { Download, CalendarPlus, Printer } from 'lucide-react';
import { WEEKDAYS, TZ_LABEL, fmtRange, fmtDate, withDates, groupByWeek, buildIcs } from '../../lib/timetable';

// Read-only timetable (students, teachers, and the admin's preview).
// Table on wide screens, cards on phones; "Download PDF" prints just this
// block (the browser's Save as PDF), "Add to calendar" downloads an .ics.
export default function TimetableView({ rows, startDate, title, subtitle, isDefault }) {
  const dated = withDates(rows, startDate);
  const weeks = groupByWeek(dated);
  const hasDates = dated.some((r) => r.date);

  function print() {
    const el = document.documentElement;
    el.classList.add('printing-tt');
    const done = () => { el.classList.remove('printing-tt'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  }
  function ics() {
    const blob = new Blob([buildIcs(rows, { title, startDate })], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-timetable.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return (
    <div>
      <div className="tt-noprint mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={print} className="cta-btn"><Download className="h-4 w-4" /> Download PDF</button>
        {hasDates && <button type="button" onClick={ics} className="cta-btn-outline"><CalendarPlus className="h-4 w-4" /> Add to calendar (.ics)</button>}
        <button type="button" onClick={print} className="cta-btn-outline"><Printer className="h-4 w-4" /> Print</button>
      </div>

      <div className="tt-print">
        <div className="mb-4">
          <h2 className="font-display text-lg font-extrabold text-ink">{title} — class timetable</h2>
          {subtitle && <p className="text-sm text-inkdim">{subtitle}</p>}
          <p className="text-xs text-inkdim">All times are {TZ_LABEL}.{hasDates ? '' : ' Dates appear once the batch start date is set.'}</p>
        </div>
        {!rows.length && <p className="text-sm text-inkdim">No classes have been scheduled yet.</p>}

        {weeks.map((w) => (
          <section key={w.week} className="mb-5 break-inside-avoid">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-dark">Week {w.week}{w.rows.length > 3 ? ` · ${w.rows.length} classes` : ''}</h3>

            <div className="card hidden overflow-hidden desktop:block print:block">
              <table className="w-full text-sm">
                <thead className="bg-surfaceMuted text-left text-xs uppercase tracking-wide text-inkdim">
                  <tr><th className="px-3 py-2">Day</th>{hasDates && <th className="px-3 py-2">Date</th>}<th className="px-3 py-2">Time</th><th className="px-3 py-2">Topic</th></tr>
                </thead>
                <tbody>
                  {w.rows.map((r) => (
                    <tr key={r.sort} className="border-t border-line align-top">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">{WEEKDAYS[r.weekday]}</td>
                      {hasDates && <td className="whitespace-nowrap px-3 py-2 text-inkdim">{fmtDate(r.date)}</td>}
                      <td className="whitespace-nowrap px-3 py-2 text-ink">{fmtRange(r)}</td>
                      <td className="px-3 py-2 text-ink">{r.topic}{r.note && <span className="block text-xs text-inkdim">{r.note}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 desktop:hidden print:hidden">
              {w.rows.map((r) => (
                <li key={r.sort} className="card p-3">
                  <p className="text-sm font-semibold text-ink">{WEEKDAYS[r.weekday]}{r.date ? ` · ${fmtDate(r.date)}` : ''}</p>
                  <p className="text-sm text-brand-dark">{fmtRange(r)}</p>
                  <p className="mt-1 break-words text-sm text-ink">{r.topic}</p>
                  {r.note && <p className="text-xs text-inkdim">{r.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {isDefault && <p className="tt-noprint text-xs text-inkdim">This is the standard schedule for the course. It will update if the school changes it.</p>}
      </div>
    </div>
  );
}
