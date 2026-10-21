import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import AnnouncementManager from '../../../components/admin/AnnouncementManager';
import ReportList from '../../../components/admin/ReportList';
import Tabs from '../../../components/Tabs';

export const metadata = { title: 'Announcements & Reports — The Foundry' };

export default async function AnnouncementsPage({ searchParams }) {
  const supabase = await createClient();

  const [{ data: batches }, { data: messages }, { data: reportRows }] = await Promise.all([
    supabase.from('batches').select('id, label, course').order('course').order('created_at'),
    supabase.from('messages').select('*').order('created_at', { ascending: false }),
    supabase
      .from('content_reports')
      .select('*, reporter:profiles!content_reports_reporter_id_fkey(full_name, email), batch:batches(label)')
      .order('created_at', { ascending: false })
      .limit(200)
  ]);
  // Open reports first, newest first within each group.
  const reports = (reportRows || []).sort((a, b) => (a.status === b.status ? new Date(b.created_at) - new Date(a.created_at) : a.status === 'open' ? -1 : 1));
  const openCount = reports.filter((r) => r.status === 'open').length;

  const short = (course) => COURSES[course]?.name?.split(' — ')[0] || course;
  const audienceOptions = [
    { value: 'all', label: 'All batches' },
    ...(batches || []).map((b) => ({ value: b.id, label: `${short(b.course)} · ${b.label}` }))
  ];

  const tabs = [
    {
      key: 'announcements',
      label: 'Announcements',
      content: (
        <div>
          <p className="mb-4 text-sm text-inkdim">
            Each announcement pops up on the student&apos;s screen the next time they open their dashboard (or right away
            if they&apos;re already on it), and they have to tap &ldquo;I&apos;m ready&rdquo; to close it. Aim it at{' '}
            <span className="font-medium text-ink">all batches</span> or one batch.
          </p>
          <div className="card p-5">
            <AnnouncementManager messages={messages || []} audienceOptions={audienceOptions} />
          </div>
        </div>
      )
    },
    {
      key: 'reports',
      label: openCount ? `Reports (${openCount})` : 'Reports',
      content: (
        <div>
          <p className="mb-4 text-sm text-inkdim">
            Teachers can&apos;t edit or delete what you post, but they can flag it, or report a student. Delete the item, or mark the report resolved.
          </p>
          <div className="card p-5">
            <ReportList reports={reports} />
          </div>
        </div>
      )
    }
  ];

  const sp = await searchParams;
  return (
    <div>
      <p className="eyebrow mb-2">Announcements &amp; reports</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Announcements &amp; reports</h1>
      <Tabs tabs={tabs} defaultKey={sp?.tab === 'reports' ? 'reports' : 'announcements'} />
    </div>
  );
}
