// How full each course is and whether its class clock has started. Used to
// close registration by itself:
//   * 50 paid seats taken            -> "All seats taken"
//   * a class timer has been started -> "All seats taken" (the cohort is under way)
// The admin can switch this off per course (course_settings.auto_close).
import { SEAT_LIMIT } from './seat-limit';
export { SEAT_LIMIT };

export async function getCourseLoad(admin) {
  const load = {};
  const row = (c) => (load[c] ||= { paid: 0, started: false });
  try {
    const [{ data: regs }, { data: batches }] = await Promise.all([
      admin.from('registrations').select('course').eq('status', 'paid'),
      admin.from('batches').select('course, class_status, timer_started_at, timer_elapsed_seconds')
    ]);
    (regs || []).forEach((r) => { row(r.course).paid += 1; });
    (batches || []).forEach((b) => {
      if (b.class_status && b.class_status !== 'not_started') row(b.course).started = true;
      else if (b.timer_started_at || b.timer_elapsed_seconds > 0) row(b.course).started = true;
    });
  } catch (err) {
    console.error('getCourseLoad failed (auto-close skipped):', err);
  }
  return load;
}

// 'full' | 'started' | null
export function autoCloseReason(load, settings) {
  if (settings?.auto_close === false) return null;
  if ((load?.paid || 0) >= SEAT_LIMIT) return 'full';
  if (load?.started) return 'started';
  return null;
}
