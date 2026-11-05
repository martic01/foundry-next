// Reads the session id out of a Supabase access token (a JWT). It is only used to
// compare "is this the device that signed in last?", never to trust who someone is:
// middleware has already verified the token with Supabase before this is read.
export function sessionIdFromToken(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    const sid = JSON.parse(json).session_id;
    return typeof sid === 'string' && sid.length <= 100 ? sid : null;
  } catch {
    return null;
  }
}
