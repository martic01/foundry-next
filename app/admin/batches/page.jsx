import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { getPayment, getSource } from '../../../lib/payments';
import BatchPanel from '../../../components/admin/BatchPanel';
import UnassignedStudents from '../../../components/admin/UnassignedStudents';
import CreateBatchForm from '../../../components/admin/CreateBatchForm';

export const metadata = { title: 'Batches — The Foundry' };

export default async function BatchesPage() {
  const supabase = await createClient();

  const regBase = 'id, course, batch_id, age, paystack_reference, profiles(id, full_name, email, blocked)';
  const [{ data: batches }, { data: teacherRows }, { data: assignments }, withPayment] = await Promise.all([
    supabase.from('batches').select('*').order('course').order('created_at'),
    supabase.from('profiles').select('id, full_name').eq('role', 'teacher').order('full_name'),
    supabase.from('batch_teachers').select('batch_id, teacher_id'),
    supabase.from('registrations').select(`${regBase}, amount_kobo, amount_due_kobo, payment_status`).eq('status', 'paid')
  ]);
  // If the payment-status migration hasn't been run, that select errors --
  // fall back to the old columns so every student still shows.
  const registrations = withPayment.error
    ? (await supabase.from('registrations').select(regBase).eq('status', 'paid')).data
    : withPayment.data;

  const toStudent = (r) => ({
    registrationId: r.id,
    profileId: r.profiles?.id,
    batchId: r.batch_id,
    course: r.course,
    fullName: r.profiles?.full_name || 'Unknown',
    email: r.profiles?.email || '',
    blocked: r.profiles?.blocked || false,
    age: r.age,
    source: getSource(r),
    payment: (({ status, label, tone, detail, balanceKobo }) => ({ status, label, tone, detail, balanceKobo }))(getPayment(r))
  });

  const seatCount = {};
  (registrations || []).forEach((r) => {
    if (r.batch_id) seatCount[r.batch_id] = (seatCount[r.batch_id] || 0) + 1;
  });

  const batchesByCourse = Object.fromEntries(Object.keys(COURSES).map((k) => [k, []]));
  (batches || []).forEach((b) => batchesByCourse[b.course]?.push(b));

  const unassigned = (registrations || []).filter((r) => !r.batch_id).map(toStudent);
  const batchChoices = (course, exceptId) =>
    (batchesByCourse[course] || [])
      .filter((b) => b.id !== exceptId)
      .map((b) => ({ id: b.id, label: b.label, count: seatCount[b.id] || 0, capacity: b.capacity }));

  const teachers = teacherRows || [];
  const teacherIdsByBatch = {};
  (assignments || []).forEach((a) => {
    (teacherIdsByBatch[a.batch_id] ||= []).push(a.teacher_id);
  });

  const serverNow = Date.now();

  return (
    <div>
      <p className="eyebrow mb-2">Batches</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Cohort management</h1>
      <p className="mb-8 text-sm text-inkdim">
        Every course has its own batches of up to 50 students. A new batch is created automatically when one fills
        up, or you can create one yourself, move students between batches of the same course, and assign teachers.
        Class links and videos are on <span className="font-medium text-ink">Content</span>; announcements have their
        own tab.
      </p>

      <CreateBatchForm courses={Object.values(COURSES).map((c) => ({ key: c.key, name: c.name }))} teachers={teachers} />

      {!!unassigned.length && (
        <UnassignedStudents
          students={unassigned}
          batchChoicesByCourse={Object.fromEntries(Object.keys(COURSES).map((k) => [k, batchChoices(k, null)]))}
        />
      )}

      {Object.entries(batchesByCourse).map(([courseKey, entries]) => (
        <section key={courseKey} className="mb-10">
          <h2 className="mb-4 font-display text-lg font-extrabold text-ink">{COURSES[courseKey]?.name || courseKey}</h2>
          <div className="flex flex-col gap-5">
            {entries.length ? (
              entries.map((batch) => (
                <BatchPanel
                  key={batch.id}
                  batch={batch}
                  students={(registrations || []).filter((r) => r.batch_id === batch.id).map(toStudent)}
                  otherBatches={batchChoices(courseKey, batch.id)}
                  serverNow={serverNow}
                  teachers={teachers}
                  teacherIds={teacherIdsByBatch[batch.id] || []}
                />
              ))
            ) : (
              <p className="text-sm text-inkdim">No batches yet for this course — one is created automatically with the first registration.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
