import { defaultTimetable } from './timetable';

// Saved rows for a batch, or the generated default when none are saved.
export async function loadTimetable(supabase, batchId, course) {
  const { data, error } = await supabase.from('batch_timetable').select('sort, week, weekday, starts, ends, topic, note').eq('batch_id', batchId).order('sort');
  if (!error && data?.length) return { rows: data, isDefault: false };
  return { rows: defaultTimetable(course), isDefault: true };
}
