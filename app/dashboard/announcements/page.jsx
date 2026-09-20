import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import MessageFeed from '../../../components/dashboard/MessageFeed';

export const metadata = { title: 'Announcements — The Foundry' };

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: registrations } = await supabase
    .from('registrations')
    .select('course, batches(id, label)')
    .eq('user_id', user.id)
    .eq('status', 'paid');

  const batches = (registrations || [])
    .filter((r) => r.batches?.id)
    .map((r) => ({ id: r.batches.id, label: r.batches.label, course: r.course }));

  return (
    <div>
      <p className="eyebrow mb-2">Announcements</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Announcements</h1>

      {!batches.length ? (
        <div className="card p-6 text-sm text-inkdim">
          Announcements will appear here once you&apos;re assigned to a batch.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {batches.map((b) => (
            <section key={b.id} className="card p-6">
              <p className="mb-1 text-sm font-semibold text-ink">{COURSES[b.course]?.name || b.course}</p>
              <p className="mb-4 text-xs text-inkdim">Batch: {b.label}</p>
              <MessageFeed batchId={b.id} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
