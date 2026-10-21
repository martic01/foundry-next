# The Foundry

The Foundry is a cohort-based training and services platform built with Next.js. It brings together a public course marketplace, Google sign-in, online registration and payment, and separate student, teacher, and admin portals.

The project is designed to run as a web application with Supabase providing authentication and the Postgres database. Paystack handles online course payments, and Cloudinary stores class videos. HR training and workspace services are offered through contact enquiries rather than online checkout.

This repository contains the application beyond the public portfolio/marketing site; that separate site links visitors to The Foundry.

## Contents

- [Features](#features)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Database setup](#database-setup)
- [Google sign-in setup](#google-sign-in-setup)
- [Promoting the first admin](#promoting-the-first-admin)
- [Application routes](#application-routes)
- [Project structure](#project-structure)
- [Security and handling secrets](#security-and-handling-secrets)
- [Deployment](#deployment)
- [Development commands](#development-commands)

## Features

### Public marketplace

- Landing page with course cards, cohort information, FAQs, and a 3D robot illustration.
- Course catalogue for the web-development Foundations and React stages, Cybersecurity + AI, and HR.
- Course availability labels, prices, and optional crossed-out original prices. Admins can change availability and pricing without editing application code.
- HR and workspace enquiry sections with contact details managed in the admin portal. HR is enquiry-based and does not offer online checkout.
- Terms page, public certificate verification, and sign-in and registration entry points.

### Registration and payments

- Google OAuth through Supabase Auth is the sign-in method for students, teachers, and admins.
- Registration collects the student's name and date of birth, checks the minimum age in the interface and on the server, and requires agreement to the laptop requirements.
- Paystack checkout is followed by server-side transaction verification before an online registration is recorded. The browser's payment callback alone is not treated as proof of payment.
- Successful registrations are assigned to a suitable course batch, subject to capacity and batch status.
- HR registration is handled through WhatsApp or email enquiries rather than Paystack.
- Admins can add students directly and record paid, part-paid, pending, or complimentary enrolments. Receipts and balances reflect the recorded payment status.
- Students can view enrolment information and receipts in their dashboard.

### Student portal

- Overview of profile, enrolments, batches, class start dates, and payment status.
- Course links and videos, announcements, and notifications relevant to the student's batch.
- A live class timer and status for the student's batch.
- Course notes released according to admin-controlled unlock settings.
- Installation guidance and checklists for VS Code and Git.
- Certificates when awarded, plus public verification by certificate ID.
- Other-course information and a place to find courses beyond the student's current enrolments.

### Teacher portal

- Teachers see only the batches assigned to them.
- Batch overview, student lists, recent class activity, and class timer/status.
- Add or manage batch content such as class links, videos, notes, and announcements, subject to permissions.

### Admin portal

- Overview of students, payments, and activity.
- Create and manage course batches, capacities, labels, start dates, and the nine-week class timer. Move students between same-course batches, block access, or remove enrolments.
- Control registration availability, course tags, scheduled reopening, and custom course pricing.
- Manage students and teachers, including teacher-to-batch assignments and directly added enrolments.
- Manage class links, videos, announcements, reports, and course note unlocks. Content can target a batch or all batches.
- View payment totals and ledger filters; update manually recorded payments.
- Award, edit, and revoke certificates.
- Update HR and workspace enquiry contact details.

### Platform behavior

- Row Level Security (RLS) policies in Postgres control access to application data.
- Supabase Realtime supports live updates in the portals, with polling where appropriate.
- Expired announcements, links, and videos are cleaned up by a scheduled Vercel Cron endpoint.
- Video uploads are signed by the server and uploaded to Cloudinary. Batch video uploads report individual failures and allow retries.
- Responsive layouts, accessible in-app confirmation dialogs, loading states, and error pages.

## Technology

- Next.js 14 App Router and React 18
- Tailwind CSS
- Supabase: Postgres, Auth, Row Level Security, and Realtime
- Paystack Inline for checkout and server-side transaction verification
- Cloudinary for class-video uploads and delivery
- EmailJS REST API for registration notifications
- Three.js for the landing-page 3D illustration

## Getting started

### Prerequisites

- Node.js 18.17 or newer and npm
- A Supabase project
- Google OAuth credentials configured as a Supabase Auth provider
- A Paystack account for online payments
- Cloudinary credentials if you will use video upload and management
- EmailJS credentials if you want registration notification emails

### Install and run

From the repository root:

```powershell
npm install
Copy-Item .env.example .env.local
```

Fill in the values in `.env.local`, following [Configuration](#configuration), then set up Supabase by following [Database setup](#database-setup) and [Google sign-in setup](#google-sign-in-setup).

Start the development server:

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Configuration

`.env.example` lists the names of the supported environment variables with blank values. Copy it to `.env.local` for local development and set actual values only in that ignored local file or in your deployment provider's environment-variable settings.

| Variable | Use | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Browser-visible |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key; access remains governed by RLS | Browser-visible |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase admin client for trusted server operations | Secret; server only |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack checkout | Browser-visible |
| `PAYSTACK_SECRET_KEY` | Server-side Paystack transaction verification | Secret; server only |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | EmailJS public identifier used by the server-side email request | Public identifier |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | EmailJS service configuration | Public identifier |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | EmailJS registration notification template | Public identifier |
| `EMAILJS_PRIVATE_KEY` | EmailJS private access credential | Secret; server only |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary account name used for media delivery and signed uploads | Browser-visible |
| `CLOUDINARY_API_KEY` | Cloudinary server-side upload signing and media management | Secret; server only |
| `CLOUDINARY_API_SECRET` | Cloudinary server-side signing and media management | Secret; server only |
| `NEXT_PUBLIC_VSCODE_INSTALLER_URL` | Optional VS Code installer download link | Browser-visible URL |
| `NEXT_PUBLIC_GIT_INSTALLER_URL` | Optional Git installer download link | Browser-visible URL |
| `CRON_SECRET` | Protects the scheduled content cleanup endpoint | Secret; server only |
| `ADMIN_NOTIFY_EMAIL` | Optional destination for new-registration notifications | Configuration; not an authentication credential |

Variables prefixed with `NEXT_PUBLIC_` are compiled into browser-delivered code and must be treated as public. Never put a password, private key, or other secret in a `NEXT_PUBLIC_*` variable. The Supabase anon key and Paystack public key are intended to be public; database access must still be correctly protected by RLS.

Never paste real values into this README, source code, screenshots, issue reports, or committed configuration. If a credential is exposed, revoke or rotate it with its provider. Keep `.env.local` untracked; commit `.env.example` with empty values only.

## Database setup

Run SQL files in the Supabase project's SQL Editor in the order documented in [`supabase/RUN-ORDER.md`](supabase/RUN-ORDER.md). For a new database, the current order is:

1. `supabase/schema.sql`
2. `supabase/1-enums.sql` — run this file by itself
3. `supabase/2-updates.sql`
4. `supabase/3-pricing-and-contacts.sql`

For an existing database, follow the appropriate upgrade instructions in `supabase/RUN-ORDER.md`; do not blindly run the fresh-install schema over a populated database. The SQL files contain schema, functions, and access policies—not application secrets or production data. Keep them under version control.

The database schema includes the main application entities: profiles, courses and registrations, batches, payments, class content, announcements, notes, teacher assignments, notifications, certificates, and site settings. RLS policies are a core part of the application's authorization model. Review the schema policies before changing database access.

## Google sign-in setup

The application uses Supabase Auth with Google as its OAuth provider:

1. Create a Web application OAuth client in Google Cloud Console.
2. Add the Supabase Auth callback URL shown in the Supabase dashboard to the OAuth client's authorized redirect URIs.
3. In Supabase, open **Authentication → Providers → Google**, enable the provider, and enter the Google OAuth client credentials.
4. Add the local application callback (for development) and production application URL to Supabase's allowed redirect URLs. The app callback route is `/auth/callback`.
5. Set the Supabase project URL and anon/publishable key in your local environment.

Google OAuth client credentials belong in the provider configuration in Supabase. They are not needed in the application's README or source files.

## Promoting the first admin

After Google sign-in has created your account and profile, promote that account using the Supabase SQL Editor. Replace the placeholder with the email address of the account you control:

```sql
update public.profiles
set role = 'admin'
where email = 'your-account@example.com';
```

Check that the intended profile was updated before signing in to `/admin`. Do not put your real email address or credentials in committed documentation. Admin authorization is based on the role stored in the database, not on a hidden URL or client-side password.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page, course catalogue, and workspace information |
| `/register` | Course registration and checkout; course selection can be supplied in the query string |
| `/login` | Student sign-in |
| `/admin/login` | Admin sign-in |
| `/auth/callback` | Supabase OAuth callback |
| `/terms` | Terms and policy |
| `/offline` | Offline fallback page |
| `/receipt/[id]` | Registration receipt |
| `/dashboard` | Student overview |
| `/dashboard/courses` | Student course links and videos |
| `/dashboard/other-courses` | Other course information |
| `/dashboard/notes` | Course notes |
| `/dashboard/installation` | Software installation guidance |
| `/dashboard/announcements` | Student announcements |
| `/dashboard/receipts` | Student receipts |
| `/dashboard/certificate` | Awarded certificate |
| `/teacher` | Teacher overview |
| `/teacher/students` | Teacher's batch students |
| `/teacher/content` | Teacher's batch links and videos |
| `/teacher/notes` | Teacher notes tools |
| `/teacher/announcements` | Teacher announcements |
| `/admin` | Admin overview |
| `/admin/batches` | Batch and timer management |
| `/admin/content` | Class links and video management |
| `/admin/announcements` | Announcements and reports |
| `/admin/registration` | Course registration status and prices |
| `/admin/students` | Student and enrolment management |
| `/admin/teachers` | Teacher accounts and assignments |
| `/admin/notes` | Note release controls |
| `/admin/certificates` | Certificate awards and management |
| `/admin/payments` | Payment ledger and manual payment updates |
| `/admin/contacts` | HR and workspace contact settings |
| `/api/payments/verify` | Server-side Paystack verification and registration |
| `/api/certificates/verify` | Public certificate verification |
| `/api/cron/purge` | Protected scheduled cleanup of expired content |

Some pages require a signed-in account with the appropriate role. Middleware redirects unauthenticated visitors to sign-in; page and database policies enforce role and data access.

## Project structure

```text
app/
  admin/                 Admin portal pages and Server Actions
  api/                   Payment, certificate, and scheduled-job endpoints
  auth/callback/         OAuth callback
  dashboard/             Student portal
  teacher/               Teacher portal
  register/              Registration page
  page.jsx               Public landing page
components/
  admin/                 Admin management interfaces
  dashboard/             Student portal components
  teacher/               Teacher portal components
  portal/                Shared portal layout and navigation
  ui/                    Shared interface components
lib/
  supabase/              Browser, server, admin, and session clients
  courses.js             Course catalogue and age eligibility
  payments.js            Payment validation and summaries
  batch-timer.js         Batch timer behavior
  course-status.js       Registration availability behavior
  certificates.js        Certificate content and helpers
supabase/                 Schema, ordered updates, and migrations
public/                   Static images, models, and installation assets
middleware.js             Supabase session refresh and portal routing
```

## Security and handling secrets

- **Do not commit secrets.** `.env.local` is for local use and should remain ignored by Git. Keep production values in the deployment provider's protected environment settings.
- **Do not expose service credentials.** `SUPABASE_SERVICE_ROLE_KEY`, payment and email private credentials, Cloudinary API credentials, and `CRON_SECRET` must remain server-side.
- **Protect database access with RLS.** Supabase policies are the primary data-access boundary. Review them whenever changing tables or application permissions.
- **Treat service-role access as privileged.** It bypasses RLS and must only be used in trusted server-side code that performs its own authorization and validation.
- **Verify payment on the server.** A client-side success callback does not establish that a payment succeeded.
- **Do not rely on hidden UI controls for authorization.** Every privileged operation must be protected by server-side checks and database policies.
- **Rotate exposed credentials.** Removing a secret from a file does not remove it from Git history. Revoke the exposed credential and issue a replacement.

Before pushing changes, inspect tracked files for accidental configuration:

```powershell
git status --short
git ls-files
```

Do not print or paste the contents of `.env.local` into logs, chat, or commits.

## Deployment

The project includes a [`vercel.json`](vercel.json) schedule for the daily purge endpoint. To deploy:

1. Import the repository into Vercel (or another compatible Next.js host).
2. Configure all required environment variables in the host's protected environment settings. Use production provider credentials only in production.
3. Configure the Supabase Auth site's production URL and OAuth redirect allowlist.
4. Complete the ordered Supabase database setup and verify the RLS policies.
5. Configure the Vercel Cron secret so scheduled cleanup requests are authorized. The endpoint returns an error if the secret is missing or invalid.
6. Build and deploy, then test sign-in, payment verification, student and admin access, video uploads, certificate verification, and the scheduled job in the deployed environment.

Cloudinary and EmailJS integrations are optional for parts of the application, but the features that depend on them require valid configuration. Installer links are optional and can be supplied with the corresponding public URL variables.

## Development commands

```powershell
npm run dev
npm run lint
npm run build
npm run start
```

`npm run start` serves a production build; run `npm run build` first. The project currently defines lint and build scripts but does not define a test script.

## License

This project is distributed under the MIT License. See [`package.json`](package.json) for package metadata.
