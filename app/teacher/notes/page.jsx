import { getUser } from '../../../lib/supabase/session';
import { getTeacherBatches } from '../../../lib/teacher';
import { courseNotesProps } from '../../../lib/notes/visible';
import NotesBrowser from '../../../components/dashboard/NotesBrowser';
import NoBatches from '../../../components/teacher/NoBatches';

export const metadata = { title: 'Notes — The Foundry' };

// Every day of the notes for the course(s) this teacher teaches -- and
// only those courses. (Unlocking days for students is the admin's job.)
export default async function TeacherNotes() {
  const user = await getUser();
  const batches = await getTeacherBatches(user.id);
  const courseKeys = [...new Set(batches.map((b) => b.course))];

  return (
    <div>
      <p className="eyebrow mb-2">Notes</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Course notes</h1>
      {!courseKeys.length ? <NoBatches /> : <NotesBrowser courses={courseKeys.map((k) => courseNotesProps(k, null))} />}
    </div>
  );
}
