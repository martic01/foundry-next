import { redirect } from 'next/navigation';
import { LayoutDashboard, Users2, Wallet, GraduationCap, NotebookText, FolderOpen, Lock, Megaphone, Presentation, Award, Building2 } from 'lucide-react';
import { getUser, getProfile } from '../../lib/supabase/session';
import { signOutAction } from '../actions';
import PortalShell from '../../components/portal/PortalShell';
import NotificationHost from '../../components/dashboard/NotificationHost';
import { createAdminClient } from '../../lib/supabase/admin';
import { maybePurgeExpired } from '../../lib/purge';
import { NOINDEX } from '../../lib/seo';

export const metadata = NOINDEX;

export default async function AdminLayout({ children }) {
  // Per-request cached lookups (lib/supabase/session.js): the root Nav
  // and the page share these instead of each calling Supabase again.
  const user = await getUser();
  if (!user) redirect('/admin/login'); // defense in depth -- middleware already covers this

  const profile = await getProfile(user.id);

  if (profile?.role !== 'admin') {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 text-center">
        <div className="card w-full p-8">
          <h1 className="mb-2 font-display text-xl font-extrabold text-ink">Not authorized</h1>
          <p className="text-sm text-inkdim">
            This account doesn&apos;t have admin access. If this is a
            mistake, promote your account with the SQL note at the bottom
            of supabase/schema.sql.
          </p>
        </div>
      </main>
    );
  }

  maybePurgeExpired(createAdminClient).catch(() => {}); // throttled; expired items are also hidden by RLS

  const navItems = [
    { href: '/admin', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    { href: '/admin/batches', label: 'Batches', icon: <GraduationCap className="h-4 w-4" /> },
    { href: '/admin/content', label: 'Content', icon: <FolderOpen className="h-4 w-4" /> },
    { href: '/admin/announcements', label: 'Announcements & reports', icon: <Megaphone className="h-4 w-4" /> },
    { href: '/admin/registration', label: 'Registration', icon: <Lock className="h-4 w-4" /> },
    { href: '/admin/contacts', label: 'HR, workspace & events', icon: <Building2 className="h-4 w-4" /> },
    { href: '/admin/teachers', label: 'Teachers', icon: <Presentation className="h-4 w-4" /> },
    { href: '/admin/students', label: 'Students', icon: <Users2 className="h-4 w-4" /> },
    { href: '/admin/notes', label: 'Notes', icon: <NotebookText className="h-4 w-4" /> },
    { href: '/admin/certificates', label: 'Certificates', icon: <Award className="h-4 w-4" /> },
    { href: '/admin/payments', label: 'Payments', icon: <Wallet className="h-4 w-4" /> }
  ];

  return (
    <PortalShell
      navItems={navItems}
      roleLabel="Admin"
      userName={profile?.full_name || user.user_metadata?.full_name || user.email}
      userEmail={profile?.email || user.email}
      logoutAction={signOutAction}
    >
      {children}
      <NotificationHost userId={user.id} />
    </PortalShell>
  );
}
