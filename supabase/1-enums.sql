-- STEP 1 (run ALONE, first). Adds new enum values: the Cybersecurity + AI and HR
-- courses, and the teacher role. Postgres won't let a value be used in the same
-- transaction that adds it, which is why this is its own file. Safe to re-run.

-- Adds the Cybersecurity + AI and HR courses. Run this ALONE, first
-- (Postgres won't let a new enum value be used in the same transaction
-- that adds it). Safe to re-run.
alter type course_key add value if not exists 'cybersecurity';
alter type course_key add value if not exists 'hr';

-- Step 1 of 2 for the Teacher role. Run this ALONE first (Postgres won't
-- let a new enum value be used in the transaction that adds it), then run
-- migration-teachers.sql. Safe to re-run.
alter type user_role add value if not exists 'teacher';
