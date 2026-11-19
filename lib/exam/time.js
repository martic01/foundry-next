// Exam dates are entered and shown in Lagos time (WAT, UTC+1, no daylight saving).
export const WAT = 'Africa/Lagos';

// "2027-03-09T10:00" (what <input type="datetime-local"> gives) -> ISO instant, or null if invalid.
export function watToIso(local) {
  if (typeof local !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const t = Date.parse(`${local}:00+01:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

// ISO instant -> "2027-03-09T10:00" in Lagos time, for filling an input.
export function isoToWatLocal(iso) {
  const t = Date.parse(iso || '');
  if (Number.isNaN(t)) return '';
  return new Date(t + 3600000).toISOString().slice(0, 16);
}

export function fmtWat(iso, { time = true } = {}) {
  const t = Date.parse(iso || '');
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    ...(time ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}), timeZone: WAT
  });
}

// Next 6:00 PM (or `hour`) Lagos time that is still in the future: the default exam time.
export function defaultExamStart(hour = 18, now = Date.now()) {
  const day = new Date(now + 3600000).toISOString().slice(0, 10);
  let t = Date.parse(`${day}T${String(hour).padStart(2, '0')}:00:00+01:00`);
  if (t <= now) t += 86400000;
  return new Date(t).toISOString();
}
