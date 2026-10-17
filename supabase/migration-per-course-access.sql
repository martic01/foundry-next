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
