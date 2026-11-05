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

## Addendum: certificates
- `certificates` has RLS on with select-own / select-admin only; insert/update/delete are revoked from client roles. Only admin-checked server actions (service role) can award or revoke.
- IDs: 12 chars from a 31-char alphabet via `crypto.randomInt`, UNIQUE in the database, retried on collision; one certificate per student per course.
- Only users with role `student` enrolled (paid) in the course can be awarded; admin/teachers cannot.
- Public verify route returns one record for one exact ID, is rate limited (10/min/IP per instance), and is `no-store`. It exposes name + email by design; to mask the email, change one line in `app/api/certificates/verify/route.js`.

---

# Security review 2: 24 Oct 2026

Scope: all code added since the first review (server-started Paystack payments, webhook, pending-payment table, name handling, per-course installation, WhatsApp link, SEO files) plus a fresh pass over every server action and API route, the SQL functions and grants, secrets handling, headers and every external URL in the code.

**What this review could not do:** the sandbox has no access to the npm registry, so `npm audit` could not run; there was no live database, so Row Level Security was read, not exercised; no real Paystack call was made. Items marked "you" need to be done or confirmed on your side.

## Fixed in this version
| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | Medium | The public certificate-check page returned the student's **full email** to anyone with a certificate id | Email is masked (`ab***@gmail.com`); name, course and date unchanged |
| 2 | Medium | Certificate-check rate limit lived in one server's memory, so serverless instances each had their own count | Now uses the shared database counter (`check_rate_limit`), in-memory only as a fallback |
| 3 | Medium | Payment amount was chosen in the browser and only checked afterwards; a price change mid-payment took money without a seat | Server starts every payment (`/api/payments/initialize`) with the live price and records it; verify and webhook check the money against that record. Mismatches are flagged `needs_review` and the student gets the reference |
| 4 | Medium | A payment completed with the browser closed created no seat | Signed webhook (`/api/payments/webhook`): HMAC-SHA512 of the raw body, constant-time compare, then the transaction is re-verified with Paystack before anything is written. Safe to run twice (unique reference) |
| 5 | Low | Sign-in and payment code overwrote the name a student chose with their Google name | Chosen name kept; Google name stored separately as `google_name` |
| 6 | Low | An admin opening a student's receipt saw the **admin's** name and email on it | Receipt uses the paying student's profile |
| 7 | Low | Old `setInstallationStatus` server action was a public endpoint with no check of its own (the database limited it to the caller's row) | Removed. New `set_tool_installed()` function: signed-in only, validated tool id, own row only, fixed `search_path`, revoked from `public`/`anon` |
| 8 | Low | A client component imported a server module (`next/cache` + database client) just for two validators | Validators moved to `lib/contact-validation.js` |
| 9 | Low | Maximum price (₦50,000,000) in kobo exceeds a 32-bit database integer | Cap lowered to ₦20,000,000; the pending-payment table uses `bigint` |
| 10 | Low | Abandoned payment attempts would pile up | The daily purge deletes pending attempts older than 7 days |
| 11 | Low | Webhook accepted any body size | Rejected above 100 KB before reading it |
| 12 | Info | WhatsApp group link came from an env var | Only an `https://chat.whatsapp.com/...` link is accepted; anything else falls back to the default |

## Checked and fine (this pass)
- All 41 admin server actions start with `requireAdmin()` / `requireStaff()`; the student-side actions check the signed-in user and validate their input.
- `payment_intents` has RLS on with an admin read policy only; students cannot read or write it. Webhook, verify and initialize use the service-role key, server side only (no client file imports it).
- Payment checks in `finalizePayment`: amount and currency equal the recorded payment, payer email equals the account that started it, reference belongs to the signed-in user, registration state, one seat per course, duplicate payments flagged.
- Only `NEXT_PUBLIC_` values reach the browser: the Supabase anon key, Cloudinary cloud name, EmailJS public key/service/template, installer URLs, site URL, WhatsApp link. No secret key appears in any client file.
- `dangerouslySetInnerHTML` is used twice, both with fixed or escaped content (the structured-data JSON escapes `<`; the theme script is a constant).
- No `eval`, no `innerHTML`, redirects after sign-in are validated, every private area is `noindex` and disallowed in `robots.txt`.
- Name field accepts letters, spaces, hyphens, apostrophes only (so it cannot carry markup into emails or certificates).

## External sources
| Source | Used for | Note |
|---|---|---|
| Paystack (`api.paystack.co`, `checkout.paystack.com`) | payments | Server calls use the secret key; popup in an iframe, allowed in the CSP |
| Supabase | database and sign-in | Anon key is public by design; protected by RLS |
| Cloudinary | class videos, installer files | Uploads are signed by the server for signed-in staff only |
| EmailJS | admin notification email | Sent from the server with the private key |
| Unsplash images | workspace and event section photos | Hot-linked from a third party (visitor IPs go to them, and they can change or remove a photo). **Recommend saving the photos into `public/` and serving them yourself** |
| YouTube embeds | installation videos | Exact host and id pattern enforced. Consider `youtube-nocookie.com` |
| Official vendor pages (code.visualstudio.com, git-scm.com, nodejs.org, virtualbox.org, kali.org) | installation links | Plain links to the vendors, nothing is embedded or auto-downloaded |
| chat.whatsapp.com | class group | Plain link, opens in a new tab with `noopener noreferrer` |

## Still open: do these
1. **Upgrade Next.js** (14.2.35 gets no more security fixes; move to 15.5.28+ or 16.4.1) and commit a `package-lock.json`. Then run `npm audit`. I could not run it here.
2. **Enforce the Content-Security-Policy**: it is still report-only. Click through sign-in, payment, video and upload once with the browser console open, then rename the header to `Content-Security-Policy`.
3. **Paystack:** live keys only in the host's environment variables; set the webhook URL; the webhook uses the same secret key to sign, so keep that key private.
4. **Supabase dashboard:** Email sign-in off, Google only, strict Redirect URL allow-list, no public sign-up (see the first review). Run `supabase/5-payment-intents.sql` and `6-names-and-installs.sql`.
5. **Two-factor sign-in** on the Google account used for admin, and on Supabase, Vercel, Paystack, Cloudinary, EmailJS and GitHub.
6. `course_settings` and `site_settings` are readable by anyone with the public key and include an `updated_by` column (the admin's user id). Not sensitive on its own, but you can remove the column from the public policy later.
7. Rotate keys if any earlier zip containing `.env.local` was shared (first review, item 1).

---

## Security review 3: before going live with the Paystack live key

**Checked and fine**
- The Paystack secret key is only read on the server (`lib/paystack.js`, three API routes). No `NEXT_PUBLIC_` variable holds a secret, no component imports the service-role client.
- The amount charged is chosen by the server; the browser only gets an access code. Every payment is re-verified with Paystack (amount, currency, email, owner) before a seat is given. The webhook checks the HMAC-SHA512 signature before doing anything.
- Every table has Row Level Security. Only admins can update profiles directly; students change their own tool ticks, terms acceptance and session through narrow `security definer` functions with a pinned `search_path`.
- All server actions check who is calling (`requireAdmin` or a signed-in user). The cron route needs `CRON_SECRET`. The public certificate lookups are rate limited and never reveal an email address.
- `.env*` files are git-ignored; the zips contain only `.env.example`.

**Fixed in this round**
- Same account on several devices: now one device at a time (`supabase/9-single-session.sql` + middleware). A newer sign-in signs the older device out, and the older device sees a clear message.
- Wrong-area access: a student on `/admin` (or any role on another role's area) is now sent straight to their own home page by middleware, instead of a dead-end page. The "Not authorized" page now has a Sign out button.
- The online payment now requires the Terms box server-side, not just in the page.

**Before you switch to the live key (do these in order)**
1. In Vercel, set `PAYSTACK_SECRET_KEY` to the `sk_live_...` key for the **Production** environment only (leave Preview on the test key). Mark it Sensitive. Redeploy; changes do not apply to old deployments.
2. In Paystack, switch the dashboard to **Live** mode and set the Webhook URL there too: `https://YOUR-DOMAIN/api/payments/webhook`. Test and Live have separate webhook settings.
3. Pending payments started with the test key cannot be verified with the live key. Switch when no student is mid-payment.
4. Make a real small payment yourself (for example set one course to a low price), check the seat, receipt and webhook, then restore the price.
5. In Supabase, Authentication > URL Configuration: set Site URL to your real domain and remove `localhost` from the redirect list. Keep Google as the only sign-in method.
6. Turn on 2-step verification on the admin Google account, because that is the only key to `/admin`.
7. Delete test students, test registrations and test payment intents before launch.
8. Set `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Production). Never paste keys into chat, the repo or screenshots; if one leaks, rotate it in its dashboard.

**Still open (not fixed here)**
- Next.js 14.2.35 is end of life: plan an upgrade to a current supported version and test the payment flow after it.
- There is no `package-lock.json`: run `npm install` once and commit the lock file so Vercel builds the exact versions you tested.
- The strict Content-Security-Policy is still report-only. Click through sign-in, payment, video and uploads with the console open; if there are no violations, rename the header to enforce it.
- Supabase auth cookies are readable by the page's JavaScript (a Supabase limitation). The strict CSP above is what limits the damage of any future XSS.
- One-device-at-a-time is checked when a portal page loads, not instantly: a device that is already open notices on its next click or refresh.

### How to switch the Content-Security-Policy from report-only to enforced
1. Deploy a **Preview** (or run `npm run build && npm start` locally). Open it with DevTools > Console open.
2. Click through: home, sign in with Google, register up to the Paystack popup (test key), a dashboard with a YouTube video, a class video playing, an admin upload, the certificate page and a /verify link.
3. Any line starting "Content Security Policy" / "Refused to ..." is something the policy would block. Add that host to the matching list in `next.config.js` (script-src, img-src, connect-src, frame-src...) and repeat until the console is clean.
4. In Vercel > Settings > Environment Variables add `CSP_ENFORCE` = `1` (Production), redeploy.
5. Check payment and sign-in once on the live site. If anything breaks, delete the variable and redeploy: you are back to report-only in one minute.
