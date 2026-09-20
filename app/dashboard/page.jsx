import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '../../lib/supabase/server';
import { COURSES } from '../../lib/courses';
import ProfileCard from '../../components/dashboard/ProfileCard';
import InstallReminderModal from '../../components/dashboard/InstallReminderModal';

export const metadata = { title: 'Overview — The Foundry' };

// Auth/role/blocked checks already happened in app/dashboard/layout.jsx --
// reaching this component means "signed-in, non-admin, non-blocked
// student." This page just fetches what's specific to Overview.
export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const { data: registrations } = await supabase
    .from('registrations')
    .select('*, batches(*, class_links(*))')
    .eq('user_id', user.id)
    .eq('status', 'paid');

  return (
    <div>
      {(!profile?.vscode_installed || !profile?.git_installed) && <InstallReminderModal />}

      <p className="eyebrow mb-2">Overview</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">
        Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
      </h1>

      <ProfileCard profile={profile} registrations={registrations || []} />

      {!registrations?.length ? (
        <div className="card p-6 text-sm text-inkdim">No active registrations found on this account.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {registrations.map((reg) => {
            const course = COURSES[reg.course];
            const batch = reg.batches;
            const classLinkRow = Array.isArray(batch?.class_links) ? batch.class_links[0] : batch?.class_links;
            return (
              <Link
                key={reg.id}
                href="/dashboard/courses"
                className="card group flex items-center justify-between p-5 transition hover:border-brand/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{course?.name || reg.course}</p>
                  <p className="mt-1 text-xs text-inkdim">
                    {batch ? `Batch: ${batch.label}` : 'Batch assignment pending'}
                    {classLinkRow?.url ? ' · Class link posted' : ' · No class link yet'}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-inkdim transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
