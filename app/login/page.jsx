import GoogleSignInPage from '../../components/GoogleSignInPage';
import { NOINDEX } from '../../lib/seo';

export const metadata = { title: 'Student login — The Foundry', ...NOINDEX };

export default function StudentLoginPage({ searchParams }) {
  return (
    <GoogleSignInPage
      notice={searchParams?.reason === 'other_device' ? 'You were signed out because this account was opened on another device. Only one device can be signed in at a time. Sign in again to continue here.' : ''}
      title="Student login"
      subtitle="Sign in with the same Google account you registered with to see your class link and batch chat."
      redirectTo="/dashboard"
    />
  );
}
