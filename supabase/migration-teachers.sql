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
