'use client';

import Tabs from '../Tabs';
import NotesIntro from './NotesIntro';
import NotesAccordion from './NotesAccordion';

// Notes as tabs, two levels deep:
//   course tabs (only when there's more than one course)
//     -> "Overview" + one tab per week
//          -> that week's days as an accordion
//
// `courses`: [{ key, name, intro, notes, unlockedDays: number[], extra? }]
//   extra: optional element rendered above the tabs for that course (the
//   admin's lock/unlock grid goes here).
// Locked days arrive from the server with their lesson content already
// stripped (see app/dashboard/notes/page.jsx), so nothing here leaks.
function CourseNotes({ course }) {
  const unlocked = new Set(course.unlockedDays);
  const weeks = [];
  (course.notes || []).forEach((d) => {
    let w = weeks.find((x) => x.week === d.week);
    if (!w) {
      w = { week: d.week, title: d.weekTitle, days: [] };
      weeks.push(w);
    }
    w.days.push(d);
  });

  if (!weeks.length) {
    return <div className="card p-6 text-sm text-inkdim">Notes for this course are coming soon.</div>;
  }

  const tabs = [
    ...(course.intro ? [{ key: 'overview', label: 'Overview', content: <NotesIntro intro={course.intro} /> }] : []),
    ...weeks.map((w) => {
      const open = w.days.filter((d) => unlocked.has(d.day)).length;
      return {
        key: `w${w.week}`,
        label: `Week ${w.week}`,
        content: (
          <div>
            <p className="mb-3 text-sm font-semibold text-ink">
              {w.title} <span className="font-normal text-inkdim">· {open}/{w.days.length} unlocked</span>
            </p>
            <NotesAccordion notes={w.days} unlockedDays={unlocked} hideWeekHeading />
          </div>
        )
      };
    })
  ];

  return (
    <div>
      {course.extra}
      <Tabs tabs={tabs} defaultKey={tabs[0].key} />
    </div>
  );
}

export default function NotesBrowser({ courses }) {
  if (!courses.length) return null;
  if (courses.length === 1) return <CourseNotes course={courses[0]} />;
  return (
    <Tabs
      tabs={courses.map((c) => ({ key: c.key, label: c.name.split(' — ')[0], content: <CourseNotes course={c} /> }))}
      defaultKey={courses[0].key}
    />
  );
}
