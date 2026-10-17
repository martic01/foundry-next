import { createClient } from '../../../lib/supabase/server';
import { getUser } from '../../../lib/supabase/session';
import { getTeacherBatches, shortCourseName } from '../../../lib/teacher';
import NoBatches from '../../../components/teacher/NoBatches';
import TeacherStudents from '../../../components/teacher/TeacherStudents';

export const metadata = { title: 'Students — The Foundry' };

// Names only, grouped by batch -- no payment details or contact info.
export default async function TeacherStudentsPage() {
  const user = await getUser();
  const batches = await getTeacherBatches(user.id);
  const supabase = await createClient();

  const byBatch = {};
  if (batches.length) {
    const { data } = await supabase
      .from('registrations')
      .select('batch_id, user_id, profiles!inner(full_name, role)')
      .eq('status', 'paid')
      .eq('profiles.role', 'student')
      .in('batch_id', batches.map((b) => b.id));
    (data || []).forEach((r) => {
      (byBatch[r.batch_id] ||= []).push({ id: r.user_id, name: r.profiles?.full_name || 'Unknown' });
    });
    Object.values(byBatch).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
  }

  const groups = batches.map((b) => ({ id: b.id, label: b.label, course: shortCourseName(b.course), capacity: b.capacity, students: byBatch[b.id] || [] }));

  return (
    <div>
      <p className="eyebrow mb-2">Students</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Students in your batches</h1>
      <p className="mb-6 text-sm text-inkdim">Search for a student, and use Report to tell the admin about any issue with them.</p>

      {!batches.length ? <NoBatches /> : <TeacherStudents batches={groups} />}
    </div>
  );
}
