-- Lets a teacher report a STUDENT (not just a post) to the admin.
-- Reports about students reuse content_reports with kind = 'student';
-- item_id holds the student's profile id and item_title their name.
-- Safe to re-run. Requires migration-roles-expiry.sql (step 7) first.

alter table content_reports drop constraint if exists content_reports_kind_check;
alter table content_reports
  add constraint content_reports_kind_check
  check (kind in ('link', 'video', 'announcement', 'student'));
