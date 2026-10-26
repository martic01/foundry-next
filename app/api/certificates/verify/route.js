import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { normalizeCode } from '../../../../lib/certificates';

// Public: anyone holding a certificate id can check it. The table itself
// is never public -- this route (service role) answers ONE exact id and
// returns nothing else. Ids are 12 random characters from a 31-letter
// alphabet (~59 bits), and this route is rate limited per IP, so ids
// can't be guessed or the list of students harvested.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map(); // ip -> [timestamps]; best-effort per server instance

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return list.length > MAX_PER_WINDOW;
}

// ab***@gmail.com: enough for the owner to recognise, not enough to harvest.
function maskEmail(e) {
  const [local = '', domain = ''] = String(e || '').split('@');
  if (!domain) return '';
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function POST(request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  // Shared database counter (works across serverless instances); the in-memory
  // map is only the fallback if that call fails.
  let blocked;
  try {
    const { data, error } = await createAdminClient().rpc('check_rate_limit', { p_key: `cert:${ip}`, p_max: MAX_PER_WINDOW, p_window_seconds: 60 });
    blocked = error ? limited(ip) : data === false;
  } catch {
    blocked = limited(ip);
  }
  if (blocked) return NextResponse.json({ valid: false, error: 'Too many checks. Please wait a minute and try again.' }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ valid: false, error: 'Send a certificate id.' }, { status: 400 }); }
  const code = normalizeCode(body?.code);
  if (!code) return NextResponse.json({ valid: false, error: 'That doesn’t look like a certificate id. It has 12 letters and numbers, like AB3K-9XQM-2TFW.' }, { status: 400 });

  try {
    const { data, error } = await createAdminClient()
      .from('certificates')
      .select('student_name, student_email, course_title, awarded_at')
      .eq('code', code)
      .maybeSingle();
    if (error) return NextResponse.json({ valid: false, error: 'We couldn’t check right now. Please try again shortly.' }, { status: 503 });
    if (!data) return NextResponse.json({ valid: false });
    return NextResponse.json({
      valid: true,
      name: data.student_name,
      email: maskEmail(data.student_email),
      course: data.course_title,
      awardedAt: data.awarded_at
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ valid: false, error: 'We couldn’t check right now. Please try again shortly.' }, { status: 503 });
  }
}
