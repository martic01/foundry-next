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
