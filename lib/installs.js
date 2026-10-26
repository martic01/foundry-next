import { COURSES } from './courses';
import { COURSE_TOOLS, TOOLS, COMMUNITY_ID } from './install-guides';

export const isValidToolId = (id) => id === COMMUNITY_ID || !!TOOLS[id];

// Done = ticked in the new checklist, or (for VS Code and Git) ticked the old way.
export function isToolDone(profile, id) {
  if (profile?.installs && profile.installs[id] === true) return true;
  if (id === 'vscode') return !!profile?.vscode_installed;
  if (id === 'git') return !!profile?.git_installed;
  return false;
}

// Only the courses this student is enrolled in, each with the tools it needs.
export function installPlan(profile, courseKeys) {
  const keys = [...new Set((courseKeys || []).filter((k) => COURSE_TOOLS[k]))];
  const courses = keys.map((key) => ({
    key,
    name: COURSES[key]?.name || key,
    tools: COURSE_TOOLS[key].map((id) => ({ id, label: TOOLS[id].label, done: isToolDone(profile, id) }))
  }));
  const enrolled = (courseKeys || []).length > 0;
  const whatsappPending = enrolled && !isToolDone(profile, COMMUNITY_ID);
  const pendingTools = new Set(courses.flatMap((c) => c.tools.filter((t) => !t.done).map((t) => t.id)));
  return { courses, whatsappPending, pendingCount: pendingTools.size + (whatsappPending ? 1 : 0) };
}
