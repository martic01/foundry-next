-- Adds the Cybersecurity + AI and HR courses. Run this ALONE, first
-- (Postgres won't let a new enum value be used in the same transaction
-- that adds it). Safe to re-run.
alter type course_key add value if not exists 'cybersecurity';
alter type course_key add value if not exists 'hr';
