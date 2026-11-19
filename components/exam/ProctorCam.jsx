'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Video, Mic, ShieldAlert, Loader2 } from 'lucide-react';
import { useBrightness } from '../../lib/exam/brightness';
import { useFacePresence, zoomOut } from '../../lib/exam/face';
import { EXAM_RULES } from '../../lib/exam/config';
import { trackStream, stopStream, MAX_CAMERA_TRIES, cameraFails, addCameraFail, resetCameraFails, micChosen, chooseMic } from '../../lib/exam/media';

// Candidate monitoring during the exam. The student sees their own camera in a small window.
//  - With a camera: a small snapshot is taken every 10 minutes and sent to the school.
//  - Without a working camera: the microphone is used instead (short voice clips, with a live level bar).
// Uploads are best-effort: a failed upload never affects the exam. Nothing starts until the person allows access,
// and the exam stays covered until they do. `paused` stops everything once the exam is being submitted.
const PHOTO_EVERY_MS = 10 * 60 * 1000; // one picture every 10 minutes (plus one at the start)
const CLIP_MS = 30000;

export default function ProctorCam({ attemptId, paused = false, onLive }) {
  const [mode, setMode] = useState('starting'); // starting | video | audio | blocked
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState('');
  const [fails, setFails] = useState(0);
  const [desktop, setDesktop] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 700px)').matches : true));
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 700px)');
    const f = () => setDesktop(mq.matches);
    f();
    mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', f) : mq.removeListener(f); };
  }, []);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const timers = useRef([]);
  const recRef = useRef(null);
  const ctxRef = useRef(null);
  const alive = useRef(true);
  const boxRef = useRef(null);
  const [pos, setPos] = useState(() => { try { return JSON.parse(sessionStorage.getItem('exam-cam-pos') || 'null'); } catch { return null; } }); // null = default corner

  const upload = useCallback(async (kind, blob) => {
    try {
      const fd = new FormData();
      fd.append('attemptId', attemptId); fd.append('kind', kind); fd.append('file', blob, kind === 'photo' ? 'p.jpg' : 'a.webm');
      await fetch('/api/exams/proof', { method: 'POST', body: fd, keepalive: false });
    } catch { /* offline: skip this one */ }
  }, [attemptId]);

  const stopAll = useCallback(() => {
    timers.current.forEach((t) => { clearInterval(t); clearTimeout(t); }); timers.current = [];
    try { recRef.current?.state === 'recording' && recRef.current.stop(); } catch { /* ignore */ }
    recRef.current = null;
    try { ctxRef.current?.close(); } catch { /* ignore */ }
    ctxRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
  }, []);

  const snap = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = 320; c.height = Math.round((320 * v.videoHeight) / v.videoWidth) || 240;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => { if (b) upload('photo', b); }, 'image/jpeg', 0.55);
  }, [upload]);

  const watchEnded = (stream) => {
    stream.getTracks().forEach((t) => { t.onended = () => { setNote('Your camera or microphone was turned off.'); stopAll(); setMode('blocked'); }; });
  };

  const startAudio = useCallback((stream) => {
    // Live level bar so the student can see the microphone is working.
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC(); ctxRef.current = ctx;
      const an = ctx.createAnalyser(); an.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      timers.current.push(setInterval(() => { an.getByteFrequencyData(data); setLevel(Math.min(100, Math.round((data.reduce((a, b) => a + b, 0) / data.length) * 1.6))); }, 200));
    } catch { /* meter is optional */ }
    // Independent 30-second clips (each one is a playable file on its own).
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => window.MediaRecorder?.isTypeSupported?.(m));
    if (!window.MediaRecorder) return;
    const record = () => {
      if (!streamRef.current) return;
      const chunks = [];
      const rec = new MediaRecorder(new MediaStream(stream.getAudioTracks()), mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 });
      recRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
      rec.onstop = () => { if (chunks.length) upload('audio', new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); if (streamRef.current) record(); };
      rec.start();
      timers.current.push(setTimeout(() => { try { rec.state === 'recording' && rec.stop(); } catch { /* ignore */ } }, CLIP_MS));
    };
    record();
  }, [upload]);

  const start = useCallback(async (audioOnly = false) => {
    stopAll(); setNote(''); setMode('starting');
    if (!navigator.mediaDevices?.getUserMedia) { setNote('This browser cannot use the camera or microphone.'); setMode('blocked'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(audioOnly
        ? { audio: true }
        : { video: { width: { ideal: 640 }, height: { ideal: 480 }, aspectRatio: { ideal: 4 / 3 }, facingMode: 'user' }, audio: true });
      if (!alive.current) { stopStream(trackStream(stream)); return; } // the exam ended while the browser was still asking
      trackStream(stream); streamRef.current = stream; watchEnded(stream);
      if (!audioOnly && !stream.getVideoTracks().length) { stopStream(stream); streamRef.current = null; throw Object.assign(new Error('no video'), { name: 'NotFoundError' }); }
      if (!audioOnly) {
        zoomOut(stream);
        resetCameraFails(); setFails(0);
        setMode('video');
        timers.current.push(setTimeout(snap, 5000), setInterval(snap, PHOTO_EVERY_MS));
      } else { setMode('audio'); startAudio(stream); }
    } catch (e) {
      if (!audioOnly) setFails(addCameraFail());
      setNote(e?.name === 'NotAllowedError' ? 'Access was blocked. Allow the camera and microphone for this site in your browser, then try again.' : 'No working camera or microphone was found.');
      setMode('blocked');
    }
  }, [snap, startAudio, stopAll]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { alive.current = true; setFails(cameraFails()); start(micChosen()); return () => { alive.current = false; stopAll(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (paused) stopAll(); }, [paused, stopAll]);
  useEffect(() => { if (mode === 'video' && videoRef.current && streamRef.current) { videoRef.current.srcObject = streamRef.current; videoRef.current.play?.().catch(() => {}); } }, [mode]);

  // A phone switches the camera off when the app is left. When the student comes back, turn it on again by itself.
  useEffect(() => {
    const back = () => {
      if (document.visibilityState !== 'visible' || paused || !alive.current) return;
      const tracks = streamRef.current?.getTracks?.() || [];
      if (mode !== 'blocked' && tracks.length && tracks.every((t) => t.readyState === 'live')) return;
      start(micChosen());
    };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [mode, paused, start]);

  const live = mode === 'video' || mode === 'audio';
  const light = useBrightness(videoRef, mode === 'video' && !paused);
  const face = useFacePresence(videoRef, mode === 'video' && !paused);
  useEffect(() => { onLive?.(live && !paused); }, [live, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mobile: drag the window with a finger. It can never leave the screen: every position is clamped, also after rotating the phone.
  const drag = useRef(null);
  const clamp = useCallback((x, y) => {
    const el = boxRef.current;
    const w = el?.offsetWidth || 160, h = el?.offsetHeight || 140;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight;
    return { x: Math.round(Math.min(Math.max(0, x), Math.max(0, vw - w))), y: Math.round(Math.min(Math.max(0, y), Math.max(0, vh - h))) };
  }, []);
  const down = (e) => {
    if (desktop) return;
    const r = boxRef.current.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => { if (drag.current) setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy)); };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    setPos((p) => { try { p && sessionStorage.setItem('exam-cam-pos', JSON.stringify(p)); } catch { /* ignore */ } return p; });
  };
  // Keep it on screen when the screen changes (rotation, address bar, keyboard) or its own size changes (camera loads).
  useEffect(() => {
    if (desktop) return undefined;
    const fix = () => setPos((p) => { if (!p) return p; const n = clamp(p.x, p.y); return n.x === p.x && n.y === p.y ? p : n; });
    fix();
    window.addEventListener('resize', fix); window.addEventListener('orientationchange', fix);
    window.visualViewport?.addEventListener('resize', fix);
    const ro = typeof ResizeObserver !== 'undefined' && boxRef.current ? new ResizeObserver(fix) : null;
    ro?.observe(boxRef.current);
    return () => { window.removeEventListener('resize', fix); window.removeEventListener('orientationchange', fix); window.visualViewport?.removeEventListener('resize', fix); ro?.disconnect(); };
  }, [desktop, clamp, mode]);

  return (
    <>
      <div ref={boxRef} style={!desktop && pos ? { left: pos.x, top: pos.y } : undefined}
        className={desktop
          ? 'w-full overflow-hidden rounded-lg border border-line bg-surface'
          : `fixed z-[60] w-40 overflow-hidden rounded-md border border-line bg-surface shadow-xl ${pos ? '' : 'bottom-4 right-3'}`}>
        <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={desktop ? undefined : { touchAction: 'none' }}
          className={`flex items-center justify-between gap-2 whitespace-nowrap border-b border-line bg-surfaceMuted px-2.5 py-1.5 text-[11px] font-medium text-inkdim ${desktop ? '' : 'cursor-grab active:cursor-grabbing'}`} title={desktop ? undefined : 'Drag to move'}>
          <span>{desktop ? 'Monitoring' : '⠿ Monitoring'}</span>
          <span className={`inline-flex items-center gap-1 ${live ? 'text-red-600' : ''}`}><span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse bg-red-600' : 'bg-inkdim'}`} />{mode === 'video' ? 'Camera on' : mode === 'audio' ? 'Mic on' : 'Off'}</span>
        </div>
        {mode === 'video' && (
          <>
            <video ref={videoRef} muted playsInline autoPlay className="aspect-[4/3] w-full -scale-x-100 bg-black object-cover" />
            {face.missing && <p role="alert" className="border-t border-red-500/60 bg-red-100 px-2 py-1.5 text-[11px] font-bold leading-snug text-red-900 dark:bg-red-950/60 dark:text-red-100">We cannot see your face. Sit in front of the camera so your face is clearly visible.</p>}
            {!face.missing && face.close && <p className="border-t border-amber-500/60 bg-amber-100 px-2 py-1.5 text-[11px] font-medium leading-snug text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">Sit back a little so your whole face fits.</p>}
            {light.dark && <p role="alert" className="border-t border-amber-500/60 bg-amber-100 px-2 py-1.5 text-[11px] font-medium leading-snug text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">Too dark. Move to a brighter place so your face is visible.</p>}
          </>
        )}
        {mode === 'audio' && (
          <div className="space-y-2 p-3 text-center">
            <Mic className="mx-auto h-6 w-6 text-ink" />
            <div className="h-1.5 overflow-hidden rounded bg-surfaceMuted"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${level}%` }} /></div>
            <p className="text-[11px] text-inkdim">Your microphone is on and your voice is being recorded.</p>
          </div>
        )}
        {mode === 'starting' && <div className="flex aspect-[4/3] items-center justify-center text-inkdim"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {mode === 'blocked' && <div className="flex aspect-[4/3] items-center justify-center p-2 text-center"><Video className="h-5 w-5 text-inkdim" /></div>}
      </div>

      {mode === 'blocked' && !paused && (
        <div className="fixed inset-0 z-[415] flex items-center justify-center bg-black/80 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-lg border border-line bg-surface p-6 text-center shadow-xl">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-ink" />
            <h2 className="mb-2 text-lg font-semibold text-ink">Camera or microphone needed</h2>
            <p className="mb-2 text-sm text-inkdim">This exam is monitored. Your camera is used to take small pictures while you write. Allow your camera and microphone to continue.</p>
            <p className="mb-4 text-xs text-inkdim">Pictures and recordings are seen only by the school and deleted soon after you pass (and in any case within the period the school sets). The exam timer keeps running.</p>
            {note && <p role="alert" className="mb-3 text-sm font-medium text-red-600">{note}</p>}
            {fails >= MAX_CAMERA_TRIES ? (
              <>
                <p className="mb-3 text-sm font-medium text-ink">We could not connect to your camera after {MAX_CAMERA_TRIES} tries. Please switch to your microphone instead; your voice will be recorded.</p>
                <button type="button" onClick={() => { chooseMic(); start(true); }} className="cta-btn w-full justify-center"><Mic className="h-4 w-4" /> Switch to microphone</button>
              </>
            ) : (
              <>
                {fails > 0 && <p className="mb-3 text-xs text-inkdim">Camera try {fails} of {MAX_CAMERA_TRIES} failed.</p>}
                <button type="button" onClick={() => start(false)} className="cta-btn w-full justify-center"><Video className="h-4 w-4" /> {fails ? 'Try camera again' : 'Allow camera and microphone'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
