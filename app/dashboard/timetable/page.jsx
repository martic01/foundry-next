import { createClient } from '../../../lib/supabase/server';
import { getUser } from '../../../lib/supabase/session';
import { COURSES } from '../../../lib/courses';
import { loadTimetable } from '../../../lib/timetable-server';
import TimetableView from '../../../components/timetable/TimetableView';

export const metadata = { title: 'Timetable — The Foundry' };

export default async function StudentTimetable() {
  const supabase = await createClient();
  const user = await getUser();
  const { data: regs } = await supabase
    .from('registrations')
    .select('course, batch_id, blocked, batches(id, label, start_date)')
    .eq('user_id', user.id)
    .eq('status', 'paid');
  const mine = (regs || []).filter((r) => !r.blocked && !COURSES[r.course]?.contactOnly);

  const blocks = await Promise.all(mine.map(async (r) => {
    const t = r.batch_id ? await loadTimetable(supabase, r.batch_id, r.course) : null;
    return { r, t };
  }));

  return (
    <div>
      <p className="eyebrow mb-2">Timetable</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Class timetable</h1>
      <p className="mb-6 text-sm text-inkdim">When your live classes hold. You can download it or add it to your calendar.</p>
      {!blocks.length && <div className="card p-6 text-sm text-inkdim">No active registrations found on this account.</div>}
      <div className="space-y-10">
        {blocks.map(({ r, t }) => (
          <div key={r.course}>
            {!t ? (
              <div className="card p-5 text-sm text-inkdim">You have not been placed in a batch for {COURSES[r.course]?.name} yet. Your timetable will show here once you are.</div>
            ) : (
              <TimetableView
                rows={t.rows}
                isDefault={t.isDefault}
                startDate={r.batches?.start_date || null}
                title={COURSES[r.course]?.name || r.course}
                subtitle={r.batches?.label ? `${r.batches.label}${r.batches.start_date ? '' : ' · start date to be announced'}` : ''}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
