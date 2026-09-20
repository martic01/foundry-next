import { redirect } from 'next/navigation';
import { LayoutDashboard, BookOpen, Receipt, Megaphone, Wrench, NotebookText } from 'lucide-react';
import { createClient } from '../../lib/supabase/server';
import { signOutAction } from '../actions';
import PortalShell from '../../components/portal/PortalShell';

// This layout runs for EVERY /dashboard/* page, so the auth/role/blocked
// checks live here now instead of being repeated at the top of each page
// -- app/dashboard/page.jsx and its subpages can assume "there is a
// signed-in, non-admin, non-blocked student" by the time they render.
export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login'); // defense in depth -- middleware already covers this

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, blocked, vscode_installed, git_installed')
    .eq('id', user.id)
    .maybeSingle();

  // An admin account landing here (e.g. a bookmark, or the nav briefly
  // being wrong) should end up on /admin, not see a student portal with
  // nothing in it. Nav already points admins to the right place going
  // forward -- this is the server-side backstop.
  if (profile?.role === 'admin') redirect('/admin');

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

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    { href: '/dashboard/courses', label: 'My courses', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/dashboard/installation', label: 'Installation', icon: <Wrench className="h-4 w-4" />, badge: installationPending },
    { href: '/dashboard/notes', label: 'Notes', icon: <NotebookText className="h-4 w-4" /> },
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
      {children}
    </PortalShell>
  );
}
