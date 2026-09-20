import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { NOTES_BY_COURSE, INTRO_BY_COURSE } from '../../../lib/notes';
import NoteUnlockGrid from '../../../components/admin/NoteUnlockGrid';
import NotesAccordion from '../../../components/dashboard/NotesAccordion';
import NotesIntro from '../../../components/dashboard/NotesIntro';

export const metadata = { title: 'Notes — The Foundry' };

export default async function AdminNotesPage() {
  const supabase = await createClient();
  const { data: unlocks } = await supabase.from('note_unlocks').select('course, day');

  const unlockedByCourse = {};
  (unlocks || []).forEach((u) => {
    (unlockedByCourse[u.course] ||= new Set()).add(u.day);
  });

  const coursesWithNotes = Object.keys(NOTES_BY_COURSE).filter((key) => NOTES_BY_COURSE[key]?.length);

  return (
    <div>
      <p className="eyebrow mb-2">Notes</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Lesson note unlocks</h1>
      <p className="mb-8 text-sm text-inkdim">
        Tap a day to lock or unlock it for every student on that course. Day
        1 ships unlocked by default; everything else starts locked.
      </p>

      {!coursesWithNotes.length ? (
        <div className="card p-6 text-sm text-inkdim">No note content has been added for any course yet.</div>
      ) : (
        <div className="flex flex-col gap-10">
          {coursesWithNotes.map((key) => {
            // All days pass unlocked into the accordion below regardless
            // of note_unlocks -- the admin needs to be able to read
            // EVERY day's content to know what to check before
            // unlocking it, not just whatever's already visible to
            // students. NoteUnlockGrid above (bound to the real
            // unlockedByCourse set) is what actually gates the toggle.
            const allDaysUnlocked = new Set(NOTES_BY_COURSE[key].map((d) => d.day));
            return (
              <section key={key}>
                <h2 className="mb-4 font-display text-lg font-extrabold text-ink">{COURSES[key]?.name || key}</h2>
                <NotesIntro intro={INTRO_BY_COURSE[key]} />
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-inkdim">Lock / unlock a day</p>
                <NoteUnlockGrid
                  course={key}
                  days={NOTES_BY_COURSE[key]}
                  unlockedDays={unlockedByCourse[key] || new Set()}
                />
                <p className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-inkdim">
                  Preview content (all days, regardless of lock state)
                </p>
                <NotesAccordion notes={NOTES_BY_COURSE[key]} unlockedDays={allDaysUnlocked} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
