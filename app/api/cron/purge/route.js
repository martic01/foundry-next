import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { purgeExpiredContent } from '../../../../lib/purge';

export const dynamic = 'force-dynamic';

// Daily clean-up of expired announcements / class links / videos
// (see vercel.json). Vercel Cron sends `Authorization: Bearer $CRON_SECRET`;
// set CRON_SECRET in the project's environment variables. Without it the
// route refuses to run, so it can't be triggered by strangers.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const result = await purgeExpiredContent(createAdminClient());
  return NextResponse.json({ ok: true, ...result });
}
