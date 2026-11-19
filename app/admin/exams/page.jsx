import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { COURSES } from '../../../lib/courses';
import { hasExam, EXAMS, examSettings } from '../../../lib/exam/config';
import { BANK } from '../../../lib/exam/bank';
import { loadBatchExamData } from '../../../lib/exam/admin-data';
import { loadTimetable } from '../../../lib/timetable-server';
import { examForTimetable } from '../../../lib/exam/timetable';
import BatchExamControl from '../../../components/exam/BatchExamControl';
import ExamRecords from '../../../components/exam/ExamRecords';
import RescheduleRequests from '../../../components/exam/RescheduleRequests';
import ProofRetention from '../../../components/exam/ProofRetention';
import { getRetention } from '../../../lib/exam/proof';

export const metadata = { title: 'Exams — The Foundry' };
export const dynamic = 'force-dynamic';

export default async function AdminExams() {
  const supabase = await createClient();
  const db = createAdminClient();
  const { data: batches } = await supabase.from('batches').select('*').order('course').order('created_at');
  const list = (batches || []).filter((b) => hasExam(b.course));
  const data = await loadBatchExamData(db, list.map((b) => b.id));
  const label = Object.fromEntries(list.map((b) => [b.id, `${(COURSES[b.course]?.name || b.course).split(' — ')[0]} · ${b.label}`]));
  const nameOf = Object.fromEntries(data.students.map((s) => [s.userId, s.name]));
  const pending = data.requests.filter((r) => r.status === 'pending').map((r) => ({ ...r, name: nameOf[r.user_id] || 'Student', batchLabel: label[r.batch_id] || '' }));

  const cards = await Promise.all(list.map(async (b) => {
    const t = await loadTimetable(supabase, b.id, b.course);
    const prov = await examForTimetable(db, { batchId: b.id, course: b.course, rows: t.rows, startDate: b.start_date || null });
    return { b, prov: prov?.provisional ? prov.startsAt : null };
  }));

  return (
    <div>
      <p className="eyebrow mb-2">Exams</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Exams</h1>
      <p className="mb-6 text-sm text-inkdim">
        Questions are drawn at random from the question bank (set the length and numbers per batch below). Students get 3 free attempts with a 2-day gap, then ₦5,000 per retake. Students see the Exam tab only after you open it.
      </p>
      <RescheduleRequests items={pending} />
      <ProofRetention {...(await getRetention(createAdminClient()))} />
      {!list.length && <div className="card p-6 text-sm text-inkdim">No batches with an exam yet.</div>}
      <div className="space-y-10">
        {cards.map(({ b, prov }) => {
          const rows = data.schedules.filter((s) => s.batch_id === b.id);
          const batchRow = rows.find((s) => !s.user_id) || null;
          const personal = Object.fromEntries(rows.filter((s) => s.user_id).map((s) => [s.user_id, { startsAt: s.starts_at, activated: !!s.activated }]));
          const students = data.students.filter((s) => s.batchId === b.id);
          const passed = students.filter((s) => s.summary?.passed).length;
          return (
            <section key={b.id} className="card p-5">
              <h2 className="mb-1 font-display text-lg font-extrabold text-ink">{label[b.id]}</h2>
              <p className="mb-4 text-xs text-inkdim">{students.length} students · {passed} passed</p>
              <BatchExamControl batchId={b.id} schedule={batchRow} provisionalIso={prov} teacherCanView={!!b.teacher_can_view_exams} sections={EXAMS[b.course].sections} bankSizes={Object.fromEntries(Object.entries(BANK).map(([k, v]) => [k, v.length]))} settings={examSettings(b.course, batchRow)} ownDateCount={Object.keys(personal).length} />
              <h3 className="mb-2 mt-6 text-sm font-semibold text-ink">Students and records</h3>
              <ExamRecords admin batchId={b.id} students={students} personal={personal} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
