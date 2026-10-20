import { signCloudinaryParams } from './cloudinary-sign';

// Server-only. Deletes a video from Cloudinary using the signed destroy
// API, so removing a class video in the admin panel also frees it on
// Cloudinary. Returns { ok: true } or { ok: false, error }.
// "not found" counts as success -- the goal (file gone) is already met.
export async function destroyCloudinaryVideo(publicId) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return { ok: false, error: 'CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are not set on the server.' };
  }
  if (!publicId) return { ok: false, error: 'No Cloudinary id stored for this video.' };

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp, invalidate: 'true' };
  const body = new URLSearchParams({
    ...params,
    api_key: apiKey,
    signature: signCloudinaryParams(params, apiSecret)
  });
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/destroy`, {
      method: 'POST',
      body,
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error?.message || `Cloudinary returned ${res.status}.` };
    if (data.result === 'ok' || data.result === 'not found') return { ok: true };
    return { ok: false, error: `Unexpected Cloudinary result: ${data.result || 'unknown'}.` };
  } catch {
    return { ok: false, error: 'Could not reach Cloudinary.' };
  }
}

// Fallback when a row has no stored public id: derive it from the
// delivery URL .../video/upload/[transforms/]v123/folder/name.ext
export function publicIdFromCloudinaryUrl(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const i = parts.indexOf('upload');
    if (i === -1) return null;
    let rest = parts.slice(i + 1);
    const v = rest.findIndex((p) => /^v\d+$/.test(p));
    rest = v === -1 ? rest.slice(rest.length - 1) : rest.slice(v + 1);
    if (!rest.length) return null;
    return decodeURIComponent(rest.join('/')).replace(/\.[A-Za-z0-9]+$/, '');
  } catch {
    return null;
  }
}

// Parameters a browser upload is signed with. Kept in one place so the
// server signs exactly what the browser sends.
export const VIDEO_UPLOAD_FOLDER = 'foundry/class-videos';
// mpeg/mpg/mpe/m2v are listed because Cloudinary reads some .mpeg files as
// "mp3" (it sniffs the stream, not the name), so mp3 must be allowed here
// too or those files are refused. The browser (lib/cloudinary.js) only
// lets real video extensions through, so a plain .mp3 still gets a clear
// "that's audio" message before any upload starts.
export const VIDEO_UPLOAD_FORMATS = 'mp4,mov,m4v,webm,mkv,avi,wmv,3gp,3g2,mpeg,mpg,mpe,m2v,mp3,ts,mts,m2ts,flv,ogv';

// Folder for a video: foundry/class-videos/<course>/<batch-name>, or
// .../all-batches for a video shown to every batch. Keeps the Cloudinary
// Media Library tidy. (Renaming a batch later doesn't move old files --
// they keep working wherever they are.)
export const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'batch';
export function videoFolderFor(batch) {
  if (!batch) return `${VIDEO_UPLOAD_FOLDER}/all-batches`;
  return `${VIDEO_UPLOAD_FOLDER}/${slugify(batch.course)}/${slugify(batch.label)}`;
}

export function signVideoUpload(folder = VIDEO_UPLOAD_FOLDER) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  // use_filename: keep the original file name (plus a short random suffix)
  // instead of a random string, so files are recognisable in Cloudinary.
  const params = { allowed_formats: VIDEO_UPLOAD_FORMATS, folder, timestamp: Math.floor(Date.now() / 1000), unique_filename: 'true', use_filename: 'true' };
  return { cloudName, apiKey, signature: signCloudinaryParams(params, apiSecret), ...params };
}

// When was this video uploaded (ms since epoch)? null if unknown. Uses the
// Cloudinary Admin API (basic auth with the API key + secret).
export async function getCloudinaryVideoCreatedAt(publicId) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret || !publicId) return null;
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/video/upload/${publicId.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { Authorization: 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64') }, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const t = Date.parse(data.created_at);
    return Number.isNaN(t) ? null : t;
  } catch {
    return null;
  }
}
