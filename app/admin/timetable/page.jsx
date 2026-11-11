import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { loadTimetable } from '../../../lib/timetable-server';
import TimetableEditor from '../../../components/timetable/TimetableEditor';

export const metadata = { title: 'Timetable — The Foundry' };

export default async function AdminTimetable({ searchParams }) {
  const supabase = await createClient();
  const { data: batches } = await supabase.from('batches').select('*').order('course').order('created_at');
  const list = (batches || []).filter((b) => !COURSES[b.course]?.contactOnly);
  const picked = list.find((b) => b.id === searchParams?.batch) || list[0];
  const t = picked ? await loadTimetable(supabase, picked.id, picked.course) : null;

  return (
    <div>
      <p className="eyebrow mb-2">Timetable</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Class timetable</h1>
      <p className="mb-5 text-sm text-inkdim">Each batch has its own timetable. Edit days, times and topics, set the batch start date, and choose what the batch&apos;s teachers may change.</p>
      {!list.length ? <div className="card p-6 text-sm text-inkdim">No batches yet.</div> : (
        <>
          <form className="mb-6 flex flex-wrap items-center gap-2" method="get">
            <label htmlFor="batch" className="text-xs font-medium uppercase tracking-wide text-inkdim">Batch</label>
            <select id="batch" name="batch" defaultValue={picked.id} className="field max-w-full sm:max-w-md">
              {list.map((b) => <option key={b.id} value={b.id}>{(COURSES[b.course]?.name || b.course).split(' — ')[0]} · {b.label}</option>)}
            </select>
            <button className="cta-btn-outline">Show</button>
          </form>
          <TimetableEditor
            key={picked.id}
            admin
            batchId={picked.id}
            course={picked.course}
            title={`${COURSES[picked.course]?.name || picked.course} · ${picked.label}`}
            rows={t.rows}
            isDefault={t.isDefault}
            startDate={picked.start_date || ''}
            canEditStart
            canEditRows
            perms={{ start: !!picked.teacher_can_edit_start, timetable: !!picked.teacher_can_edit_timetable }}
          />
        </>
      )}
    </div>
  );
}
