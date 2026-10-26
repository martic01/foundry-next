-- Names, and per-course installation checklist. Safe to re-run.

-- 1. Chosen name vs Google name.
--    full_name   = what the site shows (the name the student typed at registration)
--    google_name = the Google account name (an alternative / fallback)
alter table profiles add column if not exists google_name text;
update profiles set google_name = full_name where google_name is null;
-- Students who already gave a certificate name: show that name everywhere.
update profiles set full_name = certificate_name
  where certificate_name is not null and btrim(certificate_name) <> '' and full_name is distinct from certificate_name;

-- 2. Per-course installation checklist.
--    installs = { "vscode": true, "node": true, "whatsapp": true, ... }
alter table profiles add column if not exists installs jsonb not null default '{}'::jsonb;
update profiles set installs = installs || jsonb_build_object('vscode', true) where vscode_installed;
update profiles set installs = installs || jsonb_build_object('git', true) where git_installed;

-- A student can only tick their own tools: this function touches nothing else
-- (not role, not blocked), whatever the profiles update policy says.
create or replace function set_tool_installed(p_tool text, p_done boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_tool is null or p_tool !~ '^[a-z0-9-]{1,30}$' then raise exception 'bad tool'; end if;
  update profiles
    set installs = jsonb_set(coalesce(installs, '{}'::jsonb), array[p_tool], to_jsonb(coalesce(p_done, false)), true),
        vscode_installed = case when p_tool = 'vscode' then coalesce(p_done, false) else vscode_installed end,
        git_installed = case when p_tool = 'git' then coalesce(p_done, false) else git_installed end
    where id = auth.uid();
end;
$$;
revoke all on function set_tool_installed(text, boolean) from public, anon;
grant execute on function set_tool_installed(text, boolean) to authenticated;
