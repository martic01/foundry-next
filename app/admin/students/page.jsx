import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { getCourseSettings } from '../../../lib/course-settings';
import { effectivePrice } from '../../../lib/pricing';
import { getSource, getPayment } from '../../../lib/payments';
import StudentsTable from '../../../components/admin/StudentsTable';
import AddStudentForm from '../../../components/admin/AddStudentForm';

export const metadata = { title: 'Students — The Foundry' };

export default async function StudentsPage() {
  const supabase = await createClient();
  const courseSettings = await getCourseSettings(supabase);
  const prices = Object.fromEntries(Object.values(COURSES).map((c) => [c.key, effectivePrice(c, courseSettings[c.key]).now]));

  const regBase = 'id, user_id, course, batch_id, paystack_reference, amount_kobo, batches(label)';
  const [{ data: profiles }, { data: allBatches }, { data: assignments }, { data: teacherRows }, withPayment] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, blocked, created_at').eq('role', 'student').order('full_name'),
    supabase.from('batches').select('id, course, label, capacity').order('created_at'),
    supabase.from('batch_teachers').select('batch_id, teacher_id'),
    supabase.from('profiles').select('id, full_name').eq('role', 'teacher'),
    supabase.from('registrations').select(`${regBase}, amount_due_kobo, payment_status, payment_method`).eq('status', 'paid')
  ]);
  // Payment-status migration not run yet? Fall back to the old columns so
  // every student still lists (all then read as paid).
  const registrations = withPayment.error
    ? (await supabase.from('registrations').select(regBase).eq('status', 'paid')).data
    : withPayment.data;

  const blockedRes = await supabase.from('registrations').select('id, blocked').eq('status', 'paid');
  const blockedIds = new Set((blockedRes.error ? [] : blockedRes.data || []).filter((r) => r.blocked).map((r) => r.id));

  // Who teaches each batch, and how full each batch is -- so a student's
  // row can show their teacher(s) and offer the other batches of that
  // course to move them to.
  const teacherName = Object.fromEntries((teacherRows || []).map((t) => [t.id, t.full_name]));
  const teachersByBatch = {};
  (assignments || []).forEach((a) => {
    if (teacherName[a.teacher_id]) (teachersByBatch[a.batch_id] ||= []).push(teacherName[a.teacher_id]);
  });
  const seats = {};
  (registrations || []).forEach((r) => {
    if (r.batch_id) seats[r.batch_id] = (seats[r.batch_id] || 0) + 1;
  });
  const batchChoicesByCourse = {};
  (allBatches || []).forEach((b) => {
    (batchChoicesByCourse[b.course] ||= []).push({
      id: b.id,
      label: b.label,
      count: seats[b.id] || 0,
      capacity: b.capacity,
      teachers: teachersByBatch[b.id] || []
    });
  });

  const coursesByUser = {};
  (registrations || []).forEach((r) => {
    const name = COURSES[r.course]?.name?.split(' — ')[0] || r.course;
    // A student can hold several registrations made different ways (say
    // Stage 1 online, Stage 2 added by hand), so the source is per course.
    (coursesByUser[r.user_id] ||= []).push({
      registrationId: r.id,
      courseKey: r.course,
      batchId: r.batch_id,
      blocked: blockedIds.has(r.id),
      teachers: teachersByBatch[r.batch_id] || [],
      label: r.batches?.label ? `${name} (${r.batches.label})` : name,
      source: getSource(r),
      // Plain serialisable fields only (this crosses to a client component).
      payment: (({ status, label, tone, detail, balanceKobo }) => ({ status, label, tone, detail, balanceKobo }))(getPayment(r))
    });
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
        {students.length} student{students.length === 1 ? '' : 's'} across every batch. To move a student
        between batches (and so between teachers), use the batch picker under each course below.
      </p>

      <AddStudentForm prices={prices} />

      <StudentsTable students={students} batchChoicesByCourse={batchChoicesByCourse} />
    </div>
  );
}
