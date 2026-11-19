import { createAdminClient } from '../../../lib/supabase/admin';
import { getUser } from '../../../lib/supabase/session';
import { getTeacherBatches, shortCourseName } from '../../../lib/teacher';
import { hasExam } from '../../../lib/exam/config';
import { loadBatchExamData } from '../../../lib/exam/admin-data';
import ExamRecords from '../../../components/exam/ExamRecords';
import { fmtWat } from '../../../lib/exam/time';

export const metadata = { title: 'Exams — The Foundry' };
export const dynamic = 'force-dynamic';

// Read-only exam records for the batches this teacher teaches AND the admin has allowed.
export default async function TeacherExams() {
  const user = await getUser();
  const mine = (await getTeacherBatches(user.id)).filter((b) => hasExam(b.course));
  const db = createAdminClient();
  const { data: flags } = mine.length ? await db.from('batches').select('id, teacher_can_view_exams').in('id', mine.map((b) => b.id)) : { data: [] };
  const allowed = mine.filter((b) => (flags || []).find((f) => f.id === b.id)?.teacher_can_view_exams);
  const data = await loadBatchExamData(db, allowed.map((b) => b.id));

  return (
    <div>
      <p className="eyebrow mb-2">Exams</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Exam records</h1>
      {!allowed.length ? (
        <div className="card p-6 text-sm text-inkdim">The admin has not allowed exam records for your batches yet.</div>
      ) : (
        <div className="space-y-8">
          {allowed.map((b) => {
            const sched = data.schedules.find((s) => s.batch_id === b.id && !s.user_id);
            return (
              <section key={b.id}>
                <h2 className="mb-1 font-display text-lg font-extrabold text-ink">{shortCourseName(b.course)} · {b.label}</h2>
                <p className="mb-3 text-xs text-inkdim">{sched ? `Exam: ${fmtWat(sched.starts_at)}${sched.activated ? ' · open' : ''}` : 'No exam date set yet'}</p>
                <ExamRecords batchId={b.id} students={data.students.filter((s) => s.batchId === b.id)} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
