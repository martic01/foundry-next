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
   that course with fewer than 30 paid students, else a new one — see
   `assign_batch` in `supabase/schema.sql`), registration recorded. No
   separate "finish creating your account" step exists to abandon.

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
│   │   └── actions.js               # Admin Server Actions (RLS-bound)
│   └── api/
│       └── payments/verify/route.js  # Server-side Paystack verification
│                                       # + registration, all in one step
├── components/                      # UI components (admin/, dashboard/)
├── lib/
│   ├── courses.js                    # Pricing, learn lists, age minimums
│   ├── supabase/                     # client / server / admin Supabase clients
│   ├── paystack.js, emailjs-server.js
├── supabase/schema.sql               # Full schema + RLS policies
├── middleware.js                     # Session refresh + route protection
└── public/images/cohort/             # Campaign images
```

## License

MIT — © 2024 Aboyade Matthew.
