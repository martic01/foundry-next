import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import AnnouncementManager from '../../../components/admin/AnnouncementManager';
import ReportList from '../../../components/admin/ReportList';
import Tabs from '../../../components/Tabs';
import PersonalMessages from '../../../components/admin/PersonalMessages';
import { createAdminClient } from '../../../lib/supabase/admin';

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
  // Private messages (a student's reschedule request, the school's reply) are kept apart from announcements.
  const personal = (messages || []).filter((m) => m.target_user_id);
  const system = (messages || []).filter((m) => !m.target_user_id);
  const ids = [...new Set(personal.flatMap((m) => [m.sender_id, m.target_user_id]))];
  const { data: who } = ids.length ? await createAdminClient().from('profiles').select('id, full_name, email, role').in('id', ids) : { data: [] };
  const byId = Object.fromEntries((who || []).map((p) => [p.id, p]));
  const nm = (id) => byId[id]?.full_name || byId[id]?.email || 'Someone';
  const studentItems = personal.map((m) => ({
    id: m.id, created_at: m.created_at, content: m.content, href: '/admin/exams',
    from: byId[m.sender_id]?.role === 'student' ? `Request from ${nm(m.sender_id)}` : `Reply to ${nm(m.target_user_id)}`
  }));
  const newest = (arr) => arr.reduce((m, x) => (!m || new Date(x.created_at) > new Date(m) ? x.created_at : m), null);

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
      label: 'System announcements',
      latest: newest(system),
      content: (
        <div>
          <p className="mb-4 text-sm text-inkdim">
            Each announcement pops up on the student&apos;s screen the next time they open their dashboard (or right away
            if they&apos;re already on it), and they have to tap &ldquo;I&apos;m ready&rdquo; to close it. Aim it at{' '}
            <span className="font-medium text-ink">all batches</span> or one batch.
          </p>
          <div className="card p-5">
            <AnnouncementManager messages={system} audienceOptions={audienceOptions} />
          </div>
        </div>
      )
    },
    {
      key: 'reports',
      label: openCount ? `Teacher reports & requests (${openCount})` : 'Teacher reports & requests',
      latest: newest(reports.filter((r) => r.status === 'open')),
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
    ,
    {
      key: 'students',
      label: 'Student reports & requests',
      latest: newest(personal),
      content: (
        <div>
          <p className="mb-4 text-sm text-inkdim">Exam reschedule requests from students and the replies you sent. Approve or decline in the Exams tab (or from the pop-up).</p>
          <div className="card p-5"><PersonalMessages items={studentItems} empty="No student requests yet." /></div>
        </div>
      )
    }
  ];

  const sp = await searchParams;
  return (
    <div>
      <p className="eyebrow mb-2">Announcements &amp; reports</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Announcements &amp; reports</h1>
      <Tabs tabs={tabs} seenKey="admin-announcements" defaultKey={['reports', 'students'].includes(sp?.tab) ? sp.tab : 'announcements'} />
    </div>
  );
}
