import { createClient } from '../../../lib/supabase/server';
import { getUser, getProfile } from '../../../lib/supabase/session';
import { COURSES } from '../../../lib/courses';
import Receipt from '../../../components/dashboard/Receipt';
import ClassVideos from '../../../components/dashboard/ClassVideos';
import { getPayment } from '../../../lib/payments';
import Tabs from '../../../components/Tabs';
import { formatStartDate } from '../../../lib/batch-timer';
import { safeHref } from '../../../lib/safe-url';

export const metadata = { title: 'My courses — The Foundry' };

export default async function CoursesPage() {
  const supabase = await createClient();
  const user = await getUser();

  // None of these depend on each other, so they all go out at once.
  // RLS limits videos/links to what this student may see: items for their
  // own batch(es) plus items aimed at ALL batches (batch_id null).
  // Per-course filtering below just picks the right ones for each section.
  const [profile, { data: registrations }, { data: videos }, { data: links }] = await Promise.all([
    getProfile(user.id),
    supabase.from('registrations').select('*, batches(*)').eq('user_id', user.id).eq('status', 'paid'),
    supabase.from('class_videos').select('*').order('created_at', { ascending: false }),
    supabase.from('class_links').select('*').order('created_at', { ascending: false })
  ]);

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
          const batch = reg.batches;
          const appliesHere = (item) => item.batch_id === null || item.batch_id === batch?.id;
          const batchLinks = (links || []).filter(appliesHere);
          const batchVideos = (videos || []).filter(appliesHere);

          return (
            <section key={reg.id} className="card p-6">
              <p className="mb-1 text-sm font-semibold text-ink">{course?.name || reg.course}</p>
              <p className="mb-4 text-xs text-inkdim">
                {batch ? `Batch: ${batch.label}` : 'Batch assignment pending'}
                {batch?.start_date ? ` · Starts ${formatStartDate(batch.start_date)}` : ''}
              </p>

              <Tabs
                tabs={[
                  {
                    key: 'class-link',
                    label: 'Class link',
                    content: (
                      <div className="rounded-lg border border-line bg-surfaceMuted p-4">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-inkdim">Class link</p>
                        {batchLinks.length ? (
                          <div className="mt-2 flex flex-col gap-2">
                            {batchLinks.map((l, i) => (
                              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                                {l.title && <p className="text-sm font-medium text-ink">{l.title}</p>}
                                <a href={safeHref(l.url)} target="_blank" rel="noopener noreferrer" className={`${i === 0 ? 'cta-btn' : 'cta-btn-outline'} inline-flex !py-2 text-sm`}>
                                  Join class &rarr;
                                </a>
                              </div>
                            ))}
                          </div>
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
                    content: getPayment(reg).receivedKobo <= 0 ? (
                      <p className="text-sm text-inkdim">
                        No payment has been recorded for this course yet, so there&apos;s no receipt.
                      </p>
                    ) : (
                      <div>
                        <Receipt
                          reference={reg.paystack_reference}
                          paidAt={new Date(reg.created_at)}
                          amountKobo={reg.amount_kobo}
                          course={course}
                          studentName={profile?.full_name || user.user_metadata?.full_name || user.email}
                          studentEmail={profile?.email || user.email}
                          paymentMethod={getPayment(reg).method}
                          statusLabel={getPayment(reg).label}
                          balanceKobo={getPayment(reg).balanceKobo}
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
