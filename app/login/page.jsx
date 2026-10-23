import GoogleSignInPage from '../../components/GoogleSignInPage';
import { NOINDEX } from '../../lib/seo';

export const metadata = { title: 'Student login — The Foundry', ...NOINDEX };

export default function StudentLoginPage() {
  return (
    <GoogleSignInPage
      title="Student login"
      subtitle="Sign in with the same Google account you registered with to see your class link and batch chat."
      redirectTo="/dashboard"
    />
  );
}
