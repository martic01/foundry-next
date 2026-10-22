-- STEP 3 (newest). Course prices set by the admin, and the HR / workspace contact details.
-- Safe to re-run. If you already ran everything up to "certificate names", this is the
-- only file you need to run now.

-- 1. Admin-set price and optional crossed-out "was" price per course
--    (Admin -> Registration). pricing_custom = false means "use lib/courses.js".
alter table course_settings
  add column if not exists pricing_custom boolean not null default false,
  add column if not exists price_now int,
  add column if not exists price_was int;

alter table course_settings drop constraint if exists course_settings_price_ok;
alter table course_settings add constraint course_settings_price_ok check (
  (price_now is null or price_now between 100 and 50000000)
  and (price_was is null or (price_now is not null and price_was > price_now and price_was <= 50000000))
);

-- 2. Contact details for HR and the workspace (Admin -> HR & workspace).
create table if not exists site_settings (
  key text primary key check (key in ('hr', 'workspace', 'event')),
  value jsonb not null default '{}'::jsonb check (pg_column_size(value) < 2000),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

alter table site_settings enable row level security;

-- Public read (these are the numbers shown on the website); admin-only write.
drop policy if exists "site_settings_select" on site_settings;
create policy "site_settings_select" on site_settings for select using (true);
drop policy if exists "site_settings_admin_insert" on site_settings;
create policy "site_settings_admin_insert" on site_settings for insert with check (is_admin());
drop policy if exists "site_settings_admin_update" on site_settings;
create policy "site_settings_admin_update" on site_settings for update using (is_admin()) with check (is_admin());

insert into site_settings (key, value) values
  ('hr', '{"whatsapp":"08027245572","email":"olufunmione@gmail.com"}'),
  ('workspace', '{"whatsapp":"08027245572","email":"olufunmione@gmail.com","address":"Yaya Abatan Road, Ogba, Lagos"}'),
  ('event', '{"whatsapp":"08027245572","email":"olufunmione@gmail.com","address":"Yaya Abatan Road, Ogba, Lagos"}')
on conflict (key) do nothing;

-- 3. Repair: make sure alerts of every kind are allowed (an earlier version of the
--    certificates step dropped "report"). NOT VALID so existing rows never block it.
do $$ begin
  if to_regclass('public.notifications') is not null then
    alter table notifications drop constraint if exists notifications_kind_check;
    alter table notifications add constraint notifications_kind_check
      check (kind in ('announcement', 'video', 'link', 'notes', 'report', 'certificate')) not valid;
  end if;
end $$;
