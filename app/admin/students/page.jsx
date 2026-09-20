import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import StudentsTable from '../../../components/admin/StudentsTable';
import AddStudentForm from '../../../components/admin/AddStudentForm';

export const metadata = { title: 'Students — The Foundry' };

export default async function StudentsPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: registrations }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, blocked').eq('role', 'student').order('full_name'),
    supabase.from('registrations').select('user_id, course').eq('status', 'paid')
  ]);

  const coursesByUser = {};
  (registrations || []).forEach((r) => {
    const name = COURSES[r.course]?.name?.split(' — ')[0] || r.course;
    (coursesByUser[r.user_id] ||= []).push(name);
  });

  const students = (profiles || []).map((p) => ({
    ...p,
    courses: coursesByUser[p.id] || []
  }));

  return (
    <div>
      <p className="eyebrow mb-2">Students</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">All students</h1>
      <p className="mb-6 text-sm text-inkdim">
        {students.length} student{students.length === 1 ? '' : 's'} across every batch. For class links and
        per-batch broadcasts, use <span className="font-medium text-ink">Batches</span> instead.
      </p>

      <AddStudentForm />

      <StudentsTable students={students} />
    </div>
  );
}
