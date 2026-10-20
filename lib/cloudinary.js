import { getVideoUploadSignature } from '../app/admin/actions';

// ---------------------------------------------------------------
// Class-video upload (browser -> Cloudinary, signed by our server).
//
// The file never passes through our own server. The upload is SIGNED by
// getVideoUploadSignature (admin/teacher only), so only signed-in staff
// can upload and the browser never sees the API secret.
//
// uploadClassVideo NEVER throws: it resolves to
//   { ok: true, url, publicId }  or  { ok: false, error, retryable }
// where `error` is a plain-language sentence naming the actual cause.
// That is what lets a batch of videos carry on when one of them fails.
// ---------------------------------------------------------------

// What the browser will accept. Cloudinary has the final say, but these
// catch the common mistakes before a single byte is sent.
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', 'wmv', '3gp', '3g2', 'mpeg', 'mpg', 'mpe', 'm2v', 'ts', 'mts', 'm2ts', 'flv', 'ogv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg', 'wma'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic'];
// Formats a browser can play as-is. Anything else is delivered as MP4 by
// Cloudinary (see toPlayableUrl) so students can actually watch it.
const BROWSER_PLAYABLE = ['mp4', 'webm', 'mov', 'm4v', 'ogv'];

export const extensionOf = (name) => (String(name || '').match(/\.([A-Za-z0-9]+)$/)?.[1] || '').toLowerCase();

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '0 KB';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

// Returns null when the file looks fine, otherwise the plain-language reason.
export function checkVideoFile(file) {
  if (!file || typeof file.name !== 'string') return 'That doesn’t look like a file.';
  const ext = extensionOf(file.name);
  if (!file.size) return `“${file.name}” is empty (0 KB), so there is nothing to upload. Try exporting or copying it again.`;
  if (AUDIO_EXTENSIONS.includes(ext)) return `“${file.name}” is an audio file (.${ext}), not a video. Please choose a video such as .mp4, .mov or .mpeg.`;
  if (IMAGE_EXTENSIONS.includes(ext) || (file.type || '').startsWith('image/')) return `“${file.name}” is a picture, not a video. Please choose a video file.`;
  if (!VIDEO_EXTENSIONS.includes(ext)) {
    if ((file.type || '').startsWith('video/')) return null; // unusual extension but the browser says video; let Cloudinary decide
    return `“${file.name}” isn’t a video file${ext ? ` (.${ext})` : ''}. Supported types: ${VIDEO_EXTENSIONS.slice(0, 8).join(', ').toUpperCase()}, MPEG and a few more.`;
  }
  return null;
}

// Turn whatever Cloudinary / the browser said into one friendly sentence.
// `ctx` = { file, status, kind }. Never returns raw technical text alone.
export function describeUploadError(raw, ctx = {}) {
  const msg = String(raw || '');
  const name = ctx.file?.name ? `“${ctx.file.name}”` : 'This video';
  const status = ctx.status || 0;
  const ext = extensionOf(ctx.file?.name);

  if (ctx.kind === 'offline') return 'You appear to be offline. Check your internet connection, then press Retry — the other videos are not affected.';
  if (ctx.kind === 'network') return `The connection dropped while uploading ${name}. Check your internet, then press Retry.`;
  if (ctx.kind === 'timeout') return `Uploading ${name} took too long and was stopped (slow or unstable internet). Press Retry, or try a smaller file.`;
  if (ctx.kind === 'aborted') return `The upload of ${name} was cancelled.`;

  if (/file size too large|too large|exceeds? .*limit|maximum is/i.test(msg)) {
    const got = msg.match(/Got\s+(\d+)/i)?.[1];
    const max = msg.match(/Maximum is\s+(\d+)/i)?.[1];
    const sizes = got && max ? ` (it is ${formatBytes(+got)}, the limit is ${formatBytes(+max)})` : ctx.file ? ` (it is ${formatBytes(ctx.file.size)})` : '';
    return `${name} is too big${sizes}. Compress it or cut it into shorter parts, then upload again.`;
  }
  if (/not allowed|unsupported|invalid (image|video) file|unknown file format|format .* not/i.test(msg) && !/signature/i.test(msg)) {
    return `${name} is in a format we can’t accept${ext ? ` (.${ext})` : ''}. Convert it to MP4 and upload again.`;
  }
  if (/corrupt|could not be (decoded|processed)|invalid (data|stream)|moov atom|failed to (decode|process)/i.test(msg)) {
    return `${name} looks damaged or incomplete, so it can’t be processed. Try exporting it again, or open it in a player first to check it plays.`;
  }
  if (/stale request|timestamp|expired/i.test(msg)) return 'The upload permission expired before it finished (the computer’s clock may be off). Press Retry.';
  if (/invalid signature|signature/i.test(msg)) return 'The upload was not authorised. Refresh the page, sign in again if asked, then press Retry.';
  if (/api[_ ]key|cloud[_ ]name|invalid credentials|unknown api|disabled account|account.*(disabled|suspended)/i.test(msg)) {
    return 'The video storage is not set up correctly (Cloudinary rejected the account settings). This is not your file — ask the site admin to check the Cloudinary keys.';
  }
  if (/quota|limit.*(reached|exceeded)|storage/i.test(msg)) return 'The video storage is full or the monthly limit was reached. Ask the site admin to free up space or upgrade Cloudinary.';
  if (status === 401 || status === 403) return 'You don’t have permission to upload right now. Refresh the page and sign in again.';
  if (status === 420 || status === 429) return 'Too many uploads at once. Wait a minute, then press Retry.';
  if (status >= 500) return 'The video service had a temporary problem. This is not your file — wait a moment and press Retry.';
  return `${name} could not be uploaded${msg ? ` (${msg.slice(0, 140)})` : ''}. Press Retry; if it keeps failing, try converting it to MP4.`;
}

