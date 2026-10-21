-- STEP 2. Everything else, in the right order. Safe to re-run on a database that already
-- has some or all of it (every statement is "if not exists" / "or replace").
-- Run AFTER 1-enums.sql.

-- ==================================================================
-- Batches (50 seats, 9-week timer), many class links, per-course registration settings
-- ==================================================================

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

-- ==================================================================
-- Payment status for manually registered students
-- ==================================================================

-- The Foundry -- "payment status" migration.
--
-- Run ONCE in the Supabase SQL Editor on a project that already has the
-- schema. Safe to re-run. Fresh project? Skip this -- schema.sql already
-- contains it.
--
-- Lets the admin record HOW and HOW MUCH a directly-added student paid:
--   payment_status  paid | part | pending | free
--   amount_kobo     money actually received so far (already existed)
--   amount_due_kobo the agreed total, for part / pending (NULL otherwise)
--   payment_method  cash | bank_transfer | pos | other
--
-- registrations.status ('paid' | 'removed') is untouched and still means
-- "does this student have access?". Paystack rows keep working as-is:
-- they default to payment_status 'paid' with no amount_due.

alter table registrations
  add column if not exists payment_status text not null default 'paid'
    check (payment_status in ('paid', 'part', 'pending', 'free')),
  add column if not exists amount_due_kobo int,
  add column if not exists payment_method text
    check (payment_method in ('cash', 'bank_transfer', 'pos', 'other'));

-- Students the admin added before this existed were recorded as paid
-- with amount 0 -- that is really "complimentary". (The payment_status
-- guard keeps this from touching anything you've edited since.)
update registrations
set payment_status = 'free'
where paystack_reference like 'ADMIN-ADDED-%'
  and amount_kobo = 0
  and payment_status = 'paid';

-- ==================================================================
-- Alerts / notifications
-- ==================================================================

-- Per-student alerts: announcement pop-ups (must be acknowledged) and
-- "something new was uploaded" alerts (video / class link / notes).
-- Run AFTER migration-new-courses.sql. Safe to re-run.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('announcement', 'video', 'link', 'notes')),
  title text not null,
  body text,
  href text,
  -- Deleting an announcement removes its pop-ups too.
  message_id uuid references messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_unread_idx
  on notifications (user_id, created_at) where read_at is null;

alter table notifications enable row level security;

drop policy if exists "notifications_select_own" on notifications;
drop policy if exists "notifications_update_own" on notifications;
drop policy if exists "notifications_admin_insert" on notifications;
drop policy if exists "notifications_admin_delete" on notifications;

create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_admin_insert" on notifications for insert with check (is_admin());
create policy "notifications_admin_delete" on notifications for delete using (is_admin());

-- A student may only flip read_at -- never rewrite the text of an alert.
revoke update on notifications from authenticated;
grant update (read_at) on notifications to authenticated;

do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ==================================================================
-- Teachers, batch teachers, manual batches, teacher access rules
-- ==================================================================

-- Step 2 of 2 for the Teacher role + manual batches. Run AFTER
-- migration-teacher-role.sql (and after migration-notifications.sql).
-- Safe to re-run.
--
-- What this adds:
--   * batches.auto_assign: an admin can create a batch that automatic
--     registration never fills (the admin places students in it by hand).
--   * batch_teachers: which teacher teaches which batch(es).
--   * Teachers can, for THEIR batches only: see the batch and its
--     students, and add/edit/delete class links, videos and
--     announcements. Nothing outside their batches -- and nothing for
--     "all batches" (batch_id null), which stays admin-only.

-- ---------- batches ----------

alter table batches add column if not exists auto_assign boolean not null default true;

