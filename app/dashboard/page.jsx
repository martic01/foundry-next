import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '../../lib/supabase/server';
import { getUser, getProfile } from '../../lib/supabase/session';
import { COURSES } from '../../lib/courses';
import ProfileCard from '../../components/dashboard/ProfileCard';
import EnrollmentCard from '../../components/dashboard/EnrollmentCard';
import InstallReminderModal from '../../components/dashboard/InstallReminderModal';
import { installPlan } from '../../lib/installs';

export const metadata = { title: 'Overview — The Foundry' };

// Auth/role/blocked checks already happened in app/dashboard/layout.jsx --
// reaching this component means "signed-in, non-admin, non-blocked
// student." This page just fetches what's specific to Overview.
export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const user = await getUser();

  // All three are independent, so they run together (the profile is the
  // per-request cached one the layout already loaded). RLS limits the
  // class links to this student's batch(es) plus all-batch links -- this
  // only needs to count them per batch.
  const [profile, { data: registrations }, { data: links }] = await Promise.all([
    getProfile(user.id),
    supabase.from('registrations').select('*, batches(*)').eq('user_id', user.id).eq('status', 'paid'),
    supabase.from('class_links').select('batch_id')
  ]);

  const plan = installPlan(profile, (registrations || []).filter((r) => !r.blocked).map((r) => r.course));

  return (
    <div>
      {plan.pendingCount > 0 && <InstallReminderModal plan={plan} />}

      <p className="eyebrow mb-2">Overview</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">
        Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
      </h1>

      <ProfileCard profile={profile} registrations={registrations || []} />

      {!registrations?.length ? (
        <div className="card p-6 text-sm text-inkdim">No active registrations found on this account.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {registrations.map((reg) => {
            if (reg.blocked) {
              return (
                <div key={reg.id} className="card border-red-200 p-5 text-sm text-inkdim">
                  <p className="font-display text-base font-extrabold text-ink">{COURSES[reg.course]?.name || reg.course}</p>
                  Access to this course has been paused. Contact the admin if you think this is a mistake.
                </div>
              );
            }
            const linkCount = (links || []).filter((l) => l.batch_id === null || l.batch_id === reg.batch_id).length;
            return (
              <EnrollmentCard
                key={reg.id}
                registration={reg}
                course={COURSES[reg.course]}
                batch={reg.batches}
                linkCount={linkCount}
              />
            );
          })}
          <Link
            href="/dashboard/courses"
            className="group flex items-center gap-1 self-start text-sm font-medium text-brand hover:underline"
          >
            Class links &amp; videos <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
