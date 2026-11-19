-- 17: (a) deleting a student removes everything tied to them; (b) exam camera/microphone proof storage.
-- Run once after 16 (safe to re-run).

-- (a) Any foreign key that points at a person and would BLOCK deleting them is changed:
--     required columns (e.g. messages.sender_id) -> the row goes with the person; optional columns -> set to null.
do $$
declare r record; rule text;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, a.attname as col, a.attnotnull as notnull,
           c.confrelid::regclass as ref, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and array_length(c.conkey, 1) = 1
      and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
      and c.confdeltype in ('a', 'r')
      and c.connamespace = 'public'::regnamespace
  loop
    rule := case when r.notnull then 'on delete cascade' else 'on delete set null' end;
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references %s(id) %s', r.tbl, r.conname, r.col, r.ref, rule);
  end loop;
end $$;

-- (b) Camera snapshots / microphone clips taken during an exam. Files live in a PRIVATE storage bucket;
--     only the server (service role) reads or writes them. Rows disappear with the attempt or the student.
insert into storage.buckets (id, name, public) values ('exam-proctor', 'exam-proctor', false) on conflict (id) do nothing;

create table if not exists exam_proctor_media (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references exam_attempts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('photo', 'audio')),
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists exam_proctor_media_attempt_idx on exam_proctor_media (attempt_id, created_at);
alter table exam_proctor_media enable row level security; -- no policies: nobody but the server can touch it
