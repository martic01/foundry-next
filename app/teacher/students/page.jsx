import { createClient } from '../../../lib/supabase/server';
import { getUser } from '../../../lib/supabase/session';
import { getTeacherBatches, shortCourseName } from '../../../lib/teacher';
import NoBatches from '../../../components/teacher/NoBatches';

export const metadata = { title: 'Students — The Foundry' };

// Names only, grouped by batch -- no payment details or contact info.
export default async function TeacherStudents() {
  const user = await getUser();
  const batches = await getTeacherBatches(user.id);
  const supabase = await createClient();

  const byBatch = {};
  if (batches.length) {
    const { data } = await supabase
      .from('registrations')
      .select('batch_id, profiles(full_name)')
      .eq('status', 'paid')
      .in('batch_id', batches.map((b) => b.id));
    (data || []).forEach((r) => {
      (byBatch[r.batch_id] ||= []).push(r.profiles?.full_name || 'Unknown');
    });
    Object.values(byBatch).forEach((list) => list.sort((a, b) => a.localeCompare(b)));
  }

  return (
    <div>
      <p className="eyebrow mb-2">Students</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Students in your batches</h1>

      {!batches.length ? (
        <NoBatches />
      ) : (
        <div className="flex flex-col gap-6">
          {batches.map((b) => {
            const names = byBatch[b.id] || [];
            return (
              <section key={b.id} className="card p-5">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-ink">
                    {b.label} <span className="text-sm font-normal text-inkdim">· {shortCourseName(b.course)}</span>
                  </h2>
                  <span className="text-xs text-inkdim">{names.length}/{b.capacity} students</span>
                </div>
                {!names.length ? (
                  <p className="text-sm text-inkdim">No students in this batch yet.</p>
                ) : (
                  <ol className="grid gap-x-6 sm:grid-cols-2">
                    {names.map((n, i) => (
                      <li key={`${n}-${i}`} className="flex gap-2 border-b border-line py-1.5 text-sm text-ink last:border-b-0">
                        <span className="w-6 text-right text-xs text-inkdim">{i + 1}.</span> {n}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
