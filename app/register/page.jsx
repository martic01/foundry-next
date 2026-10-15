import { Suspense } from 'react';
import RegisterFlow from '../../components/RegisterFlow';
import { getPublicCourseSettings } from '../../lib/course-settings';

export const metadata = {
  title: 'Register — State AI Training'
};

export default async function RegisterPage() {
  // Cached read is fine for DISPLAY. The decision that matters -- may
  // this person pay right now? -- is re-checked against the live table
  // by checkCourseOpenAction() just before Paystack opens, and again in
  // /api/payments/verify.
  const settings = await getPublicCourseSettings();
  return (
    <Suspense fallback={null}>
      <RegisterFlow settingsByCourse={settings} />
    </Suspense>
  );
}
