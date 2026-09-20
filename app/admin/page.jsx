import Link from 'next/link';
import { ArrowRight, Unlock, MessageSquare } from 'lucide-react';
import { createClient } from '../../lib/supabase/server';
import { COURSES, formatNaira } from '../../lib/courses';
import ProfileCard from '../../components/dashboard/ProfileCard';

export const metadata = { title: 'Admin overview — The Foundry' };

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const [{ data: registrations }, { data: unlocks }, { data: messages }] = await Promise.all([
    supabase
      .from('registrations')
      .select('course, amount_kobo, created_at, profiles(full_name, email)')
      .eq('status', 'paid')
      .order('created_at', { ascending: false }),
    supabase.from('note_unlocks').select('course, day, unlocked_at').order('unlocked_at', { ascending: false }).limit(5),
    supabase
      .from('messages')
      .select('content, created_at, batches(label)')
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const totalRevenueKobo = (registrations || []).reduce((sum, r) => sum + (r.amount_kobo || 0), 0);
  const perCourse = { foundations: 0, react: 0 };
  (registrations || []).forEach((r) => {
    if (perCourse[r.course] !== undefined) perCourse[r.course] += 1;
  });
  const recentPayments = (registrations || []).slice(0, 5);

  // Merged, chronologically-sorted feed of operational activity -- not
  // money (that's "Recent payments" below), but the things an admin DID:
  // unlocking a lesson day, broadcasting a message. Each source already
  // has its own timestamp column; this just interleaves them.
  const activity = [
    ...(unlocks || []).map((u) => ({
      type: 'unlock',
      at: u.unlocked_at,
      text: `Unlocked Day ${u.day} of ${COURSES[u.course]?.name?.split(' — ')[0] || u.course}`
    })),
    ...(messages || []).map((m) => ({
      type: 'message',
      at: m.created_at,
      text: `Sent a broadcast to ${m.batches?.label || 'a batch'}: "${m.content.slice(0, 60)}${m.content.length > 60 ? '…' : ''}"`
    }))
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);

  return (
    <div>
      <p className="eyebrow mb-2">Overview</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Admin overview</h1>

      {/* Same profile card design/theme as the student portal -- role
          color here will always read 'Admin' (gold/crown) since this
          layout already gated on profile.role === 'admin'. Admins don't
          have course registrations of their own, so no stage badges show
          up here -- that's expected, not a bug. */}
      <ProfileCard profile={profile} registrations={[]} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-inkdim">Total revenue</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-ink">{formatNaira(totalRevenueKobo / 100)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-inkdim">Paid registrations</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-ink">{registrations?.length || 0}</p>
        </div>
        <div className="card p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-inkdim">By course</p>
          {Object.entries(perCourse).map(([key, count]) => (
            <p key={key} className="text-sm text-ink">
              {COURSES[key]?.name?.split(' — ')[0] || key}: <span className="font-semibold">{count}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Recent payments</p>
            <Link href="/admin/payments" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {!recentPayments.length ? (
            <p className="text-sm text-inkdim">No payments yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {recentPayments.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{r.profiles?.full_name || r.profiles?.email}</p>
                    <p className="truncate text-xs text-inkdim">{COURSES[r.course]?.name || r.course}</p>
                  </div>
                  <p className="flex-shrink-0 font-semibold text-ink">{formatNaira(r.amount_kobo / 100)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <p className="mb-4 text-sm font-semibold text-ink">Recent activity</p>
          {!activity.length ? (
            <p className="text-sm text-inkdim">No activity yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-3 text-sm">
                  {a.type === 'unlock' ? (
                    <Unlock className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
                  ) : (
                    <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
                  )}
                  <div className="min-w-0">
                    <p className="text-ink">{a.text}</p>
                    <p className="text-xs text-inkdim">
                      {new Date(a.at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
