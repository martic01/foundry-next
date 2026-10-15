import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import ContentManager from '../../../components/admin/ContentManager';

export const metadata = { title: 'Content — The Foundry' };

export default async function ContentPage() {
  const supabase = await createClient();

  const [{ data: batches }, { data: links }, { data: videos }] = await Promise.all([
    supabase.from('batches').select('id, label, course').order('course').order('created_at'),
    supabase.from('class_links').select('*').order('created_at', { ascending: false }),
    supabase.from('class_videos').select('*').order('created_at', { ascending: false })
  ]);

  const short = (course) => COURSES[course]?.name?.split(' — ')[0] || course;
  const audienceOptions = [
    { value: 'all', label: 'All batches' },
    ...(batches || []).map((b) => ({ value: b.id, label: `${short(b.course)} · ${b.label}` }))
  ];

  return (
    <div>
      <p className="eyebrow mb-2">Content</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Class links &amp; videos</h1>
      <p className="mb-6 text-sm text-inkdim">
        Every item can show for <span className="font-medium text-ink">all batches</span> or just one — change it any
        time with Edit. Students only ever see what&apos;s aimed at their own batch plus what&apos;s for everyone.
      </p>
      <ContentManager links={links || []} videos={videos || []} audienceOptions={audienceOptions} />
    </div>
  );
}
