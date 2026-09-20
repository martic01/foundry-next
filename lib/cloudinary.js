// Uploads straight from the browser to Cloudinary -- the file never
// passes through our own server, which is the whole point (keeps large
// video files off Supabase/our own bandwidth). This uses an UNSIGNED
// upload preset, which is Cloudinary's supported way to let a browser
// upload directly without exposing your API secret: the preset name and
// cloud name are meant to be public (they're in NEXT_PUBLIC_ env vars on
// purpose), but a preset can still be restricted server-side in your
// Cloudinary dashboard (e.g. to video files only, with a max size) so
// this isn't "anyone with the URL can upload anything."
//
// Requires two env vars:
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME  -- from your Cloudinary dashboard
//   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET -- an UNSIGNED preset you create
//     in Cloudinary: Settings -> Upload -> Upload presets -> Add upload
//     preset -> Signing Mode: Unsigned. Restrict it to video there too.
export async function uploadClassVideo(file, onProgress) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary isn\u2019t configured yet -- set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  // Plain fetch has no upload-progress event, so this uses XHR instead --
  // that's the only reason XHR appears here rather than fetch.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: data.secure_url, publicId: data.public_id });
        } else {
          reject(new Error(data.error?.message || 'Upload to Cloudinary failed.'));
        }
      } catch {
        reject(new Error('Unexpected response from Cloudinary.'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error while uploading to Cloudinary.'));
    xhr.send(formData);
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
