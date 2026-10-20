# The Foundry — State AI Training

A standalone Next.js + Tailwind app for the cohort marketplace: course
details, pricing, age eligibility, Google sign-in, Paystack payment, a
student dashboard, and an admin portal for managing batches, class
links, and broadcast announcements. Split out from the main portfolio on
purpose — see "Why a separate project" below.

**Relationship to the main portfolio:** the portfolio (a separate, static
webpack site) still owns the "Enter The Foundry" door in the interactive
room and links here. This app owns everything past that.

**Auth model:** Google sign-in only, for everyone — students and the
admin alike. There is no app-managed password anywhere in this project.
Google itself proves the email and handles the credential, so there's
nothing for this app to store, hash, or leak.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in real values -- see below
```

Then set up the database (one-time):

1. Create a free project at [supabase.com](https://supabase.com).
2. Project Settings → API Keys — copy the Project URL and the
   **Publishable key** (this is the modern name for what used to be
   called the "anon key" — same thing, new name) into `.env.local`.
3. Same page — copy the **Secret key** (the modern name for the old
   "service_role key") into `.env.local` too
   (`SUPABASE_SERVICE_ROLE_KEY`). It may be a separate section/tab from
   the Publishable key, or need a "Create new secret key" click. **Never**
   put this one behind `NEXT_PUBLIC_`.
4. SQL Editor → New query → paste the entire contents of
   `supabase/schema.sql` → Run.
5. Turn on Google sign-in — see "Google sign-in setup" below (required;
   there's no other way to register or log in).
6. Register once through `/register` like a normal student (this creates
   your own `auth.users` + `profiles` row), then in the SQL Editor run:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
   That's how you get into `/admin` — a real login (see "Why not a
   secret tap-the-bot password" below for why it's built this way).

Also needed: a Paystack account — test keys from Settings → API Keys &
Webhooks.

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Environment variables

Full list and explanation in `.env.example` / `.env.local` itself — the
comments there walk through exactly why each key is (or isn't) safe to
expose, and how the same values move to production (short version: they
go into your hosting platform's own "Environment Variables" setting —
e.g. Vercel's dashboard — not into a file you upload).

Two categories:

- **`NEXT_PUBLIC_*`** — safe to expose to the browser (Supabase anon key,
  Paystack public key, EmailJS public key). Next.js only ships
  `NEXT_PUBLIC_`-prefixed vars to the client; everything else stays
  server-only automatically, stripped out at build time.
- **Everything else** (`SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`,
  `EMAILJS_PRIVATE_KEY`) — real secrets, used only inside
  `app/api/payments/verify/route.js` and Server Actions. This — a
  server-only environment variable, gitignored locally and set directly
  in your hosting platform for production — **is** the standard, correct
  place for a secret like this in a Next.js app, not a workaround. Never
  add `NEXT_PUBLIC_` to these three, and never move them into source code
  or any file that gets committed.

## Google sign-in setup (required)

Every sign-in and registration in this app goes through Google, via
Supabase's built-in provider:

1. [Google Cloud Console](https://console.cloud.google.com) → APIs &
   Services → Credentials → Create Credentials → OAuth client ID → type
   "Web application".
2. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (find `<your-project-ref>` in your Supabase project URL). This is
   Supabase's own callback, not this app's — Supabase forwards the person
   back to `/auth/callback` in this app afterward.
3. Copy the generated **Client ID** and **Client Secret**.
4. Supabase dashboard → Authentication → Providers → Google → paste both
   in there and enable the provider.

Note this Client ID/Secret live in Supabase's dashboard, not in this
app's `.env.local` — Supabase holds them and handles the OAuth exchange;
this app only ever sees the resulting session.

## How registration actually works now

1. **Sign in with Google** — this is the email verification. There is no
   separate code/OTP step and nothing for the person to type but their
   Google credential (on Google's own page, not this app's).
2. **Age eligibility** — checked both in the UI (so people see it
   immediately) and again server-side in `/api/payments/verify` (so the
   UI check isn't the only thing standing between an ineligible age
   range and a completed payment).
3. **Payment** — Paystack's popup runs client-side, but the "did this
   really succeed" question is answered by `/api/payments/verify`
   calling Paystack's own verify-transaction endpoint server-to-server
   with the secret key. The client-side `onSuccess` callback alone is
   never trusted; it's just what triggers the real check.
4. **Registration** — completes automatically, in the same request,
   right after payment is confirmed: profile saved (name/email come from
   the Google session, not a form), assigned to a batch (oldest batch for
   that course with fewer than 50 paid students that hasn't ended, else a new one — see
   `assign_batch` in `supabase/schema.sql`), registration recorded. No
   separate "finish creating your account" step exists to abandon.

## Batch controls (admin)

> **Upgrading an existing project?** Run
> `supabase/migration-batch-controls.sql` once in the Supabase SQL Editor
> (safe to re-run). Fresh installs get everything from `schema.sql`.

- **Batches** (`/admin/batches`) — 50 seats each. Rename a batch (students
  see the name), set its course start date, and run its **9-week class
  timer**: Start, Pause, Resume, Restart, End. State machine lives in
  `lib/batch-timer.js`. Each batch lists its students; each can be
  blocked, moved to another batch of the same course (capacity-checked),
  removed from the batch, or deleted permanently (auth + profile +
  registrations). Paid students with no batch show in an "Unassigned"
  box at the top.
- **Content** (`/admin/content`) — class links, videos and announcements.
  Each is aimed at **one batch or all batches**, and can be edited
  (including changing the audience) or deleted. Links can be replaced by
  editing the URL.
- **Registration** (`/admin/registration`) — per course: open/closed
  switch and a tag (Coming soon, Ended, Limited seats available, All seats
  taken). Closing needs a **reopen date or "until further notice"**; on
  the date, registration reopens by itself. Coming soon / Ended / All
  seats taken also close registration; Limited seats is display-only.
  A payment *started before* the close is still honoured by
  `/api/payments/verify`, so nobody is charged and refused.
- **Student side** — a live class-status banner (On / Paused / Ended,
  with weeks · days · hours · mins · secs countdown) at the top of every
  dashboard page, plus batch name, course details, start date and payment
  status on Overview. Updates live via Supabase Realtime, with polling as
  a fallback.

## Payment status for directly-added students

> **Upgrading?** Run `supabase/migration-payment-status.sql` once in the
> Supabase SQL Editor (safe to re-run). Fresh installs get it from
> `schema.sql`.

On **Admin → Students → "Add a student directly"** just pick a status —
the amount defaults to the course price, so the usual case is one tap.
(Paid and Pending have a folded "Change amount…" link if you need it;
Part payment shows its fields straight away.)

| Status | Records | Receipt |
|---|---|---|
| **Paid** | amount received (defaults to the course price) + method | yes |
| **Part payment** | received so far + total agreed + method → balance | yes (shows balance) |
| **Payment pending** | total agreed, nothing received | no |
| **Complimentary** | nothing | no |

Method is cash, bank transfer, POS or other. The amount, method and
status are validated server-side **before** any account is created
(`lib/payments.js`, unit-tested), and adding someone already enrolled in
that course is refused.

- **Payment stats:** the Payments page opens with **Collected** and
  **Outstanding**, then a tile per status — *All, Paid, Part payment,
  Pending, Complimentary* — each with its count and the amount still owed.
  Click a tile to filter the ledger, and narrow further by **Manual** or
  **Paystack**; the tile counts and headline money always cover everyone,
  while a line under the filters shows the totals for what's in view. The
  Overview shows the same stats, and its tiles link straight into the
  matching filtered ledger (`/admin/payments?status=pending`). All of it
  comes from one function, `summarizePayments()` in `lib/payments.js`
  (unit-tested), so the two pages can't disagree.
- **Payment status on every student, and filters:** **Students** shows,
  for each course a student holds, its source chip (Manual / Paystack),
  its payment chip (Paid / Part payment / Payment pending / Complimentary)
  and the amounts (e.g. "₦50,000 paid · ₦100,000 balance"). Filter by
  payment status (chips show how many students are in each) and by how
  they registered. Filters apply to the *same* registration — "Paid" +
  "Manual" means one registration that is both — and a student with
  several registrations matches if any one does (the rest are dimmed).
  Inside each **batch**, every student shows their payment chip and
  amounts, and the status counts above the list filter that batch.
- **Edit later:** **Admin → Payments** shows every enrollment with its
  status; directly-added students get an edit button (pending → paid,
  record another instalment). Paystack payments are verified against
  Paystack and are read-only.
- **Access is separate from payment.** `registrations.status` still
  means "has access"; `payment_status` is the money. An enrolled student
  has full access whatever the status — use Block / Remove to cut access.
- **Where it shows:** the Payments ledger (collected vs outstanding), an
  amber "Owes ₦X" chip beside the student in their batch, the student's
  own Overview card, and receipts (a part payment is labelled as such and
  shows the balance).

## Pushing to git

- **Do commit `supabase/`** (`schema.sql` + the `migration-*.sql` files).
  It holds table definitions and security policies only — no keys, no
  data — and the schema isn't what protects your data anyway (Row Level
  Security does). Keeping it in git is what lets you rebuild or review the
  database later.
- **Never commit `.env.local`.** It holds `PAYSTACK_SECRET_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY`; the service-role key bypasses every
  security rule. `.gitignore` already excludes it. Put the same values in
  your host's environment-variable settings (e.g. Vercel → Settings →
  Environment Variables). `.env.example` (empty placeholders) *is*
  committed so others know what to set.
- Before your first push, check nothing sensitive is tracked:
  `git ls-files | grep -i env` should list only `.env.example`.
  If `.env.local` was **ever** committed, deleting it isn't enough — it
  stays in history, so rotate the Paystack secret key and the Supabase
  service-role key.

## How manually-added students get connected to their login

`lib/accounts.js` (unit-tested against a fake Supabase client):

- **Find-or-create by email, case-insensitively** — `Jane@Gmail.com` and
  `jane@gmail.com` are the same person; `_` in an address is matched
  literally (`john_doe` never matches `johnXdoe`). An auth account that
  exists with no profile row is repaired instead of failing with "already
  registered". An admin's email is refused as a student.
- **Claim at first sign-in** — Supabase doesn't always attach a Google
  sign-in to an account an admin pre-created; it can make a second one,
  leaving the registration on an account the student never uses. At
  sign-in (`app/auth/callback/route.js`), registrations on any *student*
  account with the same email that has **never signed in** are moved onto
  the account that just did, and the empty one is removed. It only runs
  for a verified email, never merges two accounts that have both signed
  in, never touches admins, and leaves the old account alone if the move
  fails. This also heals duplicates created before this fix.
- Adding someone who is already enrolled in that course is refused, and
  the message names their course and batch.
- **How they registered is labelled** on every student: a violet
  **Manual** chip (added by an admin) or a blue **Paystack** chip
  (registered and paid online). It's derived from the payment reference
  (`getSource()` in `lib/payments.js`), so it's correct for existing
  registrations too. It shows on Students (per course, since one student
  can have one of each), on each student inside a batch, and on the
  Payments ledger.

## In-app dialogs (no browser `confirm()` / `alert()`)

`components/ui/DialogProvider.jsx` is mounted once in `app/layout.jsx`.
Any client component can use it:

```jsx
const { confirm, alert } = useDialog();

