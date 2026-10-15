import { createClient } from '../../../lib/supabase/server';
import { getUser } from '../../../lib/supabase/session';
import { COURSES } from '../../../lib/courses';
import { getCourseSettings } from '../../../lib/course-settings';
import { getAvailability } from '../../../lib/course-status';
import CourseCard from '../../../components/CourseCard';

export const metadata = { title: 'Other courses — The Foundry' };

// Everything the student isn't enrolled in yet, with the same cards and
// "Register now" button as the public landing page -- so they can enrol
// in another course without leaving their dashboard. (They're already
// signed in, so /register skips straight to date of birth + payment.)
export default async function OtherCoursesPage() {
  const supabase = await createClient();
  const user = await getUser();

  const [{ data: registrations }, settings] = await Promise.all([
    supabase.from('registrations').select('course').eq('user_id', user.id).eq('status', 'paid'),
    getCourseSettings(supabase)
  ]);

  const enrolled = new Set((registrations || []).map((r) => r.course));
  const others = Object.values(COURSES).filter((c) => !enrolled.has(c.key));

  return (
    <div>
      <p className="eyebrow mb-2">Other courses</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Other courses</h1>
      <p className="mb-6 text-sm text-inkdim">Register for another course straight from your dashboard.</p>

      {!others.length ? (
        <div className="card p-6 text-sm text-inkdim">You&apos;re enrolled in every course we offer right now.</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {others.map((c) => (
            <CourseCard key={c.key} course={c} availability={getAvailability(settings[c.key])} />
          ))}
        </div>
      )}
    </div>
  );
}
