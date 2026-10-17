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
      check (kind in ('announcement', 'video', 'link', 'notes', 'report'));
  end if;
end $$;
