import { cache } from 'react';
import { createClient } from './supabase/server';
import { COURSES } from './courses';

// Everything a teacher page needs, once per request: the batches this
// teacher is assigned to (and nothing else). The explicit batch_teachers
// filter is the app-level scoping; Postgres RLS (teaches_batch) enforces
// the same thing underneath.
export const getTeacherBatches = cache(async (userId) => {
  const supabase = await createClient();
  const { data: rows } = await supabase.from('batch_teachers').select('batch_id').eq('teacher_id', userId);
  const ids = (rows || []).map((r) => r.batch_id);
  if (!ids.length) return [];
  const { data: batches } = await supabase
    .from('batches')
    .select('id, course, label, capacity, start_date, class_status, timer_total_seconds, timer_elapsed_seconds, timer_started_at')
    .in('id', ids)
    .order('course')
    .order('created_at');
  return batches || [];
});

export const shortCourseName = (key) => COURSES[key]?.name?.split(' — ')[0] || key;

export function audienceOptionsFor(batches) {
  return batches.map((b) => ({ value: b.id, label: `${shortCourseName(b.course)} · ${b.label}` }));
}
