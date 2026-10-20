# Security review — 18 Oct 2026

Scope: every server action, API route, middleware, Supabase policy/function/trigger, client component that renders stored data, third-party integrations (Supabase, Paystack, Cloudinary, EmailJS), configuration and dependencies.

## Fixed in this version
| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | High | `.env.local` (real secrets) was inside an earlier download, `foundry-next-batch-controls.zip` | Removed from that zip. **Rotate the keys** (see below). |
| 2 | High | Next.js 14 gets no security patches any more; 2026 image-optimizer RCE/SSRF/DoS advisories only have fixes in 15.5.x / 16.x | `next` pinned to 14.2.35 (last 14.x fix); the `/_next/image` optimizer is switched off (`images.unoptimized`, the app only uses plain `<img>`). **Plan an upgrade to 15.5.28+ / 16.4.1.** |
| 3 | Medium | A teacher could save a video row whose Cloudinary id pointed at another file (e.g. the admin's), then delete their row and destroy that file | Stored id is now derived from the video URL; a mismatch is rejected |
| 4 | Medium | Any teacher could delete any unreferenced video in the Cloudinary account (`discardCloudinaryUpload`) | Teachers may only discard files uploaded in the last 2 hours; admin unchanged |
| 5 | Medium | The unsigned Cloudinary upload preset was public: anyone on the internet could upload to the account | Uploads are now signed by the server for signed-in staff only (`getVideoUploadSignature`); delete the unsigned preset in Cloudinary |
| 6 | Medium | A payment for one course could be claimed for another course of the same price (e.g. to reach a closed course) | `/api/payments/verify` requires Paystack's `metadata.course` to match |
| 7 | Medium | A teacher could insert notifications with any link (phishing) or kind straight through the API | Database rule: alert links must be on this site, teachers can only send announcement/video/link alerts; the browser also ignores non-local links |
| 8 | Medium | Raw database error text was returned to the browser (table/column names) | Logged on the server, generic message shown; our own friendly trigger messages still pass |
| 9 | Low | Open redirect via `\` in the new `/offline?next=` page | Backslashes rejected |
| 10 | Low | Blocked students could still start a purchase | Refused in `/api/payments/verify` |
| 11 | Low | Cron secret compared with `!==` | Constant-time comparison |
| 12 | Low | YouTube embed accepted look-alike hosts (`evilyoutube.com`) and any id | Exact hosts + id pattern |
| 13 | Low | Two simultaneous payments could create two seats for one course | Unique index (database), see migration |
| 14 | Low | Admin role could be changed through the public API by an admin session | Trigger: role changes only from the SQL editor |
| 15 | Low | No limits on stored text/URLs if the API is called directly | CHECK constraints (links must be http(s), videos must be on Cloudinary, size caps) |
| 16 | Low | Admin email hard-coded | `ADMIN_NOTIFY_EMAIL` env var (falls back to the old address) |
| 17 | Info | Full Content-Security-Policy | Added in **report-only** mode (nothing breaks); enforce it after checking the browser console |

## Checked and fine
Every admin action calls `requireAdmin()` / `requireStaff()` first; teachers are limited to their own batches and own posts (server and database). No table lacks Row Level Security; `profiles`, `registrations`, `batches` can't be written by students; server-only SQL functions are revoked from the public API; the service-role key is only imported from server code; no secrets in the source; links rendered with `safeHref`; no `dangerouslySetInnerHTML` with user data; OAuth `next` is validated; receipts are owner/admin only; Paystack payments are verified server-side against amount, currency and payer email; rate limit on payment verification; CSRF protection for Server Actions is built into Next.js.

## Not fixable in code — do these in the dashboards
1. **Rotate secrets** if `foundry-next-batch-controls.zip` (or the project zip you first uploaded) was shared or stored anywhere: Supabase service-role key, Paystack secret key, Cloudinary API secret, EmailJS private key.
2. **Supabase → Authentication**: turn OFF the Email provider and "Allow new users to sign up" for email (Google is the only sign-in); set Site URL and a strict Redirect URL allow-list (your domain only).
3. **Cloudinary**: delete the unsigned upload preset once a test upload works; set a max file size on the account if available.
4. **EmailJS**: enable "Use Private Key" and restrict allowed domains.
5. **Paystack**: confirm live keys only in the host's environment variables; consider a webhook so a payment completed with the browser closed still creates a seat.
6. **Vercel**: add a firewall rate-limit rule (Server Actions in Next 14 have unpatched denial-of-service advisories), and commit a `package-lock.json` (none exists) so installs are repeatable (`npm ci`).
