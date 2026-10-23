import { Suspense } from 'react';
import { pageMeta } from '../../lib/seo';
import RegisterFlow from '../../components/RegisterFlow';
import { getPublicCourseSettings } from '../../lib/course-settings';
import { getPublicSiteContacts } from '../../lib/site-contacts';

export const metadata = pageMeta({
  title: 'Register for a Coding, AI or Cybersecurity Course | The Foundry',
  description: 'Reserve your seat in the next cohort: HTML, CSS, JavaScript, React and Cybersecurity courses with AI, live classes, real projects and a certificate. Pay securely online.',
  path: '/register'
});

export default async function RegisterPage() {
  // Cached read is fine for DISPLAY. The decision that matters -- may
  // this person pay right now? -- is re-checked against the live table
  // by checkCourseOpenAction() just before Paystack opens, and again in
  // /api/payments/verify.
  const [settings, contacts] = await Promise.all([getPublicCourseSettings(), getPublicSiteContacts()]);
  return (
    <Suspense fallback={null}>
      <RegisterFlow settingsByCourse={settings} hrContacts={contacts.hr} />
    </Suspense>
  );
}
