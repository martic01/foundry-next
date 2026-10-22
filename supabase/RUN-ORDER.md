# Database setup

Run these in the Supabase SQL editor. Every file is safe to re-run.

**Brand new database:** `schema.sql`, then `1-enums.sql` (alone), then `2-updates.sql`, then `3-pricing-and-contacts.sql`.

**Existing database:** `1-enums.sql` (alone), `2-updates.sql`, `3-pricing-and-contacts.sql`.

**Already ran everything up to "certificate names"?** Run `3-pricing-and-contacts.sql`, then `4-event-center.sql`.

**Already ran step 3 (the previous version of this project)?** Run **only** `4-event-center.sql`.

| File | What it holds |
| --- | --- |
| `schema.sql` | The base schema for a fresh project |
| `1-enums.sql` | New courses (Cybersecurity + AI, HR) and the teacher role. Must run alone |
| `2-updates.sql` | Batches and timers, payments, notifications, teachers, expiry and reports, per-course access, certificates, certificate names, security guards |
| `3-pricing-and-contacts.sql` | Admin-set course prices, HR and workspace contact details |
| `4-event-center.sql` | Contact details for the Event Center section (safe even if step 3 already allows it) |
