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
