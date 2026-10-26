'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { getTimerState, splitDuration, formatStartDate, STATUS_META } from '../lib/batch-timer';

// Everything that draws a class clock lives here, so the student banner,
// the admin batch panel and the admin overview all look and tick the same.

// A ticking "now" that follows the SERVER's clock, not the visitor's --
// a student whose phone clock is 3 minutes fast would otherwise see a
// different countdown than everyone else. `serverNow` is stamped when the
// page renders; the offset to the local clock is measured once on mount.
// The initial state is `serverNow` itself (not Date.now()) so the
// server-rendered HTML and the first client render match exactly.
export function useServerClock(serverNow) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const offset = serverNow - Date.now();
    const tick = () => setNow(Date.now() + offset);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [serverNow]);
  return now;
}

const PILL_STYLES = {
  running: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300',
  paused: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
  ended: 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300',
  not_started: 'border-line bg-surfaceMuted text-inkdim'
};

export function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${PILL_STYLES[status]}`}>
      {status === 'running' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
      {status === 'paused' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      {status === 'ended' && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
      Class {STATUS_META[status].label.toLowerCase()}
    </span>
  );
}

const UNITS = [
  ['weeks', 'Weeks'],
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Mins'],
  ['seconds', 'Secs']
];

export function CountdownBoxes({ seconds, dim = false, size = 'md' }) {
  const parts = splitDuration(seconds);
  const big = size === 'md';
  // Five equal columns that share whatever width there is, and the numbers
  // scale with the screen, so the clock never pushes the page sideways.
  return (
    <div className={`grid w-full max-w-full grid-cols-5 gap-1 sm:gap-2 ${big ? 'sm:w-[22rem]' : 'sm:w-[18rem]'} ${dim ? 'opacity-60' : ''}`} role="timer" aria-label="Time remaining">
      {UNITS.map(([key, label]) => (
        <div key={key} className="flex min-w-0 flex-col items-center rounded-lg border border-line bg-surfaceMuted px-0.5 py-1.5 text-center sm:py-2">
          <span className={`font-display font-extrabold tabular-nums leading-tight text-ink ${big ? 'text-[clamp(1rem,4.6vw,1.5rem)]' : 'text-[clamp(0.875rem,3.6vw,1rem)]'}`}>
            {String(parts[key]).padStart(2, '0')}
          </span>
          <span className="max-w-full truncate text-[clamp(8px,2.3vw,10px)] font-medium uppercase tracking-wide text-inkdim">{label}</span>
        </div>
      ))}
    </div>
  );
}

// One batch's status, countdown and start date. Pure presentation --
// `now` comes from useServerClock.
export function BatchClockCard({ batch, now, title, subtitle }) {
  const { status, remainingSeconds } = getTimerState(batch, now);
  const accent = {
    running: 'border-l-emerald-500',
    paused: 'border-l-amber-500',
    ended: 'border-l-red-500',
    not_started: 'border-l-line'
  }[status];

  return (
    <div className={`card flex flex-wrap items-center justify-between gap-3 border-l-4 p-3 sm:p-4 ${accent}`}>
      <div className="min-w-0 flex-1 basis-44">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <StatusPill status={status} />
          {title && <p className="truncate text-sm font-semibold text-ink">{title}</p>}
        </div>
        {subtitle && <p className="truncate text-xs text-inkdim">{subtitle}</p>}
        <p className="mt-1 text-xs text-inkdim">
          {status === 'running' && 'Time left in this course'}
          {status === 'paused' && 'Timer is paused \u2014 it picks up from here when class resumes.'}
          {status === 'ended' && 'This class has ended.'}
          {status === 'not_started' &&
            (batch.start_date ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Starts {formatStartDate(batch.start_date)}
              </span>
            ) : (
              'Start date will be announced.'
            ))}
        </p>
      </div>
      {(status === 'running' || status === 'paused') && <CountdownBoxes seconds={remainingSeconds} dim={status === 'paused'} />}
    </div>
  );
}

const BATCH_COLUMNS =
  'id, label, start_date, class_status, timer_total_seconds, timer_elapsed_seconds, timer_started_at';

// The banner shown at the top of every student page (and on the admin
// overview). `batches` rows carry the timer columns plus `courseName`.
// Updates live: Supabase Realtime pushes the admin's pause/resume the
// moment it happens, and a 15s poll covers the case where Realtime isn't
// enabled for the table -- so "paused" never lingers on a student's
// screen for more than a few seconds.
export default function ClassStatusBanner({ batches, serverNow }) {
  const [rows, setRows] = useState(batches);
  const now = useServerClock(serverNow);
  const idsKey = useMemo(() => batches.map((b) => b.id).join(','), [batches]);

  useEffect(() => setRows(batches), [batches]);

  useEffect(() => {
    if (!idsKey) return undefined;
    const ids = idsKey.split(',');
    const supabase = createClient();
    let active = true;

    const merge = (incoming) =>
      setRows((prev) => prev.map((r) => (r.id === incoming.id ? { ...r, ...incoming } : r)));

    const channel = supabase
      .channel(`batch-status:${idsKey}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'batches' }, (payload) => {
        if (ids.includes(payload.new?.id)) merge(payload.new);
      })
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase.from('batches').select(BATCH_COLUMNS).in('id', ids);
      if (active && data) data.forEach(merge);
    }, 15000);

    return () => {
      active = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [idsKey]);

  if (!rows.length) return null;

  return (
    <div className="mb-6 flex flex-col gap-3">
      {rows.map((b) => (
        <BatchClockCard key={b.id} batch={b} now={now} title={b.label} subtitle={b.courseName} />
      ))}
    </div>
  );
}
