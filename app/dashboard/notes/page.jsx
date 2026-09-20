import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { NOTES_BY_COURSE, INTRO_BY_COURSE } from '../../../lib/notes';
import NotesAccordion from '../../../components/dashboard/NotesAccordion';
import NotesIntro from '../../../components/dashboard/NotesIntro';

export const metadata = { title: 'Notes — The Foundry' };

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: registrations } = await supabase
    .from('registrations')
    .select('course')
    .eq('user_id', user.id)
    .eq('status', 'paid');

  const courseKeys = [...new Set((registrations || []).map((r) => r.course))];

  const { data: unlocks } = await supabase.from('note_unlocks').select('course, day');
  const unlockedByCourse = {};
  (unlocks || []).forEach((u) => {
    (unlockedByCourse[u.course] ||= new Set()).add(u.day);
  });

  return (
    <div>
      <p className="eyebrow mb-2">Notes</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Lesson notes</h1>

      {!courseKeys.length ? (
        <div className="card p-6 text-sm text-inkdim">No active registrations found on this account.</div>
      ) : (
        <div className="flex flex-col gap-10">
          {courseKeys.map((key) => {
            const notes = NOTES_BY_COURSE[key];
            const unlockedDays = unlockedByCourse[key] || new Set();
            return (
              <section key={key}>
                <h2 className="mb-4 font-display text-lg font-extrabold text-ink">{COURSES[key]?.name || key}</h2>
                {/* Always visible regardless of which days are locked --
                    this is orientation content (what the course covers,
                    how to read the cards), not a lesson day itself. */}
                <NotesIntro intro={INTRO_BY_COURSE[key]} />
                {!notes?.length ? (
                  <div className="card p-6 text-sm text-inkdim">Notes for this course are coming soon.</div>
                ) : (
                  <NotesAccordion notes={notes} unlockedDays={unlockedDays} />
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
