// Class timer for a batch -- pure functions, shared by the server actions
// (app/admin/actions.js) and every client component that draws a
// countdown, so both sides always agree on what "remaining" means.
//
// Stored on the batches row:
//   class_status           'not_started' | 'running' | 'paused' | 'ended'
//   timer_total_seconds    length of the course clock (9 weeks)
//   timer_elapsed_seconds  time already used up BEFORE the current run
//   timer_started_at       when the current run began (only while running)
//
// remaining = total - elapsed - (now - started_at, only while running)
// Pausing folds the current run into `elapsed`; resuming starts a new
// run. That is why pause/resume never drifts.

export const DEFAULT_TIMER_SECONDS = 9 * 7 * 24 * 60 * 60; // 9 weeks

export const STATUS_META = {
  not_started: { label: 'Not started' },
  running: { label: 'On' },
  paused: { label: 'Paused' },
  ended: { label: 'Ended' }
};

export function getTimerState(batch, nowMs = Date.now()) {
  const total = batch?.timer_total_seconds || DEFAULT_TIMER_SECONDS;
  const rawStatus = batch?.class_status || 'not_started';
  let elapsed = batch?.timer_elapsed_seconds || 0;

  if (rawStatus === 'running' && batch.timer_started_at) {
    elapsed += Math.max(0, (nowMs - new Date(batch.timer_started_at).getTime()) / 1000);
  }

  const remainingSeconds = Math.max(0, Math.ceil(total - elapsed));
  // A running clock that has hit zero is over, even if nobody has
  // clicked End yet.
  const status = rawStatus === 'running' && remainingSeconds <= 0 ? 'ended' : rawStatus;

  return {
    status,
    rawStatus,
    totalSeconds: total,
    remainingSeconds: status === 'not_started' ? total : status === 'ended' ? 0 : remainingSeconds
  };
}

export function splitDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    weeks: Math.floor(s / 604800),
    days: Math.floor((s % 604800) / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60
  };
}

// Works out what to write to the batches row for an admin action, or why
// it isn't allowed. Validating against the DERIVED status means e.g.
// "Pause" is refused on a clock that has already run out.
export function computeTimerTransition(batch, action, nowMs = Date.now()) {
  const { status, totalSeconds } = getTimerState(batch, nowMs);
  const nowIso = new Date(nowMs).toISOString();
  const elapsedNow = () => {
    let e = batch.timer_elapsed_seconds || 0;
    if (batch.class_status === 'running' && batch.timer_started_at) {
      e += Math.max(0, (nowMs - new Date(batch.timer_started_at).getTime()) / 1000);
    }
    return Math.min(totalSeconds, Math.round(e));
  };

  switch (action) {
    case 'start':
      if (status !== 'not_started') return { error: 'This batch has already been started. Use Restart to begin again.' };
      return {
        fields: {
          class_status: 'running',
          timer_total_seconds: totalSeconds,
          timer_elapsed_seconds: 0,
          timer_started_at: nowIso,
          timer_ended_at: null
        }
      };
    case 'pause':
      if (status !== 'running') return { error: 'Only a running class can be paused.' };
      return {
        fields: { class_status: 'paused', timer_elapsed_seconds: elapsedNow(), timer_started_at: null }
      };
    case 'resume':
      if (status !== 'paused') return { error: 'Only a paused class can be resumed.' };
      return { fields: { class_status: 'running', timer_started_at: nowIso } };
    case 'restart':
      if (status === 'not_started') return { error: 'Start the batch first.' };
      return {
        fields: {
          class_status: 'running',
          timer_elapsed_seconds: 0,
          timer_started_at: nowIso,
          timer_ended_at: null
        }
      };
    case 'reset':
      // Back to the very beginning: only the Start button shows again.
      if (batch.class_status === 'not_started' && !batch.timer_elapsed_seconds && !batch.timer_started_at) return { error: 'The timer is already in its starting state.' };
      return {
        fields: {
          class_status: 'not_started',
          timer_elapsed_seconds: 0,
          timer_started_at: null,
          timer_ended_at: null
        }
      };
    case 'end':
      if (status === 'not_started') return { error: 'This batch has not started yet.' };
      // Already ended in the DB: nothing to do.
      if (batch.class_status === 'ended') return { error: 'This class has already ended.' };
      return {
        fields: {
          class_status: 'ended',
          timer_elapsed_seconds: elapsedNow(),
          timer_started_at: null,
          timer_ended_at: nowIso
        }
      };
    default:
      return { error: 'Unknown timer action.' };
  }
}

// Plain calendar date (the admin's start_date) -> "Mon, 12 October 2026".
export function formatStartDate(yyyyMmDd) {
  if (!yyyyMmDd) return '';
  // Parsed as a plain calendar date at noon UTC so the weekday/day never
  // shifts with the visitor's timezone.
  return new Date(`${yyyyMmDd}T12:00:00Z`).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

