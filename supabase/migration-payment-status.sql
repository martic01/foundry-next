-- The Foundry -- "payment status" migration.
--
-- Run ONCE in the Supabase SQL Editor on a project that already has the
-- schema. Safe to re-run. Fresh project? Skip this -- schema.sql already
-- contains it.
--
-- Lets the admin record HOW and HOW MUCH a directly-added student paid:
--   payment_status  paid | part | pending | free
--   amount_kobo     money actually received so far (already existed)
--   amount_due_kobo the agreed total, for part / pending (NULL otherwise)
--   payment_method  cash | bank_transfer | pos | other
--
-- registrations.status ('paid' | 'removed') is untouched and still means
-- "does this student have access?". Paystack rows keep working as-is:
-- they default to payment_status 'paid' with no amount_due.

alter table registrations
  add column if not exists payment_status text not null default 'paid'
    check (payment_status in ('paid', 'part', 'pending', 'free')),
  add column if not exists amount_due_kobo int,
  add column if not exists payment_method text
    check (payment_method in ('cash', 'bank_transfer', 'pos', 'other'));

-- Students the admin added before this existed were recorded as paid
-- with amount 0 -- that is really "complimentary". (The payment_status
-- guard keeps this from touching anything you've edited since.)
update registrations
set payment_status = 'free'
where paystack_reference like 'ADMIN-ADDED-%'
  and amount_kobo = 0
  and payment_status = 'paid';
