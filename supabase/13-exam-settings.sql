-- 13: the admin can set the exam length and how many questions each section has, per batch.
-- Run once after 12 (safe to re-run). Empty = the defaults (120 minutes, 40/40/40/5/5/5/5).
alter table exam_schedules add column if not exists duration_minutes int check (duration_minutes between 10 and 360);
alter table exam_schedules add column if not exists section_counts jsonb;
