import { createClient } from '../../../lib/supabase/server';
import ReportList from '../../../components/admin/ReportList';

export const metadata = { title: 'Reports — The Foundry' };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('content_reports')
    .select('*, reporter:profiles!content_reports_reporter_id_fkey(full_name, email), batch:batches(label)')
    .order('status', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);
  // 'resolved' sorts after 'open' when descending is wrong, so sort here.
  const reports = (data || []).sort((a, b) => (a.status === b.status ? new Date(b.created_at) - new Date(a.created_at) : a.status === 'open' ? -1 : 1));

  return (
    <div>
      <p className="eyebrow mb-2">Reports</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Teacher reports</h1>
      <p className="mb-6 text-sm text-inkdim">
        Teachers can&apos;t edit or delete what you post, but they can flag it. Delete the item, or mark the report resolved.
      </p>
      <div className="card p-5">
        <ReportList reports={reports} />
      </div>
    </div>
  );
}
