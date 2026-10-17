import { createClient } from '../../../lib/supabase/server';
import { getUser } from '../../../lib/supabase/session';
import { getTeacherBatches, audienceOptionsFor } from '../../../lib/teacher';
import ContentManager from '../../../components/admin/ContentManager';
import NoBatches from '../../../components/teacher/NoBatches';

export const metadata = { title: 'Links & videos — The Foundry' };

export default async function TeacherContent() {
  const user = await getUser();
  const batches = await getTeacherBatches(user.id);

  let links = [];
  let videos = [];
  if (batches.length) {
    const supabase = await createClient();
    const ids = batches.map((b) => b.id);
    const [l, v] = await Promise.all([
      supabase.from('class_links').select('*').or(`batch_id.in.(${ids.join(',')}),batch_id.is.null`).order('created_at', { ascending: false }),
      supabase.from('class_videos').select('*').or(`batch_id.in.(${ids.join(',')}),batch_id.is.null`).order('created_at', { ascending: false })
    ]);
    links = l.data || [];
    videos = v.data || [];
  }

  return (
    <div>
      <p className="eyebrow mb-2">Content</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Class links &amp; videos</h1>
      <p className="mb-6 text-sm text-inkdim">
        Post a class link or upload a recording for one of your batches. Students in that batch are alerted straight away. Items the admin posted for you show here too — you can
        report them, but only the admin can change or remove them. Set an expiry and they delete themselves.
      </p>
      {!batches.length ? (
        <NoBatches />
      ) : (
        <ContentManager links={links} videos={videos} audienceOptions={audienceOptionsFor(batches)} canTargetAll={false} viewer={{ role: 'teacher', userId: user.id }} />
      )}
    </div>
  );
}
