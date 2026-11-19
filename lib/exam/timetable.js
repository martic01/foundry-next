import { classDate } from '../timetable';
import { effectiveSchedule } from './rules';
import { EXAM_RULES, hasExam } from './config';

// The exam line shown on the timetable: the admin's date when set, otherwise a provisional date
// a week after the last class. Returns null for courses with no exam or while no dates exist.
export async function examForTimetable(db, { batchId, userId = null, course, rows, startDate }) {
  if (!hasExam(course) || !batchId) return null;
  const { data } = await db.from('exam_schedules').select('*').eq('batch_id', batchId);
  const eff = effectiveSchedule(data || [], userId);
  if (eff) return { startsAt: eff.startsAt, provisional: false, personal: eff.personal, durationMinutes: eff.batchRow?.duration_minutes || 120 };
  const last = rows?.length ? rows[rows.length - 1] : null;
  const d = last ? classDate(startDate, last.week, last.weekday) : null;
  if (!d) return null;
  const t = Date.parse(`${d}T00:00:00Z`) + EXAM_RULES.daysAfterCourse * 86400000;
  const iso = new Date(t).toISOString().slice(0, 10);
  return { startsAt: new Date(Date.parse(`${iso}T${String(EXAM_RULES.defaultExamHourWAT).padStart(2, '0')}:00:00+01:00`)).toISOString(), provisional: true, personal: false, durationMinutes: 120 };
}
