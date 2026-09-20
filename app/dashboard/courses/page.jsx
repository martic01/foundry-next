import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import Receipt from '../../../components/dashboard/Receipt';
import ClassVideos from '../../../components/dashboard/ClassVideos';
import Tabs from '../../../components/Tabs';

export const metadata = { title: 'My courses — The Foundry' };

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const { data: registrations } = await supabase
    .from('registrations')
    .select('*, batches(*, class_links(*))')
    .eq('user_id', user.id)
    .eq('status', 'paid');

  const batchIds = (registrations || []).map((r) => r.batches?.id).filter(Boolean);
  const { data: videos } = batchIds.length
    ? await supabase.from('class_videos').select('*').in('batch_id', batchIds).order('created_at', { ascending: false })
    : { data: [] };

  return (
    <div>
      <p className="eyebrow mb-2">My courses</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Courses &amp; class links</h1>

      {!registrations?.length && (
        <div className="card p-6 text-sm text-inkdim">No active registrations found on this account.</div>
      )}

      <div className="flex flex-col gap-6">
        {registrations?.map((reg) => {
          const course = COURSES[reg.course];
          // class_links.batch_id is that table's primary key, so this is
          // a one-to-one relationship -- PostgREST may return it as a
          // single object or as a one-item array depending on version,
          // so handle both rather than assume one.
          const batch = reg.batches;
          const classLinkRow = Array.isArray(batch?.class_links) ? batch.class_links[0] : batch?.class_links;
          const classLink = classLinkRow?.url;
          const batchVideos = (videos || []).filter((v) => v.batch_id === batch?.id);

          return (
            <section key={reg.id} className="card p-6">
              <p className="mb-1 text-sm font-semibold text-ink">{course?.name || reg.course}</p>
              <p className="mb-4 text-xs text-inkdim">
                {batch ? `Batch: ${batch.label}` : 'Batch assignment pending'}
              </p>

              <Tabs
                tabs={[
                  {
                    key: 'class-link',
                    label: 'Class link',
                    content: (
                      <div className="rounded-lg border border-line bg-surfaceMuted p-4">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-inkdim">Class link</p>
                        {classLink ? (
                          <a href={classLink} target="_blank" rel="noopener noreferrer" className="cta-btn mt-1 inline-flex">
                            Join class &rarr;
                          </a>
                        ) : (
                          <p className="text-sm text-inkdim">Not posted yet — check back closer to the start date.</p>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'videos',
                    label: 'Class videos',
                    content: <ClassVideos videos={batchVideos} />
                  },
                  {
                    key: 'receipt',
                    label: 'Receipt',
                    content: (
                      <div>
                        <Receipt
                          reference={reg.paystack_reference}
                          paidAt={new Date(reg.created_at)}
                          amountKobo={reg.amount_kobo}
                          course={course}
                          studentName={profile?.full_name || user.user_metadata?.full_name || user.email}
                          studentEmail={profile?.email || user.email}
                          compact
                        />
                        <a
                          href={`/receipt/${reg.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cta-btn-outline mt-3 inline-flex !py-2 text-sm"
                        >
                          Download as PDF &rarr;
                        </a>
                      </div>
                    )
                  }
                ]}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
