import { Crown, GraduationCap, Mail, CheckCircle2, ShieldAlert } from 'lucide-react';
import { COURSES } from '../../lib/courses';

// Deliberately scoped to just this card (see the comment in
// tailwind.config.js on why the rest of the site is a light theme) --
// this recreates the dark/gold look from the reference profile card
// design, just contained to one component instead of the whole site.

// Role-based color: admin vs student get visibly different badge colors
// so it reads at a glance, same idea as the course-stage colors below.
const ROLE_STYLES = {
  admin: { label: 'Admin', icon: Crown, className: 'border-[#f2c94c]/40 bg-[#3a2a04] text-[#f2c94c]' },
  student: { label: 'Student', icon: GraduationCap, className: 'border-[#34d399]/40 bg-[#062f2a] text-[#34d399]' }
};

function initials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ProfileCard({ profile, registrations = [] }) {
  const role = profile?.role === 'admin' ? 'admin' : 'student';
  const roleStyle = ROLE_STYLES[role];
  const RoleIcon = roleStyle.icon;

  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-[#caa43d]/50 bg-gradient-to-br from-[#0c0d10] via-[#131419] to-[#0c0d10] p-6 text-white shadow-[0_0_40px_-14px_rgba(184,134,11,0.5)] sm:p-8">
      {/* Gold foil corner accent, echoing the reference card */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rotate-45 bg-gradient-to-br from-[#caa43d]/25 to-transparent" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#caa43d] bg-[#1a1b21] font-display text-xl font-semibold text-[#f2c94c]">
          {initials(profile?.full_name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-xl font-extrabold text-white sm:text-2xl">
              {profile?.full_name || 'Student'}
            </h1>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${roleStyle.className}`}>
              <RoleIcon className="h-3 w-3" /> {roleStyle.label}
            </span>
            {profile?.blocked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-950/60 px-2.5 py-0.5 text-[11px] font-medium text-red-300">
                <ShieldAlert className="h-3 w-3" /> Restricted
              </span>
            )}
          </div>

          {profile?.email && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/60">
              <Mail className="h-3.5 w-3.5" /> {profile.email}
            </p>
          )}

          {/* Course-stage-based color: each stage keeps the same accent
              color everywhere it shows up (lib/courses.js is the single
              source for it), so Stage 1 vs Stage 2 badges are always
              recognizable even as more stages get added later. */}
          {!!registrations.length && (
            <div className="mt-4 flex flex-wrap gap-2">
              {registrations.map((reg) => {
                const course = COURSES[reg.course];
                if (!course) return null;
                return (
                  <span
                    key={reg.id}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                    style={{
                      borderColor: `${course.accent}66`,
                      backgroundColor: `${course.accent}1a`,
                      color: course.accent
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3" /> {course.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
