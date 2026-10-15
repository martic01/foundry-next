import { redirect } from 'next/navigation';
import { LayoutDashboard, Users2, NotebookText, FolderOpen, Megaphone } from 'lucide-react';
import { getUser, getProfile } from '../../lib/supabase/session';
import { signOutAction } from '../actions';
import PortalShell from '../../components/portal/PortalShell';

// Teacher portal. Anyone who isn't a teacher is sent to their own home:
// the admin to /admin, students to /dashboard. A teacher only ever sees
// the batches the admin assigned to them (lib/teacher.js + RLS).
export default async function TeacherLayout({ children }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getProfile(user.id);
  if (profile?.role === 'admin') redirect('/admin');
  if (profile?.role !== 'teacher') redirect('/dashboard');

  if (profile.blocked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 text-center">
        <div className="card w-full p-8">
          <h1 className="mb-2 font-display text-xl font-extrabold text-ink">Access restricted</h1>
          <p className="text-sm text-inkdim">Your account&apos;s access has been restricted. Contact the admin if this is a mistake.</p>
        </div>
      </main>
    );
  }

  const navItems = [
    { href: '/teacher', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    { href: '/teacher/students', label: 'Students', icon: <Users2 className="h-4 w-4" /> },
    { href: '/teacher/notes', label: 'Notes', icon: <NotebookText className="h-4 w-4" /> },
    { href: '/teacher/content', label: 'Links & videos', icon: <FolderOpen className="h-4 w-4" /> },
    { href: '/teacher/announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" /> }
  ];

  return (
    <PortalShell
      navItems={navItems}
      roleLabel="Teacher"
      userName={profile.full_name || user.user_metadata?.full_name || user.email}
      userEmail={profile.email || user.email}
      logoutAction={signOutAction}
    >
      {children}
    </PortalShell>
  );
}
