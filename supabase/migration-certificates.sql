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

-- Allow the "certificate" alert kind.
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check
  check (kind in ('announcement', 'video', 'link', 'notes', 'certificate'));
