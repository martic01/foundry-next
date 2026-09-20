'use client';

import { useState, useTransition, useRef } from 'react';
import { Upload, Trash2, Loader2, Play, ChevronUp } from 'lucide-react';
import { uploadClassVideo } from '../../lib/cloudinary';
import { addClassVideo, deleteClassVideo } from '../../app/admin/actions';

export default function ClassVideoManager({ batchId, videos }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewId, setPreviewId] = useState(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef(null);

  async function handleUpload() {
    if (!file || !title.trim()) return;
    setError('');
    setUploading(true);
    setProgress(0);
    try {
      // 1. Straight to Cloudinary from this browser -- see
      // lib/cloudinary.js for why this never touches our own server.
      const { url, publicId } = await uploadClassVideo(file, setProgress);
      // 2. Only the resulting URL gets recorded in our own DB.
      const res = await addClassVideo(batchId, title.trim(), description.trim(), url, publicId);
      if (res?.error) {
        setError(res.error);
      } else {
        setTitle('');
        setDescription('');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(videoId) {
    startTransition(async () => {
      const res = await deleteClassVideo(videoId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">Class videos</p>

      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-line bg-surfaceMuted p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Video title (e.g. "Week 3 -- CSS Flexbox")'
          className="field"
          disabled={uploading}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="field resize-none"
          disabled={uploading}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={uploading}
          className="text-xs text-inkdim"
        />
        <button
          onClick={handleUpload}
          disabled={uploading || !file || !title.trim()}
          className="cta-btn mt-1 w-fit !px-4 !py-2 text-xs"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading {progress}%
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" /> Upload video
            </>
          )}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {!!videos.length && (
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {videos.map((v) => (
            <div key={v.id} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{v.title}</p>
                  {v.description && <p className="truncate text-xs text-inkdim">{v.description}</p>}
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => setPreviewId(previewId === v.id ? null : v.id)}
                    className="rounded-md border border-line p-1.5 text-inkdim hover:border-brand/40 hover:text-brand"
                    aria-label={previewId === v.id ? 'Hide preview' : 'Preview video'}
                  >
                    {previewId === v.id ? <ChevronUp className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    disabled={isPending}
                    className="rounded-md border border-line p-1.5 text-inkdim hover:border-red-300 hover:text-red-600"
                    aria-label="Delete video"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {previewId === v.id && (
                <video controls autoPlay className="mt-3 w-full rounded-lg border border-line bg-black" src={v.cloudinary_url} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
