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
