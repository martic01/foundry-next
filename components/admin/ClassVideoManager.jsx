'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import { Upload, Trash2, Loader2, Play, ChevronUp, Pencil, Check, X, RotateCcw, AlertCircle, Film, CheckCircle2, Clock } from 'lucide-react';
import { uploadClassVideo, checkVideoFile, formatBytes } from '../../lib/cloudinary';
import { addClassVideo, updateClassVideo, deleteClassVideo, discardCloudinaryUpload } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';
import { AudienceSelect, AudienceChip, audienceOf, defaultAudienceFor, iconBtn, dangerBtn, ExpirySelect, ExpiryChip, canModify, ReportButton, ProgressBar, BusyOverlay, CollapsibleCard, ListHeading } from './content-shared';
import SearchBox, { matchesQuery } from '../ui/SearchBox';
import { defaultExpiry, expiryToIso, expiryFromIso } from '../../lib/expiry';

const MAX_AT_ONCE = 2; // simultaneous uploads: fast enough, kind to slow connections
const MAX_FILES = 20;

// "week-3_css flexbox.final.mpeg" -> "week 3 css flexbox final"
const titleFromFile = (name) =>
  String(name || '').replace(/\.[A-Za-z0-9]+$/, '').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

let nextId = 1;

export default function ClassVideoManager({ videos, audienceOptions, viewer = { role: 'admin' } }) {
  const [q, setQ] = useState('');
  const shown = videos.filter((x) => matchesQuery(q, x.title, x.description));
  const [audience, setAudience] = useState(() => defaultAudienceFor(audienceOptions));
  const [description, setDescription] = useState('');
  const [expiry, setExpiry] = useState(defaultExpiry());
  const [items, setItemsState] = useState([]); // the upload queue
  const itemsRef = useRef([]);
  const activeRef = useRef(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // { id, label } for a row being deleted/saved
  const [previewId, setPreviewId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ audience: defaultAudienceFor(audienceOptions), title: '', description: '', expiry: defaultExpiry() });
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef(null);
  const { confirm, alert } = useDialog();

  // ---- upload queue -------------------------------------------------
  // Each file is its own little job with its own try/catch, so one bad
  // file or a dropped connection can only ever fail THAT row.
  const setItems = useCallback((fn) => {
    itemsRef.current = fn(itemsRef.current);
    setItemsState(itemsRef.current);
  }, []);
  const update = useCallback((id, patch) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it))), [setItems]);

  function addFiles(fileList) {
    const picked = Array.from(fileList || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!picked.length) return;
    const room = MAX_FILES - itemsRef.current.length;
    if (room <= 0) return setError(`You can queue up to ${MAX_FILES} videos at a time. Upload these first, then add more.`);
    const fresh = [];
    for (const f of picked.slice(0, room)) {
      const same = (it) => it.file.name === f.name && it.file.size === f.size;
      if (itemsRef.current.some(same) || fresh.some(same)) continue; // already in the list
      const bad = checkVideoFile(f);
      fresh.push({ id: nextId++, file: f, title: titleFromFile(f.name), status: bad ? 'failed' : 'waiting', progress: 0, error: bad || '', retryable: false, result: null, settings: null, abort: null });
    }
    if (picked.length > room) setError(`Only ${room} more video${room === 1 ? '' : 's'} fit in the queue (max ${MAX_FILES}); the rest were left out.`);
    else setError('');
    setItems((list) => [...list, ...fresh]);
  }

  async function runItem(it) {
    const ctl = new AbortController();
    update(it.id, { abort: ctl, error: '' });
    try {
      let result = it.result;
      if (!result) {
        update(it.id, { status: 'uploading', progress: 0 });
        // Straight to Cloudinary from this browser; never throws.
        const up = await uploadClassVideo(it.file, (p) => update(it.id, { progress: p }), it.settings.audience, { signal: ctl.signal });
        const still = itemsRef.current.find((x) => x.id === it.id);
        if (!up.ok) {
          if (still) update(it.id, { status: 'failed', error: up.error, retryable: up.retryable, abort: null });
          return;
        }
        if (!still) { discardCloudinaryUpload(up.publicId).catch(() => {}); return; } // removed while uploading
        result = { url: up.url, publicId: up.publicId };
      }
      // Only the resulting URL gets recorded in our own DB.
      update(it.id, { status: 'saving', progress: 100, result });
      let res;
      try {
        const latest = itemsRef.current.find((x) => x.id === it.id);
        res = await addClassVideo(it.settings.audience, (latest?.title || it.title).trim(), it.settings.description, result.url, result.publicId, it.settings.expiresAt);
      } catch {
        // Couldn't reach our server. The video IS on Cloudinary, so keep it and let Retry just save it.
        update(it.id, { status: 'failed', error: 'The video uploaded, but we couldn’t reach the server to save it (connection problem). Press Retry — it won’t upload again.', retryable: true, abort: null });
        return;
      }
      if (res?.error) {
        // The server said no (e.g. title too long): don't leave an orphan on Cloudinary.
        discardCloudinaryUpload(result.publicId).catch(() => {});
        update(it.id, { status: 'failed', error: `Uploaded, but not saved: ${res.error} Fix it (you can edit the title) and press Retry.`, retryable: true, result: null, abort: null });
        return;
      }
      update(it.id, { status: 'done', error: '', result: null, abort: null });
    } catch {
      // Absolutely nothing escapes to the other rows.
      update(it.id, { status: 'failed', error: 'Something unexpected went wrong with this video. Press Retry. The other videos are not affected.', retryable: true, abort: null });
    }
  }

  function pump() {
    while (activeRef.current < MAX_AT_ONCE) {
      const next = itemsRef.current.find((it) => it.status === 'queued');
      if (!next) return;
      update(next.id, { status: 'uploading' }); // claim it so it isn't picked twice
      activeRef.current += 1;
      runItem({ ...next, status: 'uploading' }).finally(() => {
        activeRef.current -= 1;
        pump();
      });
    }
  }

  function startAll() {
    const exp = expiryToIso(expiry);
    if (exp.error) return setError(exp.error);
    const waiting = itemsRef.current.filter((it) => it.status === 'waiting');
    if (waiting.some((it) => !it.title.trim())) return setError('Every video needs a title — fill in the highlighted one(s).');
    setError('');
    const settings = { audience, description: description.trim(), expiresAt: exp.iso };
    setItems((list) => list.map((it) => (it.status === 'waiting' ? { ...it, status: 'queued', settings } : it)));
    pump();
  }

  function retry(id) {
    const it = itemsRef.current.find((x) => x.id === id);
    if (!it) return;
    if (!it.title.trim()) return update(id, { error: 'Give this video a title first.' });
    let settings = it.settings;
    if (!settings) {
      const exp = expiryToIso(expiry);
      if (exp.error) return setError(exp.error);
      settings = { audience, description: description.trim(), expiresAt: exp.iso };
    }
    update(id, { status: 'queued', error: '', progress: 0, settings });
    pump();
  }

  function retryAllFailed() {
    itemsRef.current.filter((it) => it.status === 'failed' && it.retryable).forEach((it) => retry(it.id));
  }

  function removeItem(id) {
    const it = itemsRef.current.find((x) => x.id === id);
    if (!it) return;
    it.abort?.abort();
    // Uploaded but never saved: don't leave the file behind on Cloudinary.
    if (it.result && it.status === 'failed') discardCloudinaryUpload(it.result.publicId).catch(() => {});
    setItems((list) => list.filter((x) => x.id !== id));
  }

  const clearFinished = () => setItems((list) => list.filter((it) => it.status !== 'done'));

  const counts = items.reduce((c, it) => ({ ...c, [it.status]: (c[it.status] || 0) + 1 }), {});
  const working = (counts.uploading || 0) + (counts.queued || 0) + (counts.saving || 0);
  const failedRetryable = items.filter((it) => it.status === 'failed' && it.retryable).length;

  // Closing the tab mid-upload would silently lose the videos still going.
  useEffect(() => {
    if (!working) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [working]);

  function run(action, onOk, ...args) {
    startTransition(async () => {
      try {
        const res = await action(...args);
        if (res?.error) setError(res.error);
        else {
          setError('');
          onOk?.();
          if (res?.warning) alert({ title: 'Check Cloudinary', message: res.warning, tone: 'error' });
        }
      } catch {
        setError('Couldn\u2019t reach the server. Check your internet connection and try again.');
      } finally {
        setBusy(null);
      }
    });
  }

  function saveEdit(v) {
    const e = expiryToIso(draft.expiry);
    if (e.error) return setError(e.error);
    setBusy({ id: v.id, label: 'Saving…' });
    run(updateClassVideo, () => setEditingId(null), v.id, { audience: draft.audience, title: draft.title, description: draft.description, expiresAt: e.iso });
  }

  async function handleDelete(v) {
    const who = v.batch_id ? 'the students in that batch' : 'all students';
    const ok = await confirm({
      title: `Delete \u201c${v.title}\u201d?`,
      message: `It disappears immediately for ${who}. The video file is also deleted from Cloudinary, and this can\u2019t be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (ok) {
      setBusy({ id: v.id, label: 'Deleting video…' });
      run(deleteClassVideo, null, v.id);
    }
  }

  return (
    <div>
      <CollapsibleCard
        title="Upload class videos"
        hint="Add one or many videos at once"
        icon={<Upload className="h-4 w-4" />}
        badge={working ? `${working} uploading` : counts.failed ? `${counts.failed} failed` : null}
      >
      <div className="flex flex-col gap-2">
        <p className="text-xs text-inkdim">Pick one or many videos (MP4, MOV, MPEG and more). They upload two at a time; if one fails, the others carry on.</p>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description for these videos (optional)" rows={2} className="field resize-none" />
        <AudienceSelect value={audience} onChange={setAudience} options={audienceOptions} />
        <ExpirySelect value={expiry} onChange={setExpiry} />
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line bg-surface px-4 py-5 text-center text-xs text-inkdim transition hover:border-brand hover:text-ink">
          <Upload className="h-5 w-5 text-brand" />
          <span className="font-medium text-ink">Choose videos</span>
          <span>You can select several at once</span>
          <input ref={fileInputRef} type="file" accept="video/*,.mpeg,.mpg,.mpe,.m2v,.mkv,.avi,.wmv,.flv,.ts,.3gp" multiple onChange={(e) => addFiles(e.target.files)} className="sr-only" />
        </label>

        {items.length > 0 && (
          <ul className="mt-1 flex flex-col gap-2" aria-live="polite">
            {items.map((it) => (
              <li key={it.id} data-status={it.status} className={`row-in rounded-lg border bg-surface p-3 ${it.status === 'failed' ? 'border-red-300' : it.status === 'done' ? 'border-green-300' : 'border-line'}`}>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0">
                    {it.status === 'done' ? <CheckCircle2 className="pop-check h-4 w-4 text-green-600" />
                      : it.status === 'failed' ? <AlertCircle className="h-4 w-4 text-red-600" />
                      : it.status === 'uploading' || it.status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin text-brand" />
                      : it.status === 'queued' ? <Clock className="h-4 w-4 text-inkdim" />
                      : <Film className="h-4 w-4 text-inkdim" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {it.status === 'waiting' || it.status === 'failed' ? (
                      <input
                        value={it.title}
                        onChange={(e) => update(it.id, { title: e.target.value })}
                        placeholder="Video title"
                        aria-label={`Title for ${it.file.name}`}
                        className={`field !py-1.5 text-sm ${!it.title.trim() ? 'border-red-400' : ''}`}
                      />
                    ) : (
                      <p className="truncate text-sm font-medium text-ink">{it.title}</p>
                    )}
                    <p className="mt-0.5 truncate text-[11px] text-inkdim">
                      {it.file.name} · {formatBytes(it.file.size)}
                      {it.status === 'queued' && ' · waiting for a free slot'}
                      {it.status === 'uploading' && ` · uploading ${it.progress}%`}
                      {it.status === 'saving' && ' · saving…'}
                      {it.status === 'done' && ' · uploaded and shared'}
                    </p>
                    {(it.status === 'uploading' || it.status === 'saving') && (
                      <div className="mt-2"><ProgressBar value={it.progress} indeterminate={it.status === 'saving' || it.progress >= 100} /></div>
                    )}
                    {it.status === 'failed' && it.error && <p className="mt-1.5 text-xs leading-relaxed text-red-700">{it.error}</p>}
                  </div>
                  <div className="flex flex-shrink-0 gap-1.5">
                    {it.status === 'failed' && it.retryable && (
                      <button type="button" onClick={() => retry(it.id)} className={iconBtn} aria-label={`Retry ${it.file.name}`} title="Retry">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {it.status !== 'saving' && it.status !== 'done' && (
                      <button type="button" onClick={() => removeItem(it.id)} className={iconBtn} aria-label={it.status === 'uploading' ? `Cancel ${it.file.name}` : `Remove ${it.file.name}`} title={it.status === 'uploading' ? 'Cancel' : 'Remove'}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {counts.waiting > 0 && (
              <button type="button" onClick={startAll} className="cta-btn !px-4 !py-2 text-xs">
                <Upload className="h-3.5 w-3.5" /> Upload {counts.waiting} video{counts.waiting === 1 ? '' : 's'}
              </button>
            )}
            {failedRetryable > 1 && (
              <button type="button" onClick={retryAllFailed} className="cta-btn-outline !px-4 !py-2 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Retry {failedRetryable} failed
              </button>
            )}
            {counts.done > 0 && (
              <button type="button" onClick={clearFinished} className="text-xs text-inkdim underline-offset-2 hover:underline">Clear finished</button>
            )}
            <span className="ml-auto text-[11px] text-inkdim">
              {[working ? `${working} in progress` : '', counts.done ? `${counts.done} done` : '', counts.failed ? `${counts.failed} failed` : ''].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
      </div>
      </CollapsibleCard>
      {error && <p className="-mt-3 mb-4 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{error}</p>}

      <ListHeading count={videos.length}>Uploaded videos</ListHeading>
      {videos.length > 3 && <SearchBox value={q} onChange={setQ} placeholder="Search videos by title or description" className="mb-3" />}
      {!videos.length ? (
        <p className="text-sm text-inkdim">No class videos here yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {!shown.length && <p className="p-3 text-sm text-inkdim">Nothing matches “{q}”.</p>}
          {shown.map((v) =>
            editingId === v.id ? (
              <div key={v.id} className="relative flex flex-col gap-3 p-3">
                {busy?.id === v.id && <BusyOverlay label={busy.label} />}
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="field" disabled={isPending} />
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} placeholder="Description (optional)" className="field resize-none" disabled={isPending} />
                <AudienceSelect value={draft.audience} onChange={(a) => setDraft({ ...draft, audience: a })} options={audienceOptions} disabled={isPending} />
                <ExpirySelect value={draft.expiry} onChange={(x) => setDraft({ ...draft, expiry: x })} disabled={isPending} />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(v)} disabled={isPending || !draft.title.trim()} className="cta-btn !px-4 !py-2 text-xs">
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)} disabled={isPending} className="cta-btn-outline !px-4 !py-2 text-xs">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={v.id} className="relative p-3">
                {busy?.id === v.id && <BusyOverlay label={busy.label} />}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink">{v.title}</p>
                      <AudienceChip batchId={v.batch_id} options={audienceOptions} />
                      <ExpiryChip item={v} />
                      {!canModify(viewer, v, 'created_by') && <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-inkdim">Posted by staff</span>}
                    </div>
                    {v.description && <p className="truncate text-xs text-inkdim">{v.description}</p>}
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button onClick={() => setPreviewId(previewId === v.id ? null : v.id)} className={iconBtn} aria-label={previewId === v.id ? 'Hide preview' : 'Preview video'}>
                      {previewId === v.id ? <ChevronUp className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    {canModify(viewer, v, 'created_by') ? (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(v.id);
                            setDraft({ audience: audienceOf(v), title: v.title, description: v.description || '', expiry: expiryFromIso(v.expires_at) });
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
                      </>
                    ) : (
                      <ReportButton kind="video" itemId={v.id} />
                    )}
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