// A browser can't play .mpeg/.avi/.mkv etc. Cloudinary can serve ANY
// uploaded video as MP4 just by asking for the .mp4 version of the same
// public id, so store that address -- students then get a video that
// plays. The public id is unchanged, so deletion still works.
export function toPlayableUrl(url) {
  if (typeof url !== 'string') return url;
  const m = url.match(/\.([A-Za-z0-9]+)(\?.*)?$/);
  if (!m || BROWSER_PLAYABLE.includes(m[1].toLowerCase())) return url;
  return url.replace(/\.[A-Za-z0-9]+(\?.*)?$/, '.mp4$1');
}

const UPLOAD_TIMEOUT_MS = 60 * 60 * 1000; // an hour: big files on slow connections

export async function uploadClassVideo(file, onProgress, audience = 'all', { signal } = {}) {
  const bad = checkVideoFile(file);
  if (bad) return { ok: false, error: bad, retryable: false };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, error: describeUploadError('', { kind: 'offline', file }), retryable: true };
  }

  let sig;
  try {
    sig = await getVideoUploadSignature(audience);
  } catch {
    // The server action itself couldn't be reached.
    return { ok: false, error: 'Couldn’t reach our server to start the upload. Check your internet, then press Retry.', retryable: true };
  }
  if (!sig?.ok) {
    return { ok: false, error: sig?.error || 'The server refused to start this upload. Refresh the page and try again.', retryable: false };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', sig.apiKey);
  formData.append('timestamp', String(sig.timestamp));
  formData.append('signature', sig.signature);
  formData.append('folder', sig.folder);
  formData.append('allowed_formats', sig.allowed_formats);
  formData.append('unique_filename', sig.unique_filename);
  formData.append('use_filename', sig.use_filename);

  // Plain fetch has no upload-progress event, so this uses XHR instead.
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    const done = (r) => { if (!settled) { settled = true; resolve(r); } };
    const fail = (raw, ctx, retryable = true) => done({ ok: false, error: describeUploadError(raw, { file, ...ctx }), retryable });

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url && data?.public_id) {
        done({ ok: true, url: toPlayableUrl(data.secure_url), publicId: data.public_id });
      } else {
        // 4xx = the file/request is the problem; retrying the same thing won't help unless it's a limit/5xx.
        fail(data?.error?.message || '', { status: xhr.status }, xhr.status >= 500 || xhr.status === 429 || xhr.status === 420 || /stale|timestamp|signature/i.test(data?.error?.message || ''));
      }
    };
    xhr.onerror = () => fail('', { kind: navigator.onLine === false ? 'offline' : 'network' });
    xhr.ontimeout = () => fail('', { kind: 'timeout' });
    xhr.onabort = () => fail('', { kind: 'aborted' }, false);
    if (signal) {
      if (signal.aborted) return fail('', { kind: 'aborted' }, false);
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    try {
      xhr.send(formData);
    } catch {
      fail('', { kind: 'network' });
    }
  });
}

// Inserting fl_attachment right after /upload/ in a Cloudinary URL makes
// Cloudinary respond with a Content-Disposition: attachment header --
// this is what actually makes the HTML `download` attribute work at
// all for a cross-origin link like this. Without it, browsers ignore
// `download` on cross-origin URLs unless the response itself says
// "attachment" -- so this isn't cosmetic, it's required for the file to
// download instead of possibly just navigating/opening in a new tab.
// Shared by ClassVideos.jsx (video downloads) and the Installation page
// (the Windows VS Code/Git installers, once hosted on Cloudinary instead
// of committed to the repo -- see the note in lib/installation-content.js
// on why).
export function toCloudinaryDownloadUrl(url) {
  if (!url) return url;
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/fl_attachment/') : url;
}


// A small still frame from a Cloudinary video, used as the <video> poster
// so the page can skip downloading any of the video until Play is
// pressed (preload="none") without showing a blank black box. Cloudinary
// generates the frame on demand from the same public id. Returns
// undefined for anything that isn't a Cloudinary video URL, so callers
// can just pass it straight to `poster`.
export function toCloudinaryPosterUrl(url) {
  if (typeof url !== 'string' || !url.includes('/video/upload/')) return undefined;
  return url
    .replace('/video/upload/', '/video/upload/so_1,w_960,q_auto,f_jpg/')
    .replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg');
}