const ok = await confirm({
  title: 'Delete announcement?',
  message: 'Students will no longer see it.',
  confirmLabel: 'Delete',
  tone: 'danger'            // 'default' | 'danger' | 'success' | 'error'
});
if (!ok) return;

await alert({ title: 'Saved', message: 'Batch renamed.', tone: 'success' });
```

Both return Promises, so call sites read like the native ones. A plain
string works as shorthand (`confirm('Sure?')`). Dialogs queue if several
are requested at once, close on Escape / backdrop click, trap Tab focus,
lock page scroll, and return focus to the button that opened them. For
`tone: 'danger'` confirms, **Cancel** is focused by default so a stray
Enter can't delete anything.

## Performance notes

- `lib/supabase/session.js` — `getUser()` / `getProfile()` are memoised
  **per request** (React `cache`), so the root Nav, the portal layout and
  the page share one Supabase Auth call and one profile query instead of
  repeating them. Server Actions and route handlers deliberately do *not*
  use these: they verify fresh, since they're the real authorization
  boundary.
- Independent queries run in parallel (`Promise.all`) rather than in a
  waterfall — see the dashboard layout/pages.
- `app/admin/loading.jsx` and `app/dashboard/loading.jsx` show a skeleton
  instantly, so sidebar clicks respond right away and Next can prefetch
  each route's shell.
- `components/Tabs.jsx` mounts a panel on first open and then keeps it
  mounted (hidden): switching back is instant and half-typed form input
  survives.
- The landing page's 3D robot (three.js) is code-split and loaded after
  the page is interactive (`components/Robot3DLazy.jsx`).
- Landing + `/register` read course registration state through
  `getPublicCourseSettings()` (Next data cache, tag `course-settings`),
  which saving on `/admin/registration` busts immediately. Anything that
  decides whether someone may pay reads the live table instead.
- Locked note days are stripped on the server, so unreleased lesson text
  isn't shipped to the browser.
- Class videos use `preload="none"` plus a Cloudinary poster frame, so
  nothing downloads until Play.

## Why not a secret tap-the-bot password for admin

An earlier version of this idea (before this app existed) was going to
gate `/admin` behind double-tapping a bot icon and typing a password. That
would not have worked: any string checked in browser JavaScript is
sitting in the shipped bundle for anyone to read via dev tools — it's not
a real access control, just an easily-defeated inconvenience. `/admin`
here is a normal Google sign-in instead, and the actual boundary between
"admin" and "student" is enforced by Postgres Row Level Security
(`supabase/schema.sql`) — a student's session cannot read or write admin
data no matter what the frontend does, because the database itself
refuses the query.

## Security notes worth knowing

- **RLS is the real boundary**, not the Next.js code. Read
  `supabase/schema.sql` top to bottom before changing access rules.
- **The service-role client** (`lib/supabase/admin.js`) bypasses RLS
  entirely. It's only imported from `app/api/payments/verify/route.js`,
  which does its own verification (Paystack, age eligibility, an actual
  Google-authenticated session) before touching the database. Never
  import it into a Client Component or a Server Action.
- **Server Actions** (`app/admin/actions.js`) deliberately use the
  regular, RLS-bound server client — running as the admin's own session —
  rather than the service-role client, so Postgres itself is what rejects
  a non-admin trying to call one of these, not just "the UI wouldn't
  normally show this button."
- **There is no password anywhere.** Google handles the credential
  entirely; this app never sees, stores, or emails one.
- **EmailJS is used for exactly one thing**: notifying you
  (aboyadematthew@gmail.com) when someone completes a paid registration.
  It plays no role in verifying anyone's identity.
- **The Paystack public key and Supabase anon key are meant to be
  public** — `.env.local` keeps them out of source control, but they're
  still visible in the shipped JS bundle, which is normal for this kind
  of key.

## Stack

- Next.js 14 (App Router) + Tailwind CSS
- Supabase (Postgres, Auth with Google OAuth, Row Level Security, Realtime)
- `@paystack/inline-js` for payment, verified server-side against
  Paystack's API
- `@emailjs/browser` (client, unused for now) / EmailJS REST API (server)
  for the admin notification email only

## Project structure

```text
.
├── app/
│   ├── page.jsx                    # Landing page
│   ├── register/page.jsx           # Registration + payment flow
│   ├── terms/page.jsx               # Terms & Policy
│   ├── login/page.jsx               # Student login (Google)
│   ├── auth/callback/route.js       # Google OAuth code exchange
│   ├── dashboard/page.jsx           # Student dashboard (class link, chat)
│   ├── admin/
│   │   ├── login/page.jsx           # Admin login (Google)
│   │   ├── page.jsx                 # Admin dashboard
│   │   ├── batches/ content/ registration/   # Batch, content & registration admin
│   │   └── actions.js               # Admin Server Actions (RLS-bound)
│   └── api/
│       └── payments/verify/route.js  # Server-side Paystack verification
│                                       # + registration, all in one step
├── components/                      # UI components (admin/, dashboard/)
├── lib/
│   ├── courses.js                    # Pricing, learn lists, age minimums
│   ├── batch-timer.js                # 9-week class timer state machine
│   ├── course-status.js              # Registration open/closed + tags + reopen date
│   ├── supabase/session.js           # Per-request cached getUser()/getProfile()
│   ├── supabase/                     # client / server / admin Supabase clients
│   ├── paystack.js, emailjs-server.js
├── supabase/schema.sql               # Full schema + RLS policies
├── middleware.js                     # Session refresh + route protection
└── public/images/cohort/             # Campaign images
```

## License

MIT — © 2024 Aboyade Matthew.

## Uploading videos and links (latest)
- Choose several videos at once; they upload two at a time. Each video is its own job: a bad file, a dropped connection or a save error only fails that row, with a plain-language reason and a Retry button (a video that already uploaded but could not be saved is saved again without re-uploading).
- `.mpeg/.mpg` (and mpe, m2v, ts, flv, ogv...) are accepted; non-MP4/WebM/MOV files are stored as their `.mp4` delivery address so students can play them. Cloudinary sometimes reads .mpeg as "mp3", so `mp3` is on the signed `allowed_formats` list in `lib/cloudinary-server.js`; the browser still refuses real audio/image/text files up front.
- Error wording lives in `describeUploadError()` in `lib/cloudinary.js`.
- Class links: "Several at once" takes one link per line (`Label | https://…`); each line succeeds or fails alone.