-- Same logic as before, plus "auto_assign" and the pinned search_path
-- (create or replace resets function settings, so it's restated here).
create or replace function assign_batch(p_course course_key) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_batch_id uuid;
  v_batch_num int;
begin
  perform pg_advisory_xact_lock(hashtext('assign_batch:' || p_course::text));

  select b.id into v_batch_id
  from batches b
  where b.course = p_course
    and b.auto_assign
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

-- A batch can never hold more than 50 students.
alter table batches drop constraint if exists batches_capacity_check;
alter table batches add constraint batches_capacity_check check (capacity between 1 and 50);

-- ---------- batch_teachers ----------

create table if not exists batch_teachers (
  batch_id uuid not null references batches(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (batch_id, teacher_id)
);
create index if not exists batch_teachers_teacher_idx on batch_teachers (teacher_id);
alter table batch_teachers enable row level security;

-- ---------- helpers (security definer, so they don't recurse into RLS) ----------

create or replace function is_teacher() returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'teacher' and not blocked
  );
$$;

-- True when the caller is a (non-blocked) teacher assigned to the batch.
-- p_batch_id null -> false: "all batches" content is never a teacher's.
create or replace function teaches_batch(p_batch_id uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select p_batch_id is not null and is_teacher() and exists (
    select 1 from batch_teachers bt
    where bt.batch_id = p_batch_id and bt.teacher_id = auth.uid()
  );
$$;

-- True when the caller is a teacher of a batch this student is paid into.
create or replace function teacher_sees_student(p_user_id uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select is_teacher() and exists (
    select 1
    from registrations r
    join batch_teachers bt on bt.batch_id = r.batch_id
    where r.user_id = p_user_id and r.status = 'paid' and bt.teacher_id = auth.uid()
  );
$$;

revoke execute on function is_teacher(), teaches_batch(uuid), teacher_sees_student(uuid) from public, anon;
grant  execute on function is_teacher(), teaches_batch(uuid), teacher_sees_student(uuid) to authenticated, service_role;

-- Students keep their rule; teachers add "my own batch" (reading only
-- what is aimed at a batch they teach -- never "all batches" content).
create or replace function can_view_batch_content(p_batch_id uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select is_admin() or teaches_batch(p_batch_id) or (
    not is_blocked() and exists (
      select 1 from registrations r
      where r.user_id = auth.uid()
        and r.status = 'paid'
        and (p_batch_id is null or r.batch_id = p_batch_id)
    )
  );
$$;

-- ---------- policies ----------

drop policy if exists "batch_teachers_select" on batch_teachers;
drop policy if exists "batch_teachers_admin_insert" on batch_teachers;
drop policy if exists "batch_teachers_admin_delete" on batch_teachers;
create policy "batch_teachers_select" on batch_teachers for select using (teacher_id = auth.uid() or is_admin());
create policy "batch_teachers_admin_insert" on batch_teachers for insert with check (is_admin());
create policy "batch_teachers_admin_delete" on batch_teachers for delete using (is_admin());

-- A teacher sees the batches they teach, those batches' paid students'
-- registrations, and those students' profile rows (names).
drop policy if exists "batches_select" on batches;
create policy "batches_select" on batches for select using (
  is_admin() or teaches_batch(id) or (
    not is_blocked() and id in (
      select batch_id from registrations where user_id = auth.uid() and status = 'paid'
    )
  )
);

drop policy if exists "registrations_select" on registrations;
create policy "registrations_select" on registrations for select
  using (user_id = auth.uid() or is_admin() or teaches_batch(batch_id));

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or is_admin() or teacher_sees_student(id));

-- Content writes: the admin anywhere; a teacher only in a batch they
-- teach (batch_id must be set -- no "all batches" for teachers).
drop policy if exists "class_links_admin_insert" on class_links;
drop policy if exists "class_links_admin_update" on class_links;
drop policy if exists "class_links_admin_delete" on class_links;
drop policy if exists "class_links_staff_insert" on class_links;
drop policy if exists "class_links_staff_update" on class_links;
drop policy if exists "class_links_staff_delete" on class_links;
create policy "class_links_staff_insert" on class_links for insert with check (is_admin() or teaches_batch(batch_id));
create policy "class_links_staff_update" on class_links for update
  using (is_admin() or teaches_batch(batch_id)) with check (is_admin() or teaches_batch(batch_id));
create policy "class_links_staff_delete" on class_links for delete using (is_admin() or teaches_batch(batch_id));

drop policy if exists "class_videos_admin_insert" on class_videos;
drop policy if exists "class_videos_admin_update" on class_videos;
drop policy if exists "class_videos_admin_delete" on class_videos;
drop policy if exists "class_videos_staff_insert" on class_videos;
drop policy if exists "class_videos_staff_update" on class_videos;
drop policy if exists "class_videos_staff_delete" on class_videos;
create policy "class_videos_staff_insert" on class_videos for insert with check (is_admin() or teaches_batch(batch_id));
create policy "class_videos_staff_update" on class_videos for update
  using (is_admin() or teaches_batch(batch_id)) with check (is_admin() or teaches_batch(batch_id));
create policy "class_videos_staff_delete" on class_videos for delete using (is_admin() or teaches_batch(batch_id));

drop policy if exists "messages_admin_insert" on messages;
drop policy if exists "messages_admin_update" on messages;
drop policy if exists "messages_admin_delete" on messages;
drop policy if exists "messages_staff_insert" on messages;
drop policy if exists "messages_staff_update" on messages;
drop policy if exists "messages_staff_delete" on messages;
create policy "messages_staff_insert" on messages for insert
  with check (sender_id = auth.uid() and (is_admin() or teaches_batch(batch_id)));
create policy "messages_staff_update" on messages for update
  using (is_admin() or teaches_batch(batch_id)) with check (is_admin() or teaches_batch(batch_id));
create policy "messages_staff_delete" on messages for delete using (is_admin() or teaches_batch(batch_id));

-- Alerts (see migration-notifications.sql): a teacher may only alert
-- students in their own batches.
do $$ begin
  if to_regclass('public.notifications') is not null then
    drop policy if exists "notifications_admin_insert" on notifications;
    drop policy if exists "notifications_staff_insert" on notifications;
    create policy "notifications_staff_insert" on notifications for insert
      with check (is_admin() or teacher_sees_student(user_id));
  end if;
end $$;

-- ==================================================================
-- Unlock Day 1 of the placeholder notes
-- ==================================================================

-- Unlock Day 1 of the placeholder notes so the new courses' notes tab
-- isn't empty. Run AFTER migration-new-courses.sql. Safe to re-run.
insert into note_unlocks (course, day) values
  ('react', 1), ('cybersecurity', 1), ('hr', 1)
on conflict do nothing;

-- ==================================================================
-- Admin protection, expiry dates, teacher ownership, reports
-- ==================================================================

-- Admin protection, expiry dates, post ownership, teacher reports.
-- Run AFTER migration-teachers.sql and migration-notifications.sql.
-- Safe to re-run.
--
--   1. The admin can't be blocked or deleted, and isn't a student:
--      admins/teachers can't hold registrations (existing ones are taken
--      off their batches, payment records kept).
--   2. expires_at on announcements, class links and videos. Students stop
--      seeing an item the moment it expires; the app deletes the row (and
--      the Cloudinary file for a video) shortly after.
--   3. created_by on class links, so a teacher can only change what they
--      posted themselves. Teachers can also READ what's aimed at "all
--      batches", and can report an item to the admin (content_reports).

-- ---------- 1. admin protection ----------

create or replace function protect_admin_profile() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'admin' then
      raise exception 'An admin account can''t be deleted.';
    end if;
    return old;
  end if;
  if old.role = 'admin' and new.blocked then
    raise exception 'An admin account can''t be blocked.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_admin_profile_upd on profiles;
drop trigger if exists protect_admin_profile_del on profiles;
create trigger protect_admin_profile_upd before update on profiles
  for each row execute function protect_admin_profile();
create trigger protect_admin_profile_del before delete on profiles
  for each row execute function protect_admin_profile();

create or replace function block_staff_registrations() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if exists (select 1 from profiles where id = new.user_id and role in ('admin', 'teacher')) then
    raise exception 'Admin and teacher accounts can''t be enrolled as students.';
  end if;
  return new;
end;
$$;

drop trigger if exists block_staff_registrations_trg on registrations;
create trigger block_staff_registrations_trg before insert or update of user_id on registrations
  for each row execute function block_staff_registrations();

-- One-off clean-up of anything that predates the rule above.
update registrations set status = 'removed', batch_id = null
where status = 'paid'
  and user_id in (select id from profiles where role in ('admin', 'teacher'));

-- ---------- 2. expiry + 3. ownership ----------

alter table messages     add column if not exists expires_at timestamptz;
alter table class_links  add column if not exists expires_at timestamptz;
alter table class_videos add column if not exists expires_at timestamptz;
alter table class_links  add column if not exists created_by uuid references profiles(id) on delete set null;
update class_links set created_by = updated_by where created_by is null;

create index if not exists messages_expiry_idx     on messages (expires_at)     where expires_at is not null;
create index if not exists class_links_expiry_idx  on class_links (expires_at)  where expires_at is not null;
create index if not exists class_videos_expiry_idx on class_videos (expires_at) where expires_at is not null;

-- Teachers may now also READ content aimed at "all batches" (batch_id
-- null) -- it concerns them too. Writing stays limited to their own posts
-- in their own batches (policies below).
create or replace function can_view_batch_content(p_batch_id uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select is_admin()
    or teaches_batch(p_batch_id)
    or (p_batch_id is null and is_teacher())
    or (
      not is_blocked() and exists (
        select 1 from registrations r
        where r.user_id = auth.uid()
          and r.status = 'paid'
          and (p_batch_id is null or r.batch_id = p_batch_id)
      )
    );
$$;

-- Students (and teachers for "all batches" items) never see an expired
-- item; the admin and the teachers of that batch still do, until the
-- clean-up removes it.
drop policy if exists "class_links_select" on class_links;
drop policy if exists "class_videos_select" on class_videos;
drop policy if exists "messages_select" on messages;
create policy "class_links_select" on class_links for select using (
  can_view_batch_content(batch_id)
  and (expires_at is null or expires_at > now() or is_admin() or teaches_batch(batch_id))
);
create policy "class_videos_select" on class_videos for select using (
  can_view_batch_content(batch_id)
  and (expires_at is null or expires_at > now() or is_admin() or teaches_batch(batch_id))
);
create policy "messages_select" on messages for select using (
  can_view_batch_content(batch_id)
  and (expires_at is null or expires_at > now() or is_admin() or teaches_batch(batch_id))
);

-- Writes: the admin anywhere; a teacher only on what THEY posted, in a
-- batch they teach.
drop policy if exists "class_links_staff_insert" on class_links;
drop policy if exists "class_links_staff_update" on class_links;
drop policy if exists "class_links_staff_delete" on class_links;
create policy "class_links_staff_insert" on class_links for insert
  with check (is_admin() or (teaches_batch(batch_id) and created_by = auth.uid()));
create policy "class_links_staff_update" on class_links for update
  using (is_admin() or (teaches_batch(batch_id) and created_by = auth.uid()))
  with check (is_admin() or (teaches_batch(batch_id) and created_by = auth.uid()));
create policy "class_links_staff_delete" on class_links for delete
  using (is_admin() or (teaches_batch(batch_id) and created_by = auth.uid()));

drop policy if exists "class_videos_staff_insert" on class_videos;
drop policy if exists "class_videos_staff_update" on class_videos;
drop policy if exists "class_videos_staff_delete" on class_videos;
create policy "class_videos_staff_insert" on class_videos for insert
  with check (is_admin() or (teaches_batch(batch_id) and created_by = auth.uid()));
create policy "class_videos_staff_update" on class_videos for update
  using (is_admin() or (teaches_batch(batch_id) and created_by = auth.uid()))
  with check (is_admin() or (teaches_batch(batch_id) and created_by = auth.uid()));
create policy "class_videos_staff_delete" on class_videos for delete
  using (is_admin() or (teaches_batch(batch_id) and created_by = auth.uid()));

drop policy if exists "messages_staff_insert" on messages;
drop policy if exists "messages_staff_update" on messages;
drop policy if exists "messages_staff_delete" on messages;
create policy "messages_staff_insert" on messages for insert
  with check (sender_id = auth.uid() and (is_admin() or teaches_batch(batch_id)));
create policy "messages_staff_update" on messages for update
  using (is_admin() or (teaches_batch(batch_id) and sender_id = auth.uid()))
  with check (is_admin() or (teaches_batch(batch_id) and sender_id = auth.uid()));
create policy "messages_staff_delete" on messages for delete
  using (is_admin() or (teaches_batch(batch_id) and sender_id = auth.uid()));

-- ---------- reports ----------

create table if not exists content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('link', 'video', 'announcement')),
  item_id uuid not null,
  item_title text,
  batch_id uuid references batches(id) on delete set null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null
);
create index if not exists content_reports_status_idx on content_reports (status, created_at desc);
alter table content_reports enable row level security;

drop policy if exists "content_reports_select" on content_reports;
drop policy if exists "content_reports_teacher_insert" on content_reports;
drop policy if exists "content_reports_admin_update" on content_reports;
drop policy if exists "content_reports_admin_delete" on content_reports;
create policy "content_reports_select" on content_reports for select using (reporter_id = auth.uid() or is_admin());
create policy "content_reports_teacher_insert" on content_reports for insert
  with check (reporter_id = auth.uid() and is_teacher());
create policy "content_reports_admin_update" on content_reports for update using (is_admin());
create policy "content_reports_admin_delete" on content_reports for delete using (is_admin());

-- The admin gets a pop-up alert for a new report.
do $$ begin
  if to_regclass('public.notifications') is not null then
    alter table notifications drop constraint if exists notifications_kind_check;
    alter table notifications add constraint notifications_kind_check
      check (kind in ('announcement', 'video', 'link', 'notes', 'report', 'certificate')) not valid;
  end if;
end $$;

-- ==================================================================
-- Teachers can report a student
-- ==================================================================

-- Lets a teacher report a STUDENT (not just a post) to the admin.
-- Reports about students reuse content_reports with kind = 'student';
-- item_id holds the student's profile id and item_title their name.
-- Safe to re-run. Requires migration-roles-expiry.sql (step 7) first.

alter table content_reports drop constraint if exists content_reports_kind_check;
alter table content_reports
  add constraint content_reports_kind_check
  check (kind in ('link', 'video', 'announcement', 'student'));

-- ==================================================================
-- Block a student in one course only
-- ==================================================================

-- Per-course control of a student: block (or delete / remove) them in ONE
-- course or batch without touching their other courses.
--   * registrations.blocked  -> blocked in that course only; the student
--     keeps their account and other courses, but sees no links, videos or
--     announcements for the blocked one.
-- (Account-wide block/delete still exist on the Students page.)
-- Safe to re-run. Run after migration-roles-expiry.sql.

alter table registrations add column if not exists blocked boolean not null default false;

create or replace function can_view_batch_content(p_batch_id uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select is_admin()
    or teaches_batch(p_batch_id)
    or (p_batch_id is null and is_teacher())
    or (
      not is_blocked() and exists (
        select 1 from registrations r
        where r.user_id = auth.uid()
          and r.status = 'paid'
          and not r.blocked
          and (p_batch_id is null or r.batch_id = p_batch_id)
      )
    );
$$;

-- ==================================================================
-- Certificates (admin-only award / revoke)
-- ==================================================================

-- Certificates: awarded (and revoked) by the admin only.
--
-- Security model:
--   * Nobody can insert / update / delete through the normal client: there
--     are NO write policies. Awarding and revoking happen in admin-only
--     server actions that use the service-role key after checking the
--     caller is an admin.
--   * A student can read ONLY their own certificate rows; the admin can
--     read all. Public verification goes through /api/certificates/verify
--     (service role, rate limited) -- the table itself is never public.
--   * `code` is unique, so no two certificates can ever share an id.
--   * Revoking DELETES the row: the id, name and email are gone from the
--     table, the student's Certificate tab locks again.

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{12}$'),
  user_id uuid not null references profiles(id) on delete cascade,
  course course_key not null,
  student_name text not null check (char_length(student_name) between 1 and 200),
  student_email text not null check (char_length(student_email) between 3 and 320),
  course_title text not null check (char_length(course_title) between 1 and 300),
  awarded_by uuid references profiles(id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (user_id, course)
);

create index if not exists certificates_user_idx on certificates (user_id);

alter table certificates enable row level security;

drop policy if exists "certificates_select_own" on certificates;
create policy "certificates_select_own" on certificates for select using (user_id = auth.uid());
drop policy if exists "certificates_select_admin" on certificates;
create policy "certificates_select_admin" on certificates for select using (is_admin());

revoke insert, update, delete on certificates from anon, authenticated;

-- Allow the "certificate" alert kind (keeps every other kind; NOT VALID so old rows never block it).
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check
  check (kind in ('announcement', 'video', 'link', 'notes', 'report', 'certificate')) not valid;

-- ==================================================================
-- Name printed on the certificate
-- ==================================================================

-- The name a student types before registering: it is the name printed on
-- their certificate. Run after migration-certificates.sql.
alter table profiles add column if not exists certificate_name text
  check (certificate_name is null or char_length(certificate_name) between 2 and 100);

-- ==================================================================
-- Database guards (safe links, size caps, one paid seat per course, admin role lock)
-- ==================================================================

-- Security hardening, round 2. Safe to re-run. Run LAST (after step 9).
-- Adds database-level guards so that even a direct call to the Supabase API
-- (bypassing the app) can't store dangerous or oversized data.

-- 1. A student can't hold two paid registrations for the same course
--    (two simultaneous payments could otherwise both succeed).
do $$ begin
  create unique index if not exists registrations_one_paid_per_course
    on registrations (user_id, course) where status = 'paid';
exception when unique_violation then
  raise notice 'Skipped registrations_one_paid_per_course: duplicate paid registrations already exist. Remove the duplicates, then re-run.';
end $$;

-- 2. What may be stored in links / videos / announcements. NOT VALID =
--    applies to new and edited rows; existing rows are left alone.
alter table class_links drop constraint if exists class_links_url_safe;
alter table class_links add constraint class_links_url_safe
  check (url ~* '^https?://' and length(url) <= 2000) not valid;
alter table class_links drop constraint if exists class_links_title_len;
alter table class_links add constraint class_links_title_len check (title is null or length(title) <= 200) not valid;

alter table class_videos drop constraint if exists class_videos_url_safe;
alter table class_videos add constraint class_videos_url_safe
  check (cloudinary_url ~ '^https://res\.cloudinary\.com/' and length(cloudinary_url) <= 2000) not valid;
alter table class_videos drop constraint if exists class_videos_text_len;
alter table class_videos add constraint class_videos_text_len
  check (length(title) <= 200 and (description is null or length(description) <= 2000)) not valid;

alter table messages drop constraint if exists messages_content_len;
alter table messages add constraint messages_content_len check (length(content) <= 5000) not valid;

-- 3. Alerts: links must stay on this site; sizes are capped. A teacher can
--    only send ordinary alerts to their own students (never 'report').
alter table notifications drop constraint if exists notifications_href_local;
alter table notifications add constraint notifications_href_local
  check (href is null or href ~ '^/[^/\\]') not valid;
alter table notifications drop constraint if exists notifications_text_len;
alter table notifications add constraint notifications_text_len
  check (length(title) <= 200 and (body is null or length(body) <= 6000)) not valid;

drop policy if exists "notifications_staff_insert" on notifications;
create policy "notifications_staff_insert" on notifications for insert
  with check (
    is_admin()
    or (teacher_sees_student(user_id) and kind in ('announcement', 'video', 'link'))
  );

-- 4. Reports: a teacher can only file a fresh, open report, of sane size.
alter table content_reports drop constraint if exists content_reports_message_len;
alter table content_reports add constraint content_reports_message_len
  check (length(message) between 3 and 1000) not valid;
drop policy if exists "content_reports_teacher_insert" on content_reports;
create policy "content_reports_teacher_insert" on content_reports for insert
  with check (reporter_id = auth.uid() and is_teacher() and status = 'open' and resolved_by is null and resolved_at is null);

-- 5. The admin role can't be removed from inside the app or through the
--    public API: only the SQL editor / service role (no signed-in user)
--    can demote an admin. (Blocking and deleting were already refused.)
create or replace function protect_admin_profile() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'admin' then
      raise exception 'An admin account can''t be deleted.';
    end if;
    return old;
  end if;
  if old.role = 'admin' and new.blocked then
    raise exception 'An admin account can''t be blocked.';
  end if;
  if old.role = 'admin' and new.role <> 'admin' and auth.uid() is not null then
    raise exception 'An admin account''s role can only be changed from the SQL editor.';
  end if;
  if old.role <> 'admin' and new.role = 'admin' and auth.uid() is not null then
    raise exception 'Admins can only be created from the SQL editor.';
  end if;
  return new;
end;
$$;

-- ==================================================================
-- Function permissions and search_path hardening (keep this last)
-- ==================================================================

-- Security hardening. Run once in the Supabase SQL editor.

-- 1. Server-only functions must not be callable through the public API.
--    assign_batch creates batches; check_rate_limit writes rate_limits
--    (anyone could burn another user's budget or spam batches).
--    Both are only ever called with the service-role key.
revoke execute on function assign_batch(course_key) from public, anon, authenticated;
revoke execute on function check_rate_limit(text, int, int) from public, anon, authenticated;
grant  execute on function assign_batch(course_key) to service_role;
grant  execute on function check_rate_limit(text, int, int) to service_role;

-- 2. Pin search_path on every SECURITY DEFINER function so a user-created
--    object in another schema can't shadow a table/function they use.
alter function is_admin() set search_path = public, pg_temp;
alter function is_blocked() set search_path = public, pg_temp;
alter function assign_batch(course_key) set search_path = public, pg_temp;
alter function can_view_batch_content(uuid) set search_path = public, pg_temp;
alter function check_rate_limit(text, int, int) set search_path = public, pg_temp;
alter function set_installation_status(boolean, boolean) set search_path = public, pg_temp;

-- 3. The remaining helpers are meant to be callable by signed-in users
--    (RLS uses them) but not by anonymous callers.
revoke execute on function set_installation_status(boolean, boolean) from public, anon;
grant  execute on function set_installation_status(boolean, boolean) to authenticated;
