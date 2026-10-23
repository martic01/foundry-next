import { redirect } from 'next/navigation';
import { LayoutDashboard, BookOpen, Receipt, Megaphone, Wrench, NotebookText, Compass, Award, Lock } from 'lucide-react';
import { createClient } from '../../lib/supabase/server';
import { getUser, getProfile } from '../../lib/supabase/session';
import { signOutAction } from '../actions';
import PortalShell from '../../components/portal/PortalShell';
import ClassStatusBanner from '../../components/BatchTimer';
import { COURSES } from '../../lib/courses';
import NotificationHost from '../../components/dashboard/NotificationHost';
import { NOINDEX } from '../../lib/seo';

// This layout runs for EVERY /dashboard/* page, so the auth/role/blocked
// checks live here now instead of being repeated at the top of each page
// -- app/dashboard/page.jsx and its subpages can assume "there is a
// signed-in, non-admin, non-blocked student" by the time they render.
export const metadata = NOINDEX;

export default async function DashboardLayout({ children }) {
  const user = await getUser();
  if (!user) redirect('/login'); // defense in depth -- middleware already covers this

  // The profile and the batch-banner query don't depend on each other,
  // so they run together instead of one after the other. (A blocked or
  // admin account wastes the banner query -- that's rare and cheap.)
  const supabase = await createClient();
  const [profile, { data: bannerRegs }, { count: certCount }] = await Promise.all([
    getProfile(user.id),
    supabase
      .from('registrations')
      .select('course, batches(id, label, start_date, class_status, timer_total_seconds, timer_elapsed_seconds, timer_started_at)')
      .eq('user_id', user.id)
      .eq('status', 'paid'),
    supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  ]);

  // An admin account landing here (e.g. a bookmark, or the nav briefly
  // being wrong) should end up on /admin, not see a student portal with
  // nothing in it. Nav already points admins to the right place going
  // forward -- this is the server-side backstop.
  if (profile?.role === 'admin') redirect('/admin');
  // A teacher has ONE role: the teacher portal. Never this dashboard.
  if (profile?.role === 'teacher') redirect('/teacher');

  if (profile?.blocked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 text-center">
        <div className="card w-full p-8">
          <h1 className="mb-2 font-display text-xl font-extrabold text-ink">Access restricted</h1>
          <p className="text-sm text-inkdim">
            Your account&apos;s access has been restricted. If you believe
            this is a mistake, contact{' '}
            <a href="mailto:aboyadematthew@gmail.com" className="text-brand underline">
              aboyadematthew@gmail.com
            </a>.
          </p>
        </div>
      </main>
    );
  }

  // Drives the sidebar's blinking dot on Installation -- goes away for
  // good once both checkboxes on that page are ticked.
  const installationPending = !profile?.vscode_installed || !profile?.git_installed;

  // Class clock for every batch this student is in -- shown at the top
  // of every dashboard page, live (see components/BatchTimer.jsx).
  const bannerBatches = (bannerRegs || [])
    .filter((r) => r.batches?.id)
    .map((r) => ({ ...r.batches, courseName: COURSES[r.course]?.name || r.course }));

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    { href: '/dashboard/courses', label: 'My courses', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/dashboard/other-courses', label: 'Other courses', icon: <Compass className="h-4 w-4" /> },
    { href: '/dashboard/installation', label: 'Installation', icon: <Wrench className="h-4 w-4" />, badge: installationPending },
    { href: '/dashboard/notes', label: 'Notes', icon: <NotebookText className="h-4 w-4" /> },
    { href: '/dashboard/certificate', label: 'Certificate', icon: certCount ? <Award className="h-4 w-4" /> : <Lock className="h-4 w-4" /> },
    { href: '/dashboard/receipts', label: 'Receipts', icon: <Receipt className="h-4 w-4" /> },
    { href: '/dashboard/announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" /> }
  ];

  return (
    <PortalShell
      navItems={navItems}
      roleLabel="Student"
      userName={profile?.full_name || user.user_metadata?.full_name || user.email}
      userEmail={profile?.email || user.email}
      logoutAction={signOutAction}
    >
      <ClassStatusBanner batches={bannerBatches} serverNow={Date.now()} />
      {children}
      <NotificationHost userId={user.id} />
    </PortalShell>
  );
}
