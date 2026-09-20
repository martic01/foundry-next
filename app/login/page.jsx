import GoogleSignInPage from '../../components/GoogleSignInPage';

export const metadata = { title: 'Student login — The Foundry' };

export default function StudentLoginPage() {
  return (
    <GoogleSignInPage
      title="Student login"
      subtitle="Sign in with the same Google account you registered with to see your class link and batch chat."
      redirectTo="/dashboard"
    />
  );
}
