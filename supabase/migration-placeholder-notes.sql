-- Unlock Day 1 of the placeholder notes so the new courses' notes tab
-- isn't empty. Run AFTER migration-new-courses.sql. Safe to re-run.
insert into note_unlocks (course, day) values
  ('react', 1), ('cybersecurity', 1), ('hr', 1)
on conflict do nothing;
