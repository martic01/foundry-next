import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import AnnouncementManager from '../../../components/admin/AnnouncementManager';

export const metadata = { title: 'Announcements — The Foundry' };

export default async function AnnouncementsPage() {
  const supabase = await createClient();

  const [{ data: batches }, { data: messages }] = await Promise.all([
    supabase.from('batches').select('id, label, course').order('course').order('created_at'),
    supabase.from('messages').select('*').order('created_at', { ascending: false })
  ]);

  const short = (course) => COURSES[course]?.name?.split(' — ')[0] || course;
  const audienceOptions = [
    { value: 'all', label: 'All batches' },
    ...(batches || []).map((b) => ({ value: b.id, label: `${short(b.course)} · ${b.label}` }))
  ];

  return (
    <div>
      <p className="eyebrow mb-2">Announcements</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Announcements</h1>
      <p className="mb-6 text-sm text-inkdim">
        Each announcement pops up on the student&apos;s screen the next time they open their dashboard (or right away
        if they&apos;re already on it), and they have to tap &ldquo;I&apos;m ready&rdquo; to close it. Aim it at{' '}
        <span className="font-medium text-ink">all batches</span> or one batch.
      </p>
      <div className="card p-5">
        <AnnouncementManager messages={messages || []} audienceOptions={audienceOptions} />
      </div>
    </div>
  );
}
