-- The Foundry -- database schema + Row Level Security policies.
--
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL
-- Editor -> New query -> paste this whole file -> Run).
--
-- READ THIS FIRST: the RLS policies below are the actual security
-- boundary for this whole system -- not the Next.js code, not a password
-- check in the browser. Postgres itself refuses a student's query for
-- data it isn't allowed to see, even if every line of frontend code were
-- somehow bypassed. That's the property a client-side "type pfadmin"
-- check could never give you.
--
-- Auth model: Google sign-in only (via Supabase Auth), for everyone --
-- students and the admin alike. There is no app-managed password
-- anywhere: Google itself proves the email and handles the credential,
-- so there's nothing here for this app to store, hash, or leak.
--
-- ALREADY RAN AN EARLIER VERSION OF THIS FILE? If your `registrations`
-- table has an `age_range` column instead of `age`, this is a fresh
-- rewrite (age RANGES were replaced with an exact date-of-birth check --
-- see lib/courses.js), so re-running this whole file will fail on
-- already-existing tables. Either drop the old tables first (fine if you
-- have no real registrations yet):
--   drop table if exists messages, class_links, registrations, batches, profiles cascade;
--   drop type if exists course_key, user_role, registration_status cascade;
-- ...then run this whole file again -- or, if you already have real
-- data, migrate the one column instead:
--   alter table registrations add column age int;
--   -- (backfill `age` for existing rows however makes sense, then:)
--   alter table registrations alter column age set not null;
--   alter table registrations drop column age_range;
--
-- ALREADY RAN SCHEMA WITHOUT laptop_specs_agreed / vscode_installed /
-- git_installed? Run this instead of the whole file:
--   alter table registrations add column laptop_specs_agreed boolean not null default false;
--   alter table profiles add column vscode_installed boolean not null default false;
--   alter table profiles add column git_installed boolean not null default false;
--   create or replace function set_installation_status(p_vscode boolean, p_git boolean) returns void
--   language plpgsql security definer as $$
--   begin
--     update profiles set vscode_installed = p_vscode, git_installed = p_git where id = auth.uid();
--   end;
--   $$;
--   drop policy if exists "profiles_update" on profiles;
--   create policy "profiles_update" on profiles for update using (is_admin());
--
-- ALREADY RAN SCHEMA WITHOUT note_unlocks (the lesson-notes feature)?
-- Run this instead:
--   create table note_unlocks (
--     course course_key not null,
--     day int not null,
--     unlocked_at timestamptz not null default now(),
--     primary key (course, day)
--   );
--   alter table note_unlocks enable row level security;
--   create policy "note_unlocks_select" on note_unlocks for select using (true);
--   create policy "note_unlocks_admin_insert" on note_unlocks for insert with check (is_admin());
--   create policy "note_unlocks_admin_delete" on note_unlocks for delete using (is_admin());
--   insert into note_unlocks (course, day) values ('foundations', 1) on conflict (course, day) do nothing;
--
-- ALREADY RAN SCHEMA WITHOUT class_videos (the Cloudinary class-video
-- feature)? Run this instead:
--   create table class_videos (
--     id uuid primary key default gen_random_uuid(),
--     batch_id uuid not null references batches(id) on delete cascade,
--     title text not null,
--     description text,
--     cloudinary_url text not null,
--     cloudinary_public_id text,
--     created_at timestamptz not null default now(),
--     created_by uuid references profiles(id)
--   );
--   alter table class_videos enable row level security;
--   create policy "class_videos_select" on class_videos for select
--     using (
--       is_admin() or (
--         not is_blocked() and batch_id in (
--           select batch_id from registrations
--           where user_id = auth.uid() and status = 'paid'
--         )
--       )
--     );
--   create policy "class_videos_admin_insert" on class_videos for insert with check (is_admin());
--   create policy "class_videos_admin_delete" on class_videos for delete using (is_admin());
--
-- ALREADY RAN SCHEMA WITHOUT rate_limits (the security-hardening pass --
-- /api/payments/verify rate limiting)? Run this instead:
--   create table rate_limits (
--     key text primary key,
--     count int not null default 1,
--     window_start timestamptz not null default now()
--   );
--   alter table rate_limits enable row level security;
--   create or replace function check_rate_limit(p_key text, p_max int, p_window_seconds int) returns boolean
--   language plpgsql security definer as $$
--   declare
--     v_count int;
--   begin
--     insert into rate_limits (key, count, window_start)
--     values (p_key, 1, now())
--     on conflict (key) do update
--       set count = case
--           when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
--             then 1
--           else rate_limits.count + 1
--         end,
--         window_start = case
--           when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
--             then now()
--           else rate_limits.window_start
--         end
--     returning count into v_count;
--     return v_count <= p_max;
--   end;
--   $$;

