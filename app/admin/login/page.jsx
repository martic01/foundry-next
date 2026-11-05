import GoogleSignInPage from '../../../components/GoogleSignInPage';
import { NOINDEX } from '../../../lib/seo';

export const metadata = { title: 'Admin login — The Foundry', ...NOINDEX };

export default function AdminLoginPage({ searchParams }) {
  return (
    <GoogleSignInPage
      notice={searchParams?.reason === 'other_device' ? 'You were signed out because this account was opened on another device. Only one device can be signed in at a time. Sign in again to continue here.' : ''}
      title="Admin login"
      subtitle="Sign in with your admin Google account to manage registrations, batches, and announcements."
      redirectTo="/admin"
    />
  );
}
