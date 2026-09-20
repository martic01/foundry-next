import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import BatchPanel from '../../../components/admin/BatchPanel';

export const metadata = { title: 'Batches — The Foundry' };

export default async function BatchesPage() {
  const supabase = await createClient();

  // batches(*, class_links(*)) -- class_links.batch_id is that table's
  // primary key, so PostgREST may embed it as a single object or a
  // one-item array depending on version; normalized below either way.
  const [{ data: batches }, { data: registrations }, { data: videos }] = await Promise.all([
    supabase.from('batches').select('*, class_links(*)').order('course').order('created_at'),
    supabase
      .from('registrations')
      .select('id, course, batch_id, age, profiles(id, full_name, email, blocked)')
      .eq('status', 'paid'),
    supabase.from('class_videos').select('*').order('created_at', { ascending: false })
  ]);

  const batchesByCourse = { foundations: [], react: [] };
  (batches || []).forEach((b) => {
    const linkRow = Array.isArray(b.class_links) ? b.class_links[0] : b.class_links;
    const students = (registrations || [])
      .filter((r) => r.batch_id === b.id)
      .map((r) => ({
        registrationId: r.id,
        profileId: r.profiles?.id,
        fullName: r.profiles?.full_name || 'Unknown',
        email: r.profiles?.email || '',
        blocked: r.profiles?.blocked || false,
        age: r.age
      }));
    const batchVideos = (videos || []).filter((v) => v.batch_id === b.id);
    batchesByCourse[b.course]?.push({ batch: b, students, classLinkUrl: linkRow?.url, videos: batchVideos });
  });

  return (
    <div>
      <p className="eyebrow mb-2">Batches</p>
      <h1 className="mb-8 font-display text-2xl font-extrabold text-ink">Cohort management</h1>

      {Object.entries(batchesByCourse).map(([courseKey, entries]) => (
        <section key={courseKey} className="mb-10">
          <h2 className="mb-4 font-display text-lg font-extrabold text-ink">
            {COURSES[courseKey]?.name || courseKey}
          </h2>
          <div className="flex flex-col gap-5">
            {entries.length ? (
              entries.map(({ batch, students, classLinkUrl, videos }) => (
                <BatchPanel key={batch.id} batch={batch} students={students} classLinkUrl={classLinkUrl} videos={videos} />
              ))
            ) : (
              <p className="text-sm text-inkdim">No batches yet for this course.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
