# Database setup

Run these in the Supabase SQL editor. Every file is safe to re-run.

**Brand new database:** `schema.sql`, then `1-enums.sql` (alone), then `2-updates.sql`, then `3-pricing-and-contacts.sql`.

**Existing database:** `1-enums.sql` (alone), `2-updates.sql`, `3-pricing-and-contacts.sql`.

**Already ran everything up to "certificate names"?** Run `3-pricing-and-contacts.sql`, then `4-event-center.sql`.

**Already ran step 6?** Run **only** `7-auto-close.sql`.

**Already ran step 5?** Run **only** `6-names-and-installs.sql`.

**Already ran step 4?** Run `5-payment-intents.sql`, then `6-names-and-installs.sql`.

**Already ran step 3 (the previous version of this project)?** Run `4-event-center.sql`, then `5-payment-intents.sql`.

| File | What it holds |
| --- | --- |
| `schema.sql` | The base schema for a fresh project |
| `1-enums.sql` | New courses (Cybersecurity + AI, HR) and the teacher role. Must run alone |
| `2-updates.sql` | Batches and timers, payments, notifications, teachers, expiry and reports, per-course access, certificates, certificate names, security guards |
| `3-pricing-and-contacts.sql` | Admin-set course prices, HR and workspace contact details |
| `4-event-center.sql` | Contact details for the Event Center section (safe even if step 3 already allows it) |
| `5-payment-intents.sql` | Server-started Paystack payments (the price is fixed by the server, and the webhook uses it) |
| `6-names-and-installs.sql` | The name a student chose is what the site shows (Google name kept as an alternative); per-course installation checklist |
| `7-auto-close.sql` | Registration closes automatically at 50 seats or when the class timer starts (per-course switch) |

| `11-timetable-legal.sql` | Class timetable per batch, teacher edit permissions, course start date/time on cards, editable Terms & Privacy (run once after 10) |

| `12-exams.sql` | Exam system: schedules, attempts, paid retakes, reschedule requests, teacher exam-view permission (run once after 11) |

| `13-exam-settings.sql` | Admin can set exam length and questions per section (run once after 12) |

| `14-exam-alerts.sql` | One reschedule request per attempt, private announcements, alert de-duplication (run once after 13) |
| `15-notify-lockdown.sql` | Manual/auto notifications (pending list) and exam full-screen penalty counter (run once after 14) |

| `16-retake-fee.sql` | Admin-set exam retake fee per batch (run once after 15) |

| `17-delete-and-proctor.sql` | Fixes deleting a student (everything goes with them) + exam camera/microphone storage (run once after 16) |

| `18-proof-retention.sql` | Admin-set retention for exam camera/microphone captures (run once after 17) |
