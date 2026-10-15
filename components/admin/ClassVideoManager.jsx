'use client';

import { useState, useTransition, useRef } from 'react';
import { Upload, Trash2, Loader2, Play, ChevronUp, Pencil, Check, X } from 'lucide-react';
import { uploadClassVideo } from '../../lib/cloudinary';
import { addClassVideo, updateClassVideo, deleteClassVideo, discardCloudinaryUpload } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';
import { AudienceSelect, AudienceChip, audienceOf, defaultAudienceFor, iconBtn, dangerBtn } from './content-shared';

export default function ClassVideoManager({ videos, audienceOptions }) {
  const [audience, setAudience] = useState(() => defaultAudienceFor(audienceOptions));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewId, setPreviewId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ audience: defaultAudienceFor(audienceOptions), title: '', description: '' });
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef(null);
  const { confirm, alert } = useDialog();

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
      const res = await addClassVideo(audience, title.trim(), description.trim(), url, publicId);
      if (res?.error) {
        setError(res.error);
        // Don't leave the just-uploaded file orphaned on Cloudinary.
        discardCloudinaryUpload(publicId).catch(() => {});
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

  function run(action, onOk, ...args) {
    startTransition(async () => {
      const res = await action(...args);
      if (res?.error) setError(res.error);
      else {
        setError('');
        onOk?.();
        if (res?.warning) alert({ title: 'Check Cloudinary', message: res.warning, tone: 'error' });
      }
    });
  }

  async function handleDelete(v) {
    const who = v.batch_id ? 'the students in that batch' : 'all students';
    const ok = await confirm({
      title: `Delete \u201c${v.title}\u201d?`,
      message: `It disappears immediately for ${who}. The video file is also deleted from Cloudinary, and this can\u2019t be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (ok) run(deleteClassVideo, null, v.id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-2 rounded-lg border border-line bg-surfaceMuted p-4">
        <p className="text-sm font-semibold text-ink">Upload a class video</p>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Video title (e.g. "Week 3 — CSS Flexbox")' className="field" disabled={uploading} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="field resize-none" disabled={uploading} />
        <AudienceSelect value={audience} onChange={setAudience} options={audienceOptions} disabled={uploading} />
        <input ref={fileInputRef} type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading} className="text-xs text-inkdim" />
        <button onClick={handleUpload} disabled={uploading || !file || !title.trim()} className="cta-btn mt-1 w-fit !px-4 !py-2 text-xs">
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

      {!videos.length ? (
        <p className="text-sm text-inkdim">No class videos here yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {videos.map((v) =>
            editingId === v.id ? (
              <div key={v.id} className="flex flex-col gap-3 p-3">
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="field" disabled={isPending} />
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} placeholder="Description (optional)" className="field resize-none" disabled={isPending} />
                <AudienceSelect value={draft.audience} onChange={(a) => setDraft({ ...draft, audience: a })} options={audienceOptions} disabled={isPending} />
                <div className="flex gap-2">
                  <button onClick={() => run(updateClassVideo, () => setEditingId(null), v.id, draft)} disabled={isPending || !draft.title.trim()} className="cta-btn !px-4 !py-2 text-xs">
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)} disabled={isPending} className="cta-btn-outline !px-4 !py-2 text-xs">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={v.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink">{v.title}</p>
                      <AudienceChip batchId={v.batch_id} options={audienceOptions} />
                    </div>
                    {v.description && <p className="truncate text-xs text-inkdim">{v.description}</p>}
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button onClick={() => setPreviewId(previewId === v.id ? null : v.id)} className={iconBtn} aria-label={previewId === v.id ? 'Hide preview' : 'Preview video'}>
                      {previewId === v.id ? <ChevronUp className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(v.id);
                        setDraft({ audience: audienceOf(v), title: v.title, description: v.description || '' });
                      }}
                      disabled={isPending}
                      className={iconBtn}
                      aria-label="Edit video"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(v)} disabled={isPending} className={dangerBtn} aria-label="Delete video">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {previewId === v.id && <video controls autoPlay className="mt-3 w-full rounded-lg border border-line bg-black" src={v.cloudinary_url} />}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
