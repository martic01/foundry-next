-- The Foundry -- "batch controls" migration.
--
-- Run this ONCE in the Supabase SQL Editor on a project that already has
-- the earlier schema (supabase/schema.sql as of the previous version).
-- It is written to be safe to re-run: every step is "if not exists" /
-- "drop ... if exists" / "or replace".
--
-- Fresh project? You don't need this file -- supabase/schema.sql already
-- contains all of it.
--
-- What this adds:
--   1. batches: 50 seats (was 30), an admin-set start date, and the
--      9-week class timer state (start / pause / resume / restart / end).
--   2. class_links: no longer "one link per batch". Many links, each aimed
--      at one batch or at ALL batches, editable and deletable.
--   3. class_videos and messages (announcements): batch_id is now
--      nullable -- NULL means "all batches" -- and both can be edited.
--   4. course_settings: per-course registration switch, status tag
--      (coming soon / ended / limited seats / all seats taken) and the
--      date registration reopens.
--   5. One shared RLS helper (can_view_batch_content) so the three
--      content tables use identical visibility rules.

-- ---------- 1. batches ----------

alter table batches alter column capacity set default 50;
-- Only touch batches still on the old default; a capacity you set by
-- hand to something else is left alone.
update batches set capacity = 50 where capacity = 30;

alter table batches
  add column if not exists start_date date,
  add column if not exists class_status text not null default 'not_started',
  add column if not exists timer_total_seconds int not null default 5443200, -- 9 weeks
  add column if not exists timer_elapsed_seconds int not null default 0,
  add column if not exists timer_started_at timestamptz,
  add column if not exists timer_ended_at timestamptz;

alter table batches drop constraint if exists batches_class_status_check;
alter table batches add constraint batches_class_status_check
  check (class_status in ('not_started', 'running', 'paused', 'ended'));

-- ---------- 2. class_links ----------

alter table class_links add column if not exists id uuid default gen_random_uuid();
update class_links set id = gen_random_uuid() where id is null;
alter table class_links alter column id set not null;
alter table class_links drop constraint if exists class_links_pkey;
alter table class_links add primary key (id);
alter table class_links alter column batch_id drop not null; -- NULL = all batches
alter table class_links
  add column if not exists title text,
  add column if not exists created_at timestamptz not null default now();

-- ---------- 3. class_videos + messages ----------

alter table class_videos alter column batch_id drop not null; -- NULL = all batches
alter table class_videos add column if not exists updated_at timestamptz not null default now();

alter table messages alter column batch_id drop not null; -- NULL = all batches
alter table messages add column if not exists updated_at timestamptz;

-- ---------- 4. course_settings ----------

create table if not exists course_settings (
  course course_key primary key,
  registration_open boolean not null default true,
  tag text not null default 'none'
    check (tag in ('none', 'coming_soon', 'ended', 'limited_seats', 'sold_out')),
  -- When registration/payment reopens. NULL while closed = "until
  -- further notice". Once this moment passes, the closure lifts by
  -- itself (see lib/course-status.js).
  reopen_at timestamptz,
  -- Set the moment registration closes. /api/payments/verify uses it to
  -- still honour a payment that was STARTED before the close, so nobody
  -- is charged and then refused because the admin closed registration
  -- while their Paystack window was open.
  registration_closed_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

alter table course_settings enable row level security;

-- Public on purpose: the landing page and /register need to know whether
-- a course is open before anyone is signed in. Nothing sensitive here.
drop policy if exists "course_settings_select" on course_settings;
create policy "course_settings_select" on course_settings for select using (true);
drop policy if exists "course_settings_admin_insert" on course_settings;
create policy "course_settings_admin_insert" on course_settings for insert with check (is_admin());
drop policy if exists "course_settings_admin_update" on course_settings;
create policy "course_settings_admin_update" on course_settings for update using (is_admin());

-- Seeds match how the app behaved before: Stage 1 open, Stage 2 coming
-- soon. "on conflict do nothing" keeps anything you've already changed.
insert into course_settings (course, registration_open, tag) values
  ('foundations', true, 'none'),
  ('react', false, 'coming_soon')
on conflict (course) do nothing;

-- ---------- 5. Shared visibility helper + policies ----------

-- True when the caller may see content aimed at p_batch_id:
--   * admins: always
--   * students: not blocked, and holding a paid registration in that
--     batch -- or, for content aimed at ALL batches (p_batch_id is
--     null), a paid registration in any batch.
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

-- class_links
drop policy if exists "class_links_select" on class_links;
create policy "class_links_select" on class_links for select using (can_view_batch_content(batch_id));
drop policy if exists "class_links_admin_insert" on class_links;
create policy "class_links_admin_insert" on class_links for insert with check (is_admin());
drop policy if exists "class_links_admin_update" on class_links;
create policy "class_links_admin_update" on class_links for update using (is_admin());
drop policy if exists "class_links_admin_delete" on class_links;
create policy "class_links_admin_delete" on class_links for delete using (is_admin());

-- class_videos
drop policy if exists "class_videos_select" on class_videos;
create policy "class_videos_select" on class_videos for select using (can_view_batch_content(batch_id));
drop policy if exists "class_videos_admin_insert" on class_videos;
create policy "class_videos_admin_insert" on class_videos for insert with check (is_admin());
drop policy if exists "class_videos_admin_update" on class_videos;
create policy "class_videos_admin_update" on class_videos for update using (is_admin());
drop policy if exists "class_videos_admin_delete" on class_videos;
create policy "class_videos_admin_delete" on class_videos for delete using (is_admin());

-- messages (announcements)
drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages for select using (can_view_batch_content(batch_id));
drop policy if exists "messages_admin_insert" on messages;
create policy "messages_admin_insert" on messages for insert
  with check (is_admin() and sender_id = auth.uid());
drop policy if exists "messages_admin_update" on messages;
create policy "messages_admin_update" on messages for update using (is_admin());
drop policy if exists "messages_admin_delete" on messages;
create policy "messages_admin_delete" on messages for delete using (is_admin());

-- ---------- 6. assign_batch: 50 seats, skip finished batches ----------

-- Same job as before (oldest batch with room, else a new one) with two
-- changes: capacity is 50, and a batch whose class has ENDED -- or whose
-- running timer has already run out -- no longer takes new students. The
-- advisory lock makes the count-then-insert atomic, so two students
-- paying at the same instant can't both squeeze into seat 50.
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

-- ---------- 7. Realtime ----------
-- Lets the student banner and the announcements feed update the moment
-- the admin pauses a timer or posts something. (Both also poll as a
-- fallback, so nothing breaks if these two lines are skipped.)
do $$ begin
  alter publication supabase_realtime add table batches;
exception when duplicate_object or undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object or undefined_object then null; end $$;
