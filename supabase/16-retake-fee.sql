-- 16: the admin can set the retake fee per batch (default 5000 naira). Run once after 15 (safe to re-run).
alter table exam_schedules add column if not exists retake_fee_naira int check (retake_fee_naira is null or retake_fee_naira between 100 and 1000000);
