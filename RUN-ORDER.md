
## Certificate QR + SEO (no new SQL)
The verify page uses the existing `certificates` table and `check_rate_limit`. Set `NEXT_PUBLIC_SITE_URL` to your real domain, because the QR code on every certificate points to `${NEXT_PUBLIC_SITE_URL}/verify/<code>`.

## Terms popup (file 8)
Run `supabase/8-terms.sql` (adds `profiles.terms_accepted_at` and `accept_terms()`). Until it is run the popup never appears.

## One device at a time (file 9)
Run `supabase/9-single-session.sql`. Until it is run, nothing changes (several devices still work).

## Notes reorder (file 10): run ONCE
Run `supabase/10-notes-reorder.sql` once, at the same time you deploy this version. It renumbers the Stage 1 note days you have already unlocked (Git & GitHub is now Day 10).
