import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { getCourseSettings } from '../../../lib/course-settings';
import RegistrationControl from '../../../components/admin/RegistrationControl';
import ContactSettings from '../../../components/admin/ContactSettings';
import Tabs from '../../../components/Tabs';
import { getSiteContacts } from '../../../lib/site-contacts';

export const metadata = { title: 'Registration — The Foundry' };

export default async function RegistrationPage() {
  const supabase = await createClient();
  const [settings, contacts, { data: batches }, { data: registrations }] = await Promise.all([
    getCourseSettings(supabase),
    getSiteContacts(supabase),
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
      <Tabs
        defaultKey="courses"
        tabs={[
          {
            key: 'courses',
            label: 'Courses',
            content: (
              <div className="flex flex-col gap-6">
                <p className="rounded-lg border border-line bg-surfaceMuted p-3 text-xs text-inkdim">HR is by enquiry (no online payment), so it isn&apos;t listed here. Its contact details are in the <span className="font-medium text-ink">HR, workspace &amp; events</span> tab.</p>
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
            )
          },
          {
            key: 'contacts',
            label: 'HR, workspace & events',
            content: (
              <div className="flex flex-col gap-6">
                <p className="text-sm text-inkdim">
                  HR has no online payment: its card on the website shows WhatsApp and email buttons instead. The workspace and event center sections have
                  &ldquo;Make enquiry&rdquo; buttons. Change the numbers, emails and address here and the website updates within a minute.
                </p>
                <ContactSettings sectionKey="hr" title="HR services" values={contacts.hr} />
                <ContactSettings sectionKey="workspace" title="Workspace (co-working, meeting room, virtual office)" values={contacts.workspace} withAddress />
                <ContactSettings sectionKey="event" title="Event center (birthdays, Valentine, mini events: up to 30 guests)" values={contacts.event} withAddress />
              </div>
            )
          }
        ]}
      />
    </div>
  );
}