-- ALREADY HAVE A DATABASE WITHOUT payment_status (cash / part / pending /
-- complimentary for directly-added students)? Run
-- supabase/migration-payment-status.sql -- one small, re-runnable step.
--
-- ALREADY RAN AN EARLIER VERSION (30-seat batches, one class link per
-- batch, no timer / registration controls)? Run
-- supabase/migration-batch-controls.sql instead of this whole file. It is
-- safe to re-run.

create extension if not exists pgcrypto;

create type course_key as enum ('foundations', 'react', 'cybersecurity', 'hr');
create type user_role as enum ('student', 'admin', 'teacher');
create type registration_status as enum ('paid', 'removed');

-- One row per authenticated user (students AND the admin), extending
-- Supabase's built-in auth.users. full_name/email are copied in from the
-- Google profile at registration time (see app/api/payments/verify) so
-- they're queryable without joining into the auth schema.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'student',
  blocked boolean not null default false,
  -- Self-reported "I've installed this" checkboxes on the Installation
  -- page -- what drives the sidebar's blinking indicator and the
  -- dashboard pop-up nudge going away once both are true. Not verified
  -- against anything (there's no way to actually check a student's
  -- machine from the server) -- it's an honesty-based checklist, not an
  -- enforcement mechanism.
  vscode_installed boolean not null default false,
  git_installed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Groups of up to `capacity` (50) students per course.
