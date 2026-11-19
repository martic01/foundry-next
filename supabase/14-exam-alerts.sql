-- 14: one reschedule request per attempt, private announcements, and de-duplicated alerts.
-- Run once after 13 (safe to re-run).

-- A student may ask to move their exam once for EACH attempt (1st try, 2nd try, ...).
alter table exam_reschedule_requests add column if not exists attempt_no int not null default 1;
alter table exam_reschedule_requests drop constraint if exists exam_reschedule_requests_user_id_batch_id_key;
create unique index if not exists exam_reschedule_one_per_attempt on exam_reschedule_requests (user_id, batch_id, attempt_no);

-- An announcement can be addressed to ONE person (a student's own exam notice, or a notice to the admin).
alter table messages add column if not exists target_user_id uuid references profiles(id) on delete cascade;
drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages for select using (
  (can_view_batch_content(batch_id) or target_user_id = auth.uid())
  and (target_user_id is null or target_user_id = auth.uid() or is_admin())
  and (expires_at is null or expires_at > now() or is_admin() or teaches_batch(batch_id))
);

-- Lets the app tell whether it already sent someone a given alert (so a pop-up is never repeated).
alter table notifications add column if not exists ref text;
create index if not exists notifications_ref_idx on notifications (user_id, ref) where ref is not null;
