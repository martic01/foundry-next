import { Megaphone, Link2, Video, UserPlus } from 'lucide-react';
import { createClient } from '../../lib/supabase/server';
import { getUser, getProfile } from '../../lib/supabase/session';
import { getTeacherBatches, shortCourseName } from '../../lib/teacher';
import { COURSES } from '../../lib/courses';
import { getTimerState } from '../../lib/batch-timer';
import ClassStatusBanner, { StatusPill } from '../../components/BatchTimer';
import ProfileCard from '../../components/dashboard/ProfileCard';
import NoBatches from '../../components/teacher/NoBatches';

export const metadata = { title: 'Overview — The Foundry' };

const ICONS = { announcement: Megaphone, link: Link2, video: Video, student: UserPlus };

const when = (iso) =>
  new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' });

export default async function TeacherOverview() {
  const user = await getUser();
  const [profile, batches] = await Promise.all([getProfile(user.id), getTeacherBatches(user.id)]);
  const supabase = await createClient();

  const ids = batches.map((b) => b.id);
  const labelOf = Object.fromEntries(batches.map((b) => [b.id, b.label]));
  const counts = {};
  let activity = [];

  if (ids.length) {
    const [regs, msgs, links, vids] = await Promise.all([
      supabase
        .from('registrations')
        .select('batch_id, created_at, profiles(full_name)')
        .eq('status', 'paid')
        .in('batch_id', ids)
        .order('created_at', { ascending: false }),
      supabase.from('messages').select('batch_id, content, created_at').in('batch_id', ids).order('created_at', { ascending: false }).limit(5),
      supabase.from('class_links').select('batch_id, title, created_at').in('batch_id', ids).order('created_at', { ascending: false }).limit(5),
      supabase.from('class_videos').select('batch_id, title, created_at').in('batch_id', ids).order('created_at', { ascending: false }).limit(5)
    ]);
    (regs.data || []).forEach((r) => {
      counts[r.batch_id] = (counts[r.batch_id] || 0) + 1;
    });
    activity = [
      ...(regs.data || []).slice(0, 5).map((r) => ({ type: 'student', at: r.created_at, batch: r.batch_id, text: `${r.profiles?.full_name || 'A student'} joined` })),
      ...(msgs.data || []).map((m) => ({ type: 'announcement', at: m.created_at, batch: m.batch_id, text: `Announcement: “${m.content.slice(0, 70)}${m.content.length > 70 ? '…' : ''}”` })),
      ...(links.data || []).map((l) => ({ type: 'link', at: l.created_at, batch: l.batch_id, text: `Class link: ${l.title || 'Untitled'}` })),
      ...(vids.data || []).map((v) => ({ type: 'video', at: v.created_at, batch: v.batch_id, text: `Video: ${v.title}` }))
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 8);
  }

  const now = Date.now();
  const taught = [...new Set(batches.map((b) => b.course))];

  return (
    <div>
      <p className="eyebrow mb-2">Overview</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">
        Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
      </h1>

      {/* Same profile card as the student/admin portals; the course badges
          here are the courses this teacher teaches. */}
      <ProfileCard profile={profile} registrations={taught.map((c) => ({ id: c, course: c }))} />

      {!batches.length ? (
        <NoBatches />
      ) : (
        <>
          {/* Live class clock for every batch they teach */}
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-inkdim">Class time</p>
          <ClassStatusBanner
            batches={batches.map((b) => ({ ...b, courseName: COURSES[b.course]?.name || b.course }))}
            serverNow={now}
          />

          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-inkdim">My batches</p>
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            {batches.map((b) => (
              <div key={b.id} className="card p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-inkdim">{shortCourseName(b.course)}</p>
                    <p className="truncate font-display text-lg font-semibold text-ink">{b.label}</p>
                  </div>
                  <StatusPill status={getTimerState(b, now).status} />
                </div>
                <p className="text-sm text-inkdim">
                  {counts[b.id] || 0}/{b.capacity} students
                  {b.start_date
                    ? ` · Starts ${new Date(`${b.start_date}T12:00:00Z`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`
                    : ''}
                </p>
              </div>
            ))}
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-inkdim">Recent</p>
          {!activity.length ? (
            <div className="card p-5 text-sm text-inkdim">Nothing yet — new students, announcements, links and videos for your batches will show up here.</div>
          ) : (
            <ul className="card divide-y divide-line">
              {activity.map((a, i) => {
                const Icon = ICONS[a.type];
                return (
                  <li key={i} className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-sm text-ink">{a.text}</p>
                      <p className="text-xs text-inkdim">
                        {labelOf[a.batch] || 'Your batch'} · {when(a.at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
