-- Security hardening. Run once in the Supabase SQL editor.

-- 1. Server-only functions must not be callable through the public API.
--    assign_batch creates batches; check_rate_limit writes rate_limits
--    (anyone could burn another user's budget or spam batches).
--    Both are only ever called with the service-role key.
revoke execute on function assign_batch(course_key) from public, anon, authenticated;
revoke execute on function check_rate_limit(text, int, int) from public, anon, authenticated;
grant  execute on function assign_batch(course_key) to service_role;
grant  execute on function check_rate_limit(text, int, int) to service_role;

-- 2. Pin search_path on every SECURITY DEFINER function so a user-created
--    object in another schema can't shadow a table/function they use.
alter function is_admin() set search_path = public, pg_temp;
alter function is_blocked() set search_path = public, pg_temp;
alter function assign_batch(course_key) set search_path = public, pg_temp;
alter function can_view_batch_content(uuid) set search_path = public, pg_temp;
alter function check_rate_limit(text, int, int) set search_path = public, pg_temp;
alter function set_installation_status(boolean, boolean) set search_path = public, pg_temp;

-- 3. The remaining helpers are meant to be callable by signed-in users
--    (RLS uses them) but not by anonymous callers.
revoke execute on function set_installation_status(boolean, boolean) from public, anon;
grant  execute on function set_installation_status(boolean, boolean) to authenticated;
