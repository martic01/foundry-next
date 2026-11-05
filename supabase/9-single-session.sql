-- One signed-in device per account. Safe to re-run.
-- profiles.active_session holds the id of the ONE session allowed to use the account.
-- Signing in on a new device replaces it, which signs the old device out.
alter table profiles add column if not exists active_session text;

-- A signed-in user can only set THEIR OWN value. With p_only_if_empty = true it only
-- fills a blank (used the first time an older session is seen); otherwise it replaces.
create or replace function register_session(p_session text, p_only_if_empty boolean default false) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_session is null or length(p_session) > 100 then raise exception 'bad session'; end if;
  update profiles set active_session = p_session
    where id = auth.uid() and (not p_only_if_empty or active_session is null);
end;
$$;
revoke all on function register_session(text, boolean) from public, anon;
grant execute on function register_session(text, boolean) to authenticated;
