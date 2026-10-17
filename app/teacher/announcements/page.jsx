import { createClient } from '../../../lib/supabase/server';
import { getUser } from '../../../lib/supabase/session';
import { getTeacherBatches, audienceOptionsFor } from '../../../lib/teacher';
import AnnouncementManager from '../../../components/admin/AnnouncementManager';
import NoBatches from '../../../components/teacher/NoBatches';

export const metadata = { title: 'Announcements — The Foundry' };

export default async function TeacherAnnouncements() {
  const user = await getUser();
  const batches = await getTeacherBatches(user.id);

  let messages = [];
  if (batches.length) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`batch_id.in.(${batches.map((b) => b.id).join(',')}),batch_id.is.null`)
      .order('created_at', { ascending: false });
    messages = data || [];
  }

  return (
    <div>
      <p className="eyebrow mb-2">Announcements</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Announcements</h1>
      <p className="mb-6 text-sm text-inkdim">
        Each announcement pops up for the students in the batch you choose, and they tap &ldquo;I&apos;m ready&rdquo; to
        close it.
      </p>
      {!batches.length ? (
        <NoBatches />
      ) : (
        <div className="card p-5">
          <AnnouncementManager messages={messages} audienceOptions={audienceOptionsFor(batches)} viewer={{ role: 'teacher', userId: user.id }} />
        </div>
      )}
    </div>
  );
}
