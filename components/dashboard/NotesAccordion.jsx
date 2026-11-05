'use client';

import { useState } from 'react';
import { Lock, ChevronDown } from 'lucide-react';

// The note text uses a tiny markup: [text]{.mark} highlights code, *text* switches the
// italic off for a few words, and web addresses become clickable links.
function Rich({ text }) {
  const parts = String(text || '').split(/(\[[^\]]+\]\{\.mark\}|\*[^*]+\*|https?:\/\/[^\s)]+[^\s).,;:])/g);
  return parts.map((p, i) => {
    if (!p) return null;
    let m = p.match(/^\[([^\]]+)\]\{\.mark\}$/);
    if (m) return <code key={i} className="rounded bg-brand/10 px-1 py-0.5 font-mono text-[0.85em] not-italic text-ink">{m[1]}</code>;
    m = p.match(/^\*([^*]+)\*$/);
    if (m) return <span key={i} className="not-italic">{m[1]}</span>;
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-brand underline">{p}</a>;
    return p;
  });
}

function ConceptCard({ concept }) {
  return (
    <div className="rounded-lg border border-line bg-surfaceMuted p-4">
      <p className="mb-2 text-sm font-semibold text-ink">{concept.title}</p>
      <p className="mb-2 text-sm text-inkdim"><Rich text={concept.meaning} /></p>
      {concept.example && <p className="text-sm italic text-brand-dark"><Rich text={concept.example} /></p>}
    </div>
  );
}

function DayRow({ day, unlocked }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => unlocked && setOpen((o) => !o)}
        disabled={!unlocked}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left ${
          unlocked ? 'cursor-pointer hover:bg-surfaceMuted' : 'cursor-not-allowed opacity-60'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surfaceMuted text-xs font-semibold text-inkdim">
            {day.day}
          </span>
          <span className="truncate text-sm font-medium text-ink">{day.title}</span>
        </div>
        {unlocked ? (
          <ChevronDown className={`h-4 w-4 flex-shrink-0 text-inkdim transition ${open ? 'rotate-180' : ''}`} />
        ) : (
          <Lock className="h-4 w-4 flex-shrink-0 text-inkdim" />
        )}
      </button>
      {unlocked && open && (
        <div className="flex flex-col gap-3 px-4 pb-5">
          {day.intro && <p className="text-sm italic text-inkdim">{day.intro}</p>}
          {day.concepts.map((c, i) => (
            <ConceptCard key={i} concept={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotesAccordion({ notes, unlockedDays, hideWeekHeading = false }) {
  const weeks = [];
  notes.forEach((day) => {
    let week = weeks.find((w) => w.week === day.week);
    if (!week) {
      week = { week: day.week, title: day.weekTitle, days: [] };
      weeks.push(week);
    }
    week.days.push(day);
  });

  return (
    <div className="flex flex-col gap-6">
      {weeks.map((w) => (
        <section key={w.week}>
          {!hideWeekHeading && (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">
              Week {w.week} — {w.title}
            </p>
          )}
          <div className="card overflow-hidden p-0">
            {w.days.map((day) => (
              <DayRow key={day.day} day={day} unlocked={unlockedDays.has(day.day)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
