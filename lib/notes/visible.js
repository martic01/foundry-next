import { COURSES } from '../courses';
import { NOTES_BY_COURSE, INTRO_BY_COURSE } from './index';

// Builds the props NotesBrowser needs for one course.
//   unlocked: Set of unlocked day numbers, or null for "everything"
//   (teachers and admins read every day).
// A locked day keeps only its title -- the lesson content is stripped
// HERE, on the server, so it never reaches the browser.
export function courseNotesProps(key, unlocked) {
  const all = NOTES_BY_COURSE[key] || [];
  const open = unlocked || new Set(all.map((d) => d.day));
  return {
    key,
    name: COURSES[key]?.name || key,
    intro: INTRO_BY_COURSE[key] || null,
    unlockedDays: [...open],
    notes: all.map((d) =>
      open.has(d.day) ? d : { day: d.day, week: d.week, weekTitle: d.weekTitle, title: d.title, concepts: [] }
    )
  };
}
