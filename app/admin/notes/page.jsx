import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { courseNotesProps } from '../../../lib/notes/visible';
import NoteUnlockGrid from '../../../components/admin/NoteUnlockGrid';
import NotesBrowser from '../../../components/dashboard/NotesBrowser';
import { NOTES_BY_COURSE } from '../../../lib/notes';

export const metadata = { title: 'Notes — The Foundry' };

// The admin reads every day of every course (to know what to check
// before unlocking it); the grid is what actually locks / unlocks a day
// for students and is bound to the real unlock state.
export default async function AdminNotesPage() {
  const supabase = await createClient();
  const { data: unlocks } = await supabase.from('note_unlocks').select('course, day');

  const unlockedByCourse = {};
  (unlocks || []).forEach((u) => {
    (unlockedByCourse[u.course] ||= new Set()).add(u.day);
  });

  const courses = Object.keys(COURSES)
    .filter((k) => NOTES_BY_COURSE[k]?.length)
    .map((key) => ({
      ...courseNotesProps(key, null),
      extra: (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">Lock / unlock a day for students</p>
          <NoteUnlockGrid course={key} days={NOTES_BY_COURSE[key]} unlockedDays={unlockedByCourse[key] || new Set()} />
        </div>
      )
    }));

  return (
    <div>
      <p className="eyebrow mb-2">Notes</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Lesson notes</h1>
      <p className="mb-6 text-sm text-inkdim">
        You can read every note for every course. Tap a day in the grid to lock or unlock it for the students on that
        course (teachers always see all of their course&apos;s notes). Day 1 starts unlocked; everything else starts
        locked.
      </p>

      {!courses.length ? (
        <div className="card p-6 text-sm text-inkdim">No note content has been added for any course yet.</div>
      ) : (
        <NotesBrowser courses={courses} />
      )}
    </div>
  );
}
