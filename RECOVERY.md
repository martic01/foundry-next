# Recovery guide (keep this somewhere safe, away from the site)

## Before anything goes wrong
- Supabase backups on (Point-in-Time Recovery if your plan has it). Download a manual backup before every exam week.
- Keep a private copy of the latest project zip (without `.env` files) and a password-manager note listing which environment variables the host needs (names only are enough in this file; keep the values in the password manager).
- Environment variables to have ready: Supabase URL, anon key, service-role key, Paystack secret and public keys, Cloudinary keys, EmailJS keys, CRON_SECRET, ADMIN_NOTIFY_EMAIL.

## If the site is down
1. Check the host's status page and the latest deployment. Roll back to the previous deployment in the host's dashboard.
2. Check Supabase project status (paused projects on free plans must be resumed).
3. Students mid-exam are safe: answers are kept on their device and sent again when the network returns; the timer follows the server clock. If the outage is long, use Admin, Exams to move the batch exam date or reset the attempt.

## If a payment was taken but the exam did not unlock
Look up the reference in Paystack. If it shows success, re-send the webhook from the Paystack dashboard (safe to repeat: the reference is unique). Rows marked `needs_review` mean the amount did not match; decide by hand.

## If you think a key leaked
1. Rotate it at the provider right away: Supabase (JWT/service-role), Paystack, Cloudinary, EmailJS, then CRON_SECRET.
2. Update the host's environment variables and redeploy.
3. Supabase, Authentication: sign out all users if needed. Review recent admin actions and payments.
4. Check Paystack and Supabase logs for unusual activity.

## If data was deleted or damaged
1. Stop changes (pause the exam, tell staff not to edit).
2. Restore from Point-in-Time Recovery or the latest backup into a NEW Supabase project first, compare, then copy back what is needed.
3. Run the SQL files in RUN-ORDER.md on the restored database if it is older than the newest file.

## After any incident
Write down what happened and when, tell affected students honestly, and fix the cause before the next exam.
