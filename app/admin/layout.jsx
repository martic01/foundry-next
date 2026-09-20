import { redirect } from 'next/navigation';
import { LayoutDashboard, Users2, Wallet, GraduationCap, NotebookText } from 'lucide-react';
import { createClient } from '../../lib/supabase/server';
import { signOutAction } from '../actions';
import PortalShell from '../../components/portal/PortalShell';

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login'); // defense in depth -- middleware already covers this

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .maybeSingle();

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

  const navItems = [
    { href: '/admin', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    { href: '/admin/batches', label: 'Batches', icon: <GraduationCap className="h-4 w-4" /> },
    { href: '/admin/students', label: 'Students', icon: <Users2 className="h-4 w-4" /> },
    { href: '/admin/notes', label: 'Notes', icon: <NotebookText className="h-4 w-4" /> },
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
    </PortalShell>
  );
}
