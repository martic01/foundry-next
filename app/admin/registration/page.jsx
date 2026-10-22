import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { getCourseSettings } from '../../../lib/course-settings';
import RegistrationControl from '../../../components/admin/RegistrationControl';

export const metadata = { title: 'Registration — The Foundry' };

export default async function RegistrationPage() {
  const supabase = await createClient();
  const [settings, { data: batches }, { data: registrations }] = await Promise.all([
    getCourseSettings(supabase),
    supabase.from('batches').select('id, course, capacity'),
    supabase.from('registrations').select('course').eq('status', 'paid')
  ]);

  return (
    <div>
      <p className="eyebrow mb-2">Registration</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Registration controls</h1>
      <p className="mb-6 text-sm text-inkdim">
        Open or close registration and payment per course, set its price and discount, and tag it on the landing page. Closing always needs a
        reopen date or “until further notice”.
      </p>
      <p className="mb-6 rounded-lg border border-line bg-surfaceMuted p-3 text-xs text-inkdim">HR is by enquiry (no online payment), so it isn&apos;t listed here. Edit its WhatsApp number and email on the <a href="/admin/contacts" className="font-medium text-brand underline">HR, workspace &amp; events</a> page.</p>
      <div className="flex flex-col gap-6">
        {Object.values(COURSES).filter((c) => !c.contactOnly).map((course) => (
          <RegistrationControl
            key={course.key}
            course={{ key: course.key, name: course.name }}
            settings={settings[course.key]}
            defaults={{ now: course.priceNow, was: course.priceWas }}
            seats={{
              paid: (registrations || []).filter((r) => r.course === course.key).length,
              batches: (batches || []).filter((b) => b.course === course.key).length,
              capacity: (batches || []).find((b) => b.course === course.key)?.capacity || 50
            }}
          />
        ))}
      </div>
    </div>
  );
}
