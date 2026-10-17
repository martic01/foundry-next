import { destroyCloudinaryVideo, publicIdFromCloudinaryUrl } from './cloudinary-server';

// Deletes everything whose expires_at has passed. Server-only; takes the
// SERVICE-ROLE client (it has to see rows RLS hides from students).
//   * announcements: row deleted (their pop-up alerts go with them)
//   * class links:   row deleted
//   * videos:        the Cloudinary file is destroyed FIRST, then the row.
//     If Cloudinary fails, the row is kept (students already can't see it)
//     and retried on the next run -- the file is never silently orphaned.
// Never throws; returns counts.
export async function purgeExpiredContent(admin) {
  const out = { messages: 0, links: 0, videos: 0, videoFailures: 0 };
  const now = new Date().toISOString();
  try {
    const m = await admin.from('messages').delete().lt('expires_at', now).select('id');
    out.messages = m.data?.length || 0;
    const l = await admin.from('class_links').delete().lt('expires_at', now).select('id');
    out.links = l.data?.length || 0;

    const { data: vids } = await admin
      .from('class_videos')
      .select('id, cloudinary_url, cloudinary_public_id')
      .lt('expires_at', now)
      .limit(50);
    for (const v of vids || []) {
      const gone = await destroyCloudinaryVideo(v.cloudinary_public_id || publicIdFromCloudinaryUrl(v.cloudinary_url));
      if (!gone.ok) {
        out.videoFailures += 1;
        continue;
      }
      const { error } = await admin.from('class_videos').delete().eq('id', v.id);
      if (!error) out.videos += 1;
    }
  } catch (err) {
    console.error('purgeExpiredContent failed:', err);
  }
  return out;
}

// Opportunistic clean-up for staff page loads, throttled per server
// instance so it's not a query on every request. The daily cron
// (app/api/cron/purge) is the guaranteed path.
let lastRun = 0;
export async function maybePurgeExpired(createAdmin, minGapMs = 10 * 60 * 1000) {
  if (Date.now() - lastRun < minGapMs) return null;
  lastRun = Date.now();
  try {
    return await purgeExpiredContent(createAdmin());
  } catch {
    return null;
  }
}
