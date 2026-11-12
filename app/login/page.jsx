import { redirect } from 'next/navigation';
import { getUser, getProfile } from '../../lib/supabase/session';
import GoogleSignInPage from '../../components/GoogleSignInPage';
import { NOINDEX } from '../../lib/seo';

export const metadata = { title: 'Student login — The Foundry', ...NOINDEX };

const HOME = { admin: '/admin', teacher: '/teacher' };

export default async function StudentLoginPage({ searchParams }) {
  // Already signed in? Go straight to your own area (student, teacher or admin).
  if (searchParams?.reason !== 'other_device') {
    try {
      const user = await getUser();
      if (user) redirect(HOME[(await getProfile(user.id))?.role] || '/dashboard');
    } catch (e) { if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e; }
  }
  return (
    <GoogleSignInPage
      notice={searchParams?.reason === 'other_device' ? 'You were signed out because this account was opened on another device. Only one device can be signed in at a time. Sign in again to continue here.' : ''}
      title="Sign in"
      subtitle="Sign in with your Google account. Students use the account they registered with; teachers and staff use theirs."
      redirectTo="/dashboard"
    />
  );
}
