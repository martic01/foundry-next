-- Registration closes by itself when a course has 50 paid seats, or when its
-- class timer has started. The admin can switch that off per course.
-- Safe to re-run.
alter table course_settings add column if not exists auto_close boolean not null default true;
