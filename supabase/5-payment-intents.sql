-- Server-started payments. /api/payments/initialize writes one row here
-- BEFORE the Paystack window opens, with the price the server chose at that
-- moment. Verification (browser) and the webhook (Paystack) both check the
-- money received against THIS row, so a price change mid-payment or a
-- tampered amount can never create or refuse a seat by mistake.
-- Safe to re-run.

create table if not exists payment_intents (
  reference text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  email text not null,
  full_name text,
  course course_key not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  age int not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'needs_review')),
  note text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists payment_intents_user_course on payment_intents (user_id, course);
create index if not exists payment_intents_status on payment_intents (status, created_at);

-- Only the server (service role) writes. Admins may read, to see payments
-- flagged 'needs_review' (money received but no seat created).
alter table payment_intents enable row level security;
drop policy if exists "payment_intents_admin_read" on payment_intents;
create policy "payment_intents_admin_read" on payment_intents for select using (is_admin());

-- To list payments that need a refund or a manual seat:
--   select reference, email, course, amount_kobo, note, created_at
--   from payment_intents where status = 'needs_review' order by created_at desc;

-- If you ran an earlier version of this file, make sure the amount column is bigint:
alter table payment_intents alter column amount_kobo type bigint;
