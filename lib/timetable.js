import { NOTES_BY_COURSE } from './notes';

// Class timetable helpers. Times are Lagos time (WAT, UTC+1, no daylight saving).
export const TZ_LABEL = 'Lagos time (WAT)';
export const WEEKDAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAYS_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MAX_ROWS = 120;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const EVENING = ['17:00', '19:00'];
const SATURDAY = ['14:30', '16:00'];
const slot = (weekday) => (weekday === 6 ? SATURDAY : EVENING);

// Which weekdays have a class in a given week. Stage 1 (foundations): the
// Git & GitHub week (week 3) has four classes; the last week has two.
function weekdaysFor(course, week) {
  if (course === 'foundations' && week === 3) return [2, 3, 4, 6];
  if (course === 'foundations' && week === 9) return [2, 4];
  return [2, 4, 6];
}

export function lessonTitles(course) {
  const notes = [...(NOTES_BY_COURSE[course] || [])].sort((a, b) => a.day - b.day);
  return notes.map((n) => ({ day: n.day, title: n.title, week: n.week }));
}

// The timetable shown when the admin has not saved one yet (never stored
// until someone presses Save).
export function defaultTimetable(course) {
  const lessons = lessonTitles(course);
  const total = lessons.length || 27;
  const rows = [];
  let week = 1;
  while (rows.length < total && week <= 30) {
    const days = weekdaysFor(course, week);
        for (const wd of days) {
      if (rows.length >= total) break;
      const [starts, ends] = slot(wd);
      const n = rows.length;
      rows.push({
        sort: n + 1, week, weekday: wd, starts, ends,
        topic: lessons[n] ? `Day ${lessons[n].day}: ${lessons[n].title}` : `Class ${n + 1}`,
        note: lessons[n] && /git/i.test(lessons[n].title) ? 'Git & GitHub week: four classes (Tue, Wed, Thu, Sat)' : ''
      });
    }
    week += 1;
  }
  return rows;
}

export function fmtTime(hhmm) {
  if (!TIME_RE.test(hhmm || '')) return hhmm || '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function fmtRange(r) { return `${fmtTime(r.starts)} – ${fmtTime(r.ends)}`; }

const MS = 86400000;
function parseDate(d) {
  if (!DATE_RE.test(d || '')) return null;
  const t = Date.parse(`${d}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
}

// Date (YYYY-MM-DD) of a class: week 1 is the Monday on or before the batch start.
export function classDate(startDate, week, weekday) {
  const t = parseDate(startDate);
  if (t === null) return null;
  const dow = new Date(t).getUTCDay() || 7; // 1..7, Monday = 1
  const monday = t - (dow - 1) * MS;
  return new Date(monday + ((week - 1) * 7 + (weekday - 1)) * MS).toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  const t = parseDate(iso);
  if (t === null) return '';
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function withDates(rows, startDate) {
  return rows.map((r) => ({ ...r, date: classDate(startDate, r.week, r.weekday) }));
}

// Groups rows by week, in order.
export function groupByWeek(rows) {
  const out = [];
  rows.forEach((r) => {
    let g = out.find((x) => x.week === r.week);
    if (!g) { g = { week: r.week, rows: [] }; out.push(g); }
    g.rows.push(r);
  });
  return out;
}

// ---------- validation (server) ----------
export function cleanRows(input) {
  if (!Array.isArray(input)) return { error: 'Invalid timetable.' };
  if (input.length > MAX_ROWS) return { error: `A timetable can have at most ${MAX_ROWS} classes.` };
  const rows = [];
  for (let i = 0; i < input.length; i++) {
    const r = input[i] || {};
    const week = Number(r.week), weekday = Number(r.weekday);
    if (!Number.isInteger(week) || week < 1 || week > 52) return { error: `Class ${i + 1}: week must be 1 to 52.` };
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) return { error: `Class ${i + 1}: pick a day.` };
    if (!TIME_RE.test(r.starts || '') || !TIME_RE.test(r.ends || '')) return { error: `Class ${i + 1}: enter start and end times.` };
    if (r.ends <= r.starts) return { error: `Class ${i + 1}: the end time must be after the start time.` };
    const topic = String(r.topic ?? '').trim().slice(0, 200);
    const note = String(r.note ?? '').trim().slice(0, 300);
    rows.push({ week, weekday, starts: r.starts, ends: r.ends, topic, note });
  }
  rows.sort((a, b) => a.week - b.week || a.weekday - b.weekday || (a.starts < b.starts ? -1 : a.starts > b.starts ? 1 : 0));
  return { rows: rows.map((r, i) => ({ ...r, sort: i + 1 })) };
}

// ---------- calendar file (.ics) ----------
const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function utcStamp(dateIso, hhmm) {
  const [y, mo, d] = dateIso.split('-').map(Number);
  const [h, m] = hhmm.split(':').map(Number);
  const t = Date.UTC(y, mo - 1, d, h - 1, m); // WAT = UTC+1
  return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
export function buildIcs(rows, { title, startDate }) {
  const dated = withDates(rows, startDate).filter((r) => r.date);
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Foundry//Timetable//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${icsEsc(title)}`];
  dated.forEach((r, i) => {
    lines.push('BEGIN:VEVENT', `UID:foundry-${r.date}-${r.starts.replace(':', '')}-${i}@thefoundry`, `DTSTAMP:${now}`,
      `DTSTART:${utcStamp(r.date, r.starts)}`, `DTEND:${utcStamp(r.date, r.ends)}`,
      `SUMMARY:${icsEsc(`${title}: ${r.topic || `Class ${i + 1}`}`)}`, ...(r.note ? [`DESCRIPTION:${icsEsc(r.note)}`] : []), 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
