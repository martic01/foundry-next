-- Terms & policy acceptance for students an admin registers by hand.
-- Safe to re-run.
alter table profiles add column if not exists terms_accepted_at timestamptz;

-- Students who registered online already ticked "I agree to the Terms & Policy" to
-- pay, so mark them as agreed (dated from when they registered).
update profiles p set terms_accepted_at = coalesce(
    (select min(r.created_at) from registrations r where r.user_id = p.id and r.paystack_reference not like 'ADMIN-ADDED-%'), now())
  where p.terms_accepted_at is null and p.role = 'student'
    and exists (select 1 from registrations r where r.user_id = p.id and r.paystack_reference not like 'ADMIN-ADDED-%');

-- A student can only record THEIR OWN acceptance, and nothing else changes.
create or replace function accept_terms() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update profiles set terms_accepted_at = coalesce(terms_accepted_at, now()) where id = auth.uid();
end;
$$;
revoke all on function accept_terms() from public, anon;
grant execute on function accept_terms() to authenticated;
