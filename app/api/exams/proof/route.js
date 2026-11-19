import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { createClient as createSessionClient } from '../../../../lib/supabase/server';
import { PROOF_BUCKET, PROOF_LIMITS } from '../../../../lib/exam/proof';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const runtime = 'nodejs';

// POST: the student's browser sends a camera snapshot or a short microphone clip while their exam runs.
export async function POST(request) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  let form;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: 'Bad upload.' }, { status: 400 }); }
  const attemptId = String(form.get('attemptId') || '');
  const kind = String(form.get('kind') || '');
  const file = form.get('file');
  if (!UUID_RE.test(attemptId) || !['photo', 'audio'].includes(kind) || !file || typeof file === 'string') return NextResponse.json({ error: 'Bad upload.' }, { status: 400 });
  if (file.size < 1 || file.size > PROOF_LIMITS[kind]) return NextResponse.json({ error: 'File too large.' }, { status: 413 });
  const type = String(file.type || '');
  if (kind === 'photo' ? !/^image\/(jpeg|webp)$/.test(type) : !/^audio\//.test(type)) return NextResponse.json({ error: 'Wrong file type.' }, { status: 415 });

  const db = createAdminClient();
  const { data: ok } = await db.rpc('check_rate_limit', { p_key: `proof:${user.id}`, p_max: 60, p_window_seconds: 600 });
  if (ok === false) return NextResponse.json({ error: 'Slow down.' }, { status: 429 });
  const { data: at } = await db.from('exam_attempts').select('id, status').eq('id', attemptId).eq('user_id', user.id).maybeSingle();
  if (!at || at.status !== 'in_progress') return NextResponse.json({ error: 'No running exam.' }, { status: 409 });

  const { count } = await db.from('exam_proctor_media').select('id', { count: 'exact', head: true }).eq('attempt_id', attemptId);
  if ((count || 0) >= 400) return NextResponse.json({ error: 'Limit reached.' }, { status: 429 }); // hard cap per attempt (storage abuse)

  const ext = kind === 'photo' ? (type === 'image/webp' ? 'webp' : 'jpg') : (type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm');
  const path = `${user.id}/${attemptId}/${Date.now()}.${ext}`;
  const { error } = await db.storage.from(PROOF_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: type, upsert: false });
  if (error) { console.error('[proof] upload', error.message); return NextResponse.json({ error: 'Could not store.' }, { status: 500 }); }
  await db.from('exam_proctor_media').insert({ attempt_id: attemptId, user_id: user.id, kind, path });
  return NextResponse.json({ ok: true });
}

// GET ?attempt=<id>: the admin reviews what was captured (signed links that expire in an hour).
export async function GET(request) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { data: p } = await session.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (p?.role !== 'admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const attemptId = new URL(request.url).searchParams.get('attempt') || '';
  if (!UUID_RE.test(attemptId)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  const db = createAdminClient();
  const { data: rows } = await db.from('exam_proctor_media').select('id, kind, path, created_at').eq('attempt_id', attemptId).order('created_at').limit(400);
  const items = [];
  for (const r of rows || []) {
    const { data: s } = await db.storage.from(PROOF_BUCKET).createSignedUrl(r.path, 3600);
    if (s?.signedUrl) items.push({ id: r.id, kind: r.kind, at: r.created_at, url: s.signedUrl });
  }
  return NextResponse.json({ items });
}
