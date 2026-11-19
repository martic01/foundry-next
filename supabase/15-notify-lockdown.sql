-- 15: manual/auto notifications for admin changes, and exam lockdown penalties.
-- Run once after 14 (safe to re-run).

-- Notifications the admin has chosen to send by hand (Manual mode). Only admins can see or change these.
create table if not exists pending_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid,
  label text not null,
  kind text not null check (kind in ('users', 'announce')),
  recipients int not null default 0,
  payload jsonb not null
);
alter table pending_notifications enable row level security;
drop policy if exists "pending_notifications_admin" on pending_notifications;
create policy "pending_notifications_admin" on pending_notifications for all using (is_admin()) with check (is_admin());

-- 'auto' (default) = students are told straight away; 'manual' = a Send button appears for the admin.
alter table site_settings drop constraint if exists site_settings_key_check;
alter table site_settings add constraint site_settings_key_check check (key in ('hr', 'workspace', 'event', 'notify_mode'));
insert into site_settings (key, value) values ('notify_mode', '"auto"'::jsonb) on conflict (key) do nothing;

-- Times a student left full screen / switched away during an exam.
alter table exam_attempts add column if not exists violations int not null default 0;
