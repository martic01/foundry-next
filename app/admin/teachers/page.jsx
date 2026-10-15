import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import TeacherManager from '../../../components/admin/TeacherManager';

export const metadata = { title: 'Teachers — The Foundry' };

export default async function TeachersPage() {
  const supabase = await createClient();

  const [{ data: teachers }, { data: assignments }, { data: batches }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, blocked').eq('role', 'teacher').order('full_name'),
    supabase.from('batch_teachers').select('batch_id, teacher_id'),
    supabase.from('batches').select('id, label, course').order('course').order('created_at')
  ]);

  const byTeacher = {};
  (assignments || []).forEach((a) => {
    (byTeacher[a.teacher_id] ||= []).push(a.batch_id);
  });

  const batchGroups = Object.values(COURSES)
    .map((c) => ({
      course: c.key,
      name: c.name.split(' — ')[0],
      batches: (batches || []).filter((b) => b.course === c.key).map((b) => ({ id: b.id, label: b.label }))
    }))
    .filter((g) => g.batches.length);

  return (
    <div>
      <p className="eyebrow mb-2">Teachers</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Teachers</h1>
      <p className="mb-6 text-sm text-inkdim">
        Register a teacher by email, then choose which batches they teach. You can use the email of someone who is already a student (the safest choice): it stays the same account, but the role changes entirely — they only get the teacher dashboard, and their student enrolments are taken off their batches. A teacher only sees the batches you give
        them — their students, that course&apos;s notes (all unlocked), and class links, videos and announcements for
        those batches.
      </p>
      <TeacherManager
        teachers={(teachers || []).map((t) => ({ ...t, batchIds: byTeacher[t.id] || [] }))}
        batchGroups={batchGroups}
      />
    </div>
  );
}
