-- 12: the exam system. Run once after 11 (safe to re-run).
-- Questions and answers live in the app code, never in the database or the browser.
-- Students only ever see attempts of their own; every write goes through server actions.

alter table batches add column if not exists teacher_can_view_exams boolean not null default false;

-- Alerts: allow the new kinds.
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check
  check (kind in ('announcement', 'video', 'link', 'notes', 'report', 'certificate', 'exam', 'update')) not valid;

-- When the exam opens for a batch (user_id null) or for one student (user_id set; that row wins).
create table if not exists exam_schedules (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  starts_at timestamptz not null,
  activated boolean not null default false,
  activate_at timestamptz,
  pass_percent int not null default 50 check (pass_percent between 1 and 100),
  note text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create unique index if not exists exam_schedules_batch_uq on exam_schedules (batch_id) where user_id is null;
create unique index if not exists exam_schedules_student_uq on exam_schedules (batch_id, user_id) where user_id is not null;
alter table exam_schedules enable row level security;
drop policy if exists "exam_schedules_select" on exam_schedules;
drop policy if exists "exam_schedules_admin" on exam_schedules;
create policy "exam_schedules_select" on exam_schedules for select
  using (is_admin() or (can_view_batch_content(batch_id) and (user_id is null or user_id = auth.uid())));
create policy "exam_schedules_admin" on exam_schedules for all using (is_admin()) with check (is_admin());

-- One row per attempt. questions = [{id, o:[option order]}] (no answers inside).
create table if not exists exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  batch_id uuid references batches(id) on delete set null,
  course text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'dismissed')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  auto_submitted boolean not null default false,
  questions jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  score int,
  total int,
  percent int,
  passed boolean,
  sections jsonb,
  paid_ref text,
  dismissed_by uuid,
  dismissed_reason text,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists exam_one_running on exam_attempts (user_id) where status = 'in_progress';
create index if not exists exam_attempts_user_idx on exam_attempts (user_id, course, created_at);
create index if not exists exam_attempts_batch_idx on exam_attempts (batch_id);
alter table exam_attempts enable row level security;
drop policy if exists "exam_attempts_select" on exam_attempts;
create policy "exam_attempts_select" on exam_attempts for select using (user_id = auth.uid() or is_admin());
revoke insert, update, delete on exam_attempts from anon, authenticated;

-- Paid retakes (after the free attempts are used up).
create table if not exists exam_payments (
  reference text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  batch_id uuid references batches(id) on delete set null,
  course text not null,
  amount_kobo int not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'used', 'needs_review')),
  attempt_id uuid,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table exam_payments enable row level security;
drop policy if exists "exam_payments_select" on exam_payments;
create policy "exam_payments_select" on exam_payments for select using (user_id = auth.uid() or is_admin());
revoke insert, update, delete on exam_payments from anon, authenticated;

-- A student may ask to move their exam ONCE.
create table if not exists exam_reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  preferred_at timestamptz,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  admin_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid,
  unique (user_id, batch_id)
);
alter table exam_reschedule_requests enable row level security;
drop policy if exists "exam_requests_select" on exam_reschedule_requests;
create policy "exam_requests_select" on exam_reschedule_requests for select using (user_id = auth.uid() or is_admin());
revoke insert, update, delete on exam_reschedule_requests from anon, authenticated;
