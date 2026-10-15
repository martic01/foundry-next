-- Step 1 of 2 for the Teacher role. Run this ALONE first (Postgres won't
-- let a new enum value be used in the transaction that adds it), then run
-- migration-teachers.sql. Safe to re-run.
alter type user_role add value if not exists 'teacher';