create table batches (
  id uuid primary key default gen_random_uuid(),
  course course_key not null,
  label text not null, -- admin-editable; shown to students as their batch name
  capacity int not null default 50,
  -- Admin-announced start date, shown to students. Informational only --
  -- the class timer below is started separately with the Start button.
  start_date date,
  -- Class timer (9 weeks by default). Remaining time =
  --   total - elapsed - (now - started_at, only while 'running').
  -- See lib/batch-timer.js for the state machine.
  class_status text not null default 'not_started'
    check (class_status in ('not_started', 'running', 'paused', 'ended')),
  timer_total_seconds int not null default 5443200,
  timer_elapsed_seconds int not null default 0,
  timer_started_at timestamptz,
  timer_ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- Confirmed, Paystack-verified enrollments.
create table registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course course_key not null,
  -- The computed age at registration time, not the raw date of birth --
  -- enough for an audit trail of "were they eligible" without holding
  -- onto more sensitive data (an exact birthdate) than that check needs.
  age int not null,
  batch_id uuid references batches(id) on delete set null,
  paystack_reference text not null unique,
  amount_kobo int not null, -- money actually RECEIVED so far
  status registration_status not null default 'paid', -- access flag, not payment state
  -- Payment state for admin-created registrations (cash / transfer /
  -- comps). Paystack rows are always 'paid'. Editable from
  -- /admin/payments, see lib/payments.js.
  payment_status text not null default 'paid'
    check (payment_status in ('paid', 'part', 'pending', 'free')),
  amount_due_kobo int,  -- agreed total for 'part' / 'pending'; NULL otherwise
  payment_method text
    check (payment_method in ('cash', 'bank_transfer', 'pos', 'other')),
  -- Ticked on the payment page before the Pay button unlocks -- a record
  -- that this specific student was shown and agreed to the minimum
  -- laptop spec requirements (lib/laptop-specs.js) for THIS course, at
  -- the time they paid for it.
  laptop_specs_agreed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Class links, set/edited/deleted by the admin. Aimed at one batch or all.
-- batch_id NULL = shown to every batch.
create table class_links (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete cascade,
  title text,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- Broadcast-only messages per batch -- students read, only the admin
-- writes (enforced below by the insert policy, not just the UI).
create table messages (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete cascade, -- NULL = all batches
  sender_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- One class recording per row, hosted on Cloudinary (not Supabase
-- storage) specifically to avoid eating into Supabase's storage/bandwidth
-- quota with large video files -- only the resulting URL lives here, the
-- actual video bytes live on Cloudinary's CDN. cloudinary_public_id is
-- kept alongside the URL so a future "actually delete from Cloudinary
-- too" admin action has what it needs to call Cloudinary's destroy API;
-- deleting this row only removes it from the app, not from Cloudinary
-- itself.
create table class_videos (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete cascade, -- NULL = all batches
  title text not null,
  description text,
  cloudinary_url text not null,
  cloudinary_public_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- Which lesson-note days are visible yet, per course -- the actual note
-- CONTENT lives in the app's code (lib/notes/*.js), not in this table;
-- this table only ever holds "day N of course X is unlocked" rows.
-- Presence of a row = unlocked, so locking a day is just deleting its
-- row. Day 1 ships unlocked by default (seeded below); the admin
-- controls everything after that from /admin/notes.
create table note_unlocks (
  course course_key not null,
  day int not null,
  unlocked_at timestamptz not null default now(),
  primary key (course, day)
);

-- Per-course registration controls, edited from /admin/registration.
create table course_settings (
  course course_key primary key,
  registration_open boolean not null default true,
  tag text not null default 'none'
    check (tag in ('none', 'coming_soon', 'ended', 'limited_seats', 'sold_out')),
  reopen_at timestamptz,            -- NULL while closed = "until further notice"
  registration_closed_at timestamptz, -- lets verify honour payments started before the close
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

-- Backs check_rate_limit() below -- one row per rate-limited "thing"
-- (e.g. one row per user hitting /api/payments/verify), tracking a
-- count within a rolling window. Not meant to be queried directly by
-- the app; check_rate_limit() is the only intended way to read/write
-- this table, and RLS below denies all direct access since this is
-- called via the service-role client anyway (route handlers, not RLS-
-- bound student sessions).
create table rate_limits (
  key text primary key,
  count int not null default 1,
  window_start timestamptz not null default now()
);

-- ---------- Helper functions (used inside the RLS policies below) ----------

create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_blocked() returns boolean
language sql security definer stable as $$
  select coalesce((select blocked from profiles where id = auth.uid()), false);
$$;

-- Finds the oldest batch for a course that still has room (< capacity
-- paid registrations), or creates a new one -- the "50 per group"
-- batching. A batch whose class has ended (or whose running timer has run
-- out) no longer takes new students. The advisory lock makes
-- count-then-insert atomic so two simultaneous payments can't both take
-- the last seat. security definer + only ever called from server-only
-- code (service-role client) so it isn't reachable by a student session.
create or replace function assign_batch(p_course course_key) returns uuid
language plpgsql security definer as $$
declare
  v_batch_id uuid;
  v_batch_num int;
begin
  perform pg_advisory_xact_lock(hashtext('assign_batch:' || p_course::text));

  select b.id into v_batch_id
  from batches b
  where b.course = p_course
    and b.class_status <> 'ended'
    and (
      b.class_status <> 'running'
      or b.timer_started_at is null
      or b.timer_started_at
         + make_interval(secs => greatest(b.timer_total_seconds - b.timer_elapsed_seconds, 0)) > now()
    )
    and (
      select count(*) from registrations r
      where r.batch_id = b.id and r.status = 'paid'
    ) < b.capacity
  order by b.created_at asc
  limit 1;

  if v_batch_id is not null then
    return v_batch_id;
  end if;

  select count(*) + 1 into v_batch_num from batches where course = p_course;
  insert into batches (course, label, capacity)
  values (p_course, initcap(replace(p_course::text, '_', ' ')) || ' -- Batch ' || v_batch_num, 50)
  returning id into v_batch_id;

  return v_batch_id;
end;
$$;

-- True when the caller may see content aimed at p_batch_id: admins
-- always; students when not blocked and holding a paid registration in
-- that batch -- or, for content aimed at ALL batches (p_batch_id null),
-- a paid registration in any batch. Shared by the class_links,
-- class_videos and messages policies below.
create or replace function can_view_batch_content(p_batch_id uuid) returns boolean
language sql security definer stable as $$
  select is_admin() or (
    not is_blocked() and exists (
      select 1 from registrations r
      where r.user_id = auth.uid()
        and r.status = 'paid'
        and (p_batch_id is null or r.batch_id = p_batch_id)
    )
  );
$$;

-- Atomic rate limiter, backed by the rate_limits table above -- exists
-- specifically because serverless functions (this app's API routes,
-- deployed on Vercel) don't share memory between invocations, so a
-- plain in-process counter would reset constantly and protect nothing;
-- the database is the one piece of shared state every invocation can
-- see. Used by /api/payments/verify to stop a signed-in account (or a
-- script using stolen session cookies) from hammering that endpoint --
-- each call there triggers a real request to Paystack's API, so
-- unrestricted retries cost real API quota, not just server time.
-- p_key should already be scoped to whatever you're limiting (e.g.
-- 'verify:' || user_id) -- this function doesn't scope it for you.
-- Returns true if the call is within the limit and should proceed,
-- false if it should be rejected. The upsert + returning is what makes
-- the increment-and-check atomic under concurrent requests -- two
-- requests arriving at the same instant can't both read a stale count
-- and both think they're under the limit.
create or replace function check_rate_limit(p_key text, p_max int, p_window_seconds int) returns boolean
language plpgsql security definer as $$
declare
  v_count int;
begin
  insert into rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
        when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
          then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
          then now()
        else rate_limits.window_start
      end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- Lets a signed-in user tick their own "I've installed this" checkboxes
-- on the Installation page. A dedicated function instead of writing
-- through profiles_update directly -- that policy's USING clause only
-- checks row ownership, not which columns are being changed, so a raw
-- update through it would let a student's own session set ANY column on
-- their row (see the note on profiles_update below for why that's worth
-- tightening separately). This only ever touches these two booleans,
-- only ever for auth.uid()'s own row.
create or replace function set_installation_status(p_vscode boolean, p_git boolean) returns void
language plpgsql security definer as $$
begin
  update profiles set vscode_installed = p_vscode, git_installed = p_git where id = auth.uid();
end;
$$;

-- ---------- Row Level Security ----------

alter table profiles enable row level security;
alter table batches enable row level security;
alter table registrations enable row level security;
alter table class_links enable row level security;
alter table messages enable row level security;
alter table class_videos enable row level security;
alter table note_unlocks enable row level security;
alter table course_settings enable row level security;
-- rate_limits gets RLS enabled with NO policies at all -- deliberate
-- deny-by-default. Nothing should ever read/write this table except
-- check_rate_limit() (security definer, so it runs with elevated
-- privileges regardless) via the service-role client in
-- /api/payments/verify; no student session should be able to touch it
-- directly in either direction.
alter table rate_limits enable row level security;

-- profiles: a student can see only their own row; the admin can see/
-- update everyone's. There is no public insert policy -- rows are only
-- ever created by app/api/payments/verify using the service-role key,
-- right after that same request independently verified the payment with
-- Paystack -- that's trusted server code, not a student's browser.
--
-- profiles_update intentionally does NOT include an `id = auth.uid()`
-- branch: a plain "update your own row" clause has no way to say WHICH
-- columns that covers, so it would let a student's own session set role
-- or blocked on themselves via a direct Supabase client call, bypassing
-- the app entirely. Nothing in the app needs that -- the one thing a
-- student can self-update (their install-status checkboxes) goes through
-- set_installation_status() above instead, which is scoped to exactly
-- those two columns regardless of this policy.
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_update" on profiles for update
  using (is_admin());

-- batches: a student can see only their own batch (and only while not
-- blocked); the admin can see and manage all of them.
create policy "batches_select" on batches for select
  using (
    is_admin() or (
      not is_blocked() and id in (
        select batch_id from registrations
        where user_id = auth.uid() and status = 'paid'
      )
    )
  );
create policy "batches_admin_insert" on batches for insert with check (is_admin());
create policy "batches_admin_update" on batches for update using (is_admin());

-- registrations: a student can see only their own; the admin can see and
-- update (e.g. remove from batch) all of them.
create policy "registrations_select" on registrations for select
  using (user_id = auth.uid() or is_admin());
create policy "registrations_admin_update" on registrations for update using (is_admin());

-- class_links / class_videos / messages: one shared visibility rule
-- (can_view_batch_content above) -- a student sees items aimed at their
-- own batch plus items aimed at ALL batches (batch_id null), and only
-- while not blocked/removed. Only the admin can write: this is what
-- actually makes announcements broadcast-only, not a hidden "send"
-- button. Deleting a video row removes it from the app immediately even
-- though the file stays on Cloudinary until removed there separately.
create policy "class_links_select" on class_links for select using (can_view_batch_content(batch_id));
create policy "class_links_admin_insert" on class_links for insert with check (is_admin());
create policy "class_links_admin_update" on class_links for update using (is_admin());
create policy "class_links_admin_delete" on class_links for delete using (is_admin());

create policy "messages_select" on messages for select using (can_view_batch_content(batch_id));
create policy "messages_admin_insert" on messages for insert
  with check (is_admin() and sender_id = auth.uid());
create policy "messages_admin_update" on messages for update using (is_admin());
create policy "messages_admin_delete" on messages for delete using (is_admin());

create policy "class_videos_select" on class_videos for select using (can_view_batch_content(batch_id));
create policy "class_videos_admin_insert" on class_videos for insert with check (is_admin());
create policy "class_videos_admin_update" on class_videos for update using (is_admin());
create policy "class_videos_admin_delete" on class_videos for delete using (is_admin());

-- course_settings: public read (the landing page and /register need it
-- before anyone signs in -- nothing sensitive), admin-only write.
create policy "course_settings_select" on course_settings for select using (true);
create policy "course_settings_admin_insert" on course_settings for insert with check (is_admin());
create policy "course_settings_admin_update" on course_settings for update using (is_admin());

insert into course_settings (course, registration_open, tag) values
  ('foundations', true, 'none'),
  ('react', false, 'coming_soon')
on conflict (course) do nothing;

-- note_unlocks: everyone signed in can read it (it's just "which days
-- are open", not sensitive) -- the actual note text is bundled into the
-- app itself and never sent to the browser for a locked day in the
-- first place, so this table leaking wouldn't expose any content, only
-- which day numbers are unlocked. Only the admin can insert/delete rows
-- (i.e. lock/unlock a day).
create policy "note_unlocks_select" on note_unlocks for select using (true);
create policy "note_unlocks_admin_insert" on note_unlocks for insert with check (is_admin());
create policy "note_unlocks_admin_delete" on note_unlocks for delete using (is_admin());

-- Day 1 of Foundations ships unlocked so a brand-new student always has
-- something to read immediately -- everything else the admin unlocks
-- manually from /admin/notes as the cohort progresses.
insert into note_unlocks (course, day) values ('foundations', 1)
  on conflict (course, day) do nothing;

-- Realtime for the live class banner and announcements feed (both also
-- poll as a fallback, so this is an upgrade, not a requirement).
do $$ begin
  alter publication supabase_realtime add table batches;
exception when duplicate_object or undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object or undefined_object then null; end $$;

-- ---------- Bootstrapping your own admin account ----------
-- 1. Sign in once through /login or /register with "Continue with
--    Google", using the Google account you want to be admin. This
--    creates your auth.users row; a profiles row is created the first
--    time you complete a paid registration (or you can insert one
--    yourself for a no-payment admin account -- see below).
-- 2. Promote it:
--
--    update profiles set role = 'admin' where email = 'you@example.com';
--
--    If you want an admin account that never went through a paid
--    registration (so no profiles row exists yet), insert one manually
--    after signing in once (grab your id from auth.users in the
--    Table Editor):
--
--    insert into profiles (id, full_name, email, role)
--    values ('<your-auth-user-id>', 'Your Name', 'you@example.com', 'admin');

-- ---------- Run these after this file on a fresh project ----------
--   supabase/migration-notifications.sql   (student alerts / pop-ups)
--   supabase/migration-teachers.sql        (Teacher role, manual batches)
--   supabase/migration-placeholder-notes.sql
--   supabase/migration-security-hardening.sql
-- (migration-new-courses.sql / migration-teacher-role.sql are only for
-- databases created before those enum values existed.)
