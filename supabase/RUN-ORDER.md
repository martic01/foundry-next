# Running the migrations on an existing database

Run each file in the Supabase SQL editor, in this order. All are safe to re-run.
Files marked ALONE must be run on their own (a new enum value can't be used in
the same transaction that adds it).

1. `migration-security-hardening.sql`
2. `migration-new-courses.sql` — ALONE (adds Cybersecurity + AI and HR)
3. `migration-notifications.sql`
4. `migration-teacher-role.sql` — ALONE (adds the teacher role)
5. `migration-teachers.sql` (batch_teachers, manual batches, teacher access rules)
6. `migration-placeholder-notes.sql` (unlocks Day 1 of the placeholder notes)

A FRESH database: run `schema.sql`, then 3, 5, 6 and finally 1 (steps 2 and 4 are
already built into `schema.sql`).
