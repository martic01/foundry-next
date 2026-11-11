import { createClient } from '../../../lib/supabase/server';
import { getUser } from '../../../lib/supabase/session';
import { getTeacherBatches, shortCourseName } from '../../../lib/teacher';
import { COURSES } from '../../../lib/courses';
import { loadTimetable } from '../../../lib/timetable-server';
import TimetableView from '../../../components/timetable/TimetableView';
import TimetableEditor from '../../../components/timetable/TimetableEditor';
import NoBatches from '../../../components/teacher/NoBatches';

export const metadata = { title: 'Timetable — The Foundry' };

export default async function TeacherTimetable() {
  const user = await getUser();
  const batches = await getTeacherBatches(user.id);
  const supabase = await createClient();
  // The permission flags come from their own query so a missing column
  // (database file 11 not run yet) cannot break the page.
  const flagRes = batches.length ? await supabase.from('batches').select('id, teacher_can_edit_start, teacher_can_edit_timetable').in('id', batches.map((b) => b.id)) : { data: [] };
  const flags = Object.fromEntries((flagRes.data || []).map((f) => [f.id, f]));
  const blocks = await Promise.all(batches.map(async (b) => ({ b, t: await loadTimetable(supabase, b.id, b.course) })));

  return (
    <div>
      <p className="eyebrow mb-2">Timetable</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Class timetable</h1>
      <p className="mb-6 text-sm text-inkdim">Class days and times for the batches you teach. If the admin has allowed it, you can edit them here.</p>
      {!batches.length ? <NoBatches /> : (
        <div className="space-y-12">
          {blocks.map(({ b, t }) => {
            const f = flags[b.id] || {};
            const title = `${COURSES[b.course]?.name || shortCourseName(b.course)} · ${b.label}`;
            return (
              <div key={b.id}>
                {(f.teacher_can_edit_start || f.teacher_can_edit_timetable) ? (
                  <TimetableEditor batchId={b.id} title={title} course={b.course} rows={t.rows} isDefault={t.isDefault} startDate={b.start_date || ''}
                    canEditStart={!!f.teacher_can_edit_start} canEditRows={!!f.teacher_can_edit_timetable} />
                ) : (
                  <TimetableView rows={t.rows} isDefault={false} startDate={b.start_date || null} title={title} subtitle={b.start_date ? '' : 'Start date not set yet'} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
