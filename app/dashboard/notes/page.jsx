import { createClient } from '../../../lib/supabase/server';
import { getUser } from '../../../lib/supabase/session';
import { courseNotesProps } from '../../../lib/notes/visible';
import NotesBrowser from '../../../components/dashboard/NotesBrowser';

export const metadata = { title: 'Notes — The Foundry' };

// A student only ever gets the notes of the course(s) they're enrolled
// in, and only the days the admin has unlocked.
export default async function NotesPage() {
  const supabase = await createClient();
  const user = await getUser();

  const [{ data: registrations }, { data: unlocks }] = await Promise.all([
    supabase.from('registrations').select('course').eq('user_id', user.id).eq('status', 'paid'),
    supabase.from('note_unlocks').select('course, day')
  ]);

  const courseKeys = [...new Set((registrations || []).map((r) => r.course))];
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
        <NotesBrowser courses={courseKeys.map((k) => courseNotesProps(k, unlockedByCourse[k] || new Set()))} />
      )}
    </div>
  );
}
