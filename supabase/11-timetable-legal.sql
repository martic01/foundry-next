-- 11: class timetable, teacher permissions, course start info, editable Terms & Privacy.
-- Safe to re-run.

alter table batches add column if not exists teacher_can_edit_start boolean not null default false;
alter table batches add column if not exists teacher_can_edit_timetable boolean not null default false;

alter table course_settings add column if not exists start_date date;
alter table course_settings add column if not exists start_time text;

create table if not exists batch_timetable (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  sort int not null,
  week int not null default 1,
  weekday smallint not null check (weekday between 1 and 7),
  starts text not null,
  ends text not null,
  topic text not null default '',
  note text not null default '',
  unique (batch_id, sort)
);
alter table batch_timetable enable row level security;
drop policy if exists "timetable_select" on batch_timetable;
drop policy if exists "timetable_admin_write" on batch_timetable;
create policy "timetable_select" on batch_timetable for select using (can_view_batch_content(batch_id));
create policy "timetable_admin_write" on batch_timetable for all using (is_admin()) with check (is_admin());
-- Teachers write through server actions that check teaches_batch + the flag.

create table if not exists legal_docs (
  doc text primary key check (doc in ('terms','privacy')),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table legal_docs enable row level security;
drop policy if exists "legal_public_read" on legal_docs;
drop policy if exists "legal_admin_write" on legal_docs;
create policy "legal_public_read" on legal_docs for select using (true);
create policy "legal_admin_write" on legal_docs for all using (is_admin()) with check (is_admin());
