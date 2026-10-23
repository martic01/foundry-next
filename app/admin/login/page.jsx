import GoogleSignInPage from '../../../components/GoogleSignInPage';
import { NOINDEX } from '../../../lib/seo';

export const metadata = { title: 'Admin login — The Foundry', ...NOINDEX };

export default function AdminLoginPage() {
  return (
    <GoogleSignInPage
      title="Admin login"
      subtitle="Sign in with your admin Google account to manage registrations, batches, and announcements."
      redirectTo="/admin"
    />
  );
}
