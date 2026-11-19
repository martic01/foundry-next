'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize, Video, Mic, CheckCircle2, Circle, Loader2, Play, X } from 'lucide-react';
import { useBrightness } from '../../lib/exam/brightness';
import { useFacePresence, zoomOut } from '../../lib/exam/face';
import { trackStream, stopStream, MAX_CAMERA_TRIES, cameraFails, addCameraFail, resetCameraFails, chooseMic } from '../../lib/exam/media';

// Pre-flight check BEFORE the exam starts (so no exam time is spent on set-up):
// full screen, camera (or microphone if the camera does not work). The Start button only unlocks when it all works.
export default function ExamSetup({ hours, onStart, onCancel, busy }) {
  const [fs, setFs] = useState(false);
  const [mode, setMode] = useState('idle'); // idle | testing | video | audio | failed
  const [level, setLevel] = useState(0);
  const [err, setErr] = useState('');
  const [fails, setFails] = useState(0);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const ctxRef = useRef(null);
  const timer = useRef(null);
  const alive = useRef(true);

  const stop = () => {
    clearInterval(timer.current);
    try { ctxRef.current?.close(); } catch { /* ignore */ }
    ctxRef.current = null;
    stopStream(streamRef.current); streamRef.current = null;
  };
  useEffect(() => {
    alive.current = true;
    resetCameraFails(); // a fresh exam: the camera is tried first again
    const on = () => setFs(!!document.fullscreenElement || !document.documentElement.requestFullscreen);
    on();
    document.addEventListener('fullscreenchange', on);
    return () => { alive.current = false; document.removeEventListener('fullscreenchange', on); stop(); };
  }, []);
  useEffect(() => { if (mode === 'video' && videoRef.current && streamRef.current) { videoRef.current.srcObject = streamRef.current; videoRef.current.play?.().catch(() => {}); } }, [mode]);

  async function test(audioOnly) {
    stop(); setErr(''); setMode('testing');
    if (!navigator.mediaDevices?.getUserMedia) { setErr('This browser cannot use the camera or microphone.'); setMode('failed'); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia(audioOnly ? { audio: true } : { video: { width: { ideal: 640 }, height: { ideal: 480 }, aspectRatio: { ideal: 4 / 3 }, facingMode: 'user' }, audio: true });
      if (!alive.current) { stopStream(trackStream(s)); return; }
      trackStream(s); streamRef.current = s;
      if (!audioOnly) zoomOut(s);
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ctx = new AC(); ctxRef.current = ctx;
        const an = ctx.createAnalyser(); an.fftSize = 256;
        ctx.createMediaStreamSource(s).connect(an);
        const d = new Uint8Array(an.frequencyBinCount);
        timer.current = setInterval(() => { an.getByteFrequencyData(d); setLevel(Math.min(100, Math.round((d.reduce((a, b) => a + b, 0) / d.length) * 1.6))); }, 200);
      } catch { /* meter optional */ }
      if (!audioOnly && !s.getVideoTracks().length) { stopStream(s); streamRef.current = null; throw Object.assign(new Error('no video'), { name: 'NotFoundError' }); }
      if (!audioOnly) { resetCameraFails(); setFails(0); }
      setMode(audioOnly ? 'audio' : 'video');
    } catch (e) {
      if (!audioOnly) setFails(addCameraFail());
      setErr(e?.name === 'NotAllowedError' ? 'Access was blocked. Allow the camera and microphone for this site in your browser settings, then try again.' : 'No working camera or microphone was found.');
      setMode('failed');
    }
  }
  const enterFs = () => document.documentElement.requestFullscreen?.().catch(() => {});
  const mediaOk = mode === 'video' || mode === 'audio';
  const light = useBrightness(videoRef, mode === 'video');
  const face = useFacePresence(videoRef, mode === 'video');
  const ready = fs && mediaOk;
  const Row = ({ ok, children }) => <li className="flex items-start gap-2 text-sm">{ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-inkdim" />}<span className={ok ? 'text-ink' : 'text-inkdim'}>{children}</span></li>;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Exam set-up">
      <div className="my-auto w-full max-w-lg rounded-lg border border-line bg-surface p-5 shadow-xl sm:p-6">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Set up your exam</h2>
          <button type="button" onClick={() => { stop(); onCancel(); }} aria-label="Cancel" className="rounded p-1 text-inkdim hover:bg-surfaceMuted"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-4 text-sm text-inkdim">Your {hours} only start when you press Start below. Finish these checks first. The questions and timer stay hidden until everything works.</p>
        <ul className="mb-4 space-y-2">
          <Row ok={fs}>Full screen is on</Row>
          <Row ok={mediaOk}>{mode === 'video' ? 'Camera and microphone are working' : mode === 'audio' ? 'Microphone is working (voice will be recorded)' : 'Camera is connected'}</Row>
        </ul>

        {!fs && <button type="button" onClick={enterFs} className="cta-btn mb-3 w-full justify-center"><Maximize className="h-4 w-4" /> Turn on full screen</button>}
        {!mediaOk && (fails >= MAX_CAMERA_TRIES ? (
          <div className="mb-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
            <p className="mb-2 text-sm text-ink">We could not connect to your camera after {MAX_CAMERA_TRIES} tries. Please switch to your microphone instead. Your voice will be recorded while you write.</p>
            <button type="button" onClick={() => { chooseMic(); test(true); }} disabled={mode === 'testing'} className="cta-btn w-full justify-center"><Mic className="h-4 w-4" /> Switch to microphone</button>
          </div>
        ) : (
          <div className="mb-3">
            <button type="button" onClick={() => test(false)} disabled={mode === 'testing'} className="cta-btn w-full justify-center">{mode === 'testing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />} {fails ? 'Try camera again' : 'Allow camera and microphone'}</button>
            {fails > 0 && <p className="mt-1.5 text-xs text-inkdim">Camera try {fails} of {MAX_CAMERA_TRIES} failed.</p>}
          </div>
        ))}
        {err && <p role="alert" className="mb-3 text-sm font-medium text-red-600">{err}</p>}
        {mode === 'video' && <video ref={videoRef} muted playsInline autoPlay className="mb-3 aspect-[4/3] w-full -scale-x-100 rounded-md bg-black object-cover" />}
        {mode === 'video' && face.missing && (
          <p role="alert" className="mb-3 rounded-md border border-red-500/60 bg-red-100 px-3 py-2 text-sm font-semibold text-red-900 dark:bg-red-950/60 dark:text-red-100">We cannot see your face. Sit in front of the camera so your face is clearly visible.</p>
        )}
        {mode === 'video' && !face.missing && face.close && (
          <p className="mb-3 rounded-md border border-amber-500/60 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">You are very close to the camera. Sit back a little so your whole face fits.</p>
        )}
        {mode === 'video' && light.dark && (
          <p role="alert" className="mb-3 rounded-md border border-amber-500/60 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">Your room looks too dark. Please move to a brighter place or switch on a light so your face is clearly visible. Pictures that are too dark may be flagged.</p>
        )}
        {mode === 'video' && light.level !== null && !light.dark && (
          <p className="mb-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">Lighting is good.</p>
        )}
        {mediaOk && (
          <div className="mb-3">
            <p className="mb-1 text-xs text-inkdim">Say something: the bar should move.</p>
            <div className="h-2 overflow-hidden rounded bg-surfaceMuted"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${level}%` }} /></div>
          </div>
        )}
        <p className="mb-4 text-xs text-inkdim">A small picture from your camera is taken every 10 minutes (or short voice recordings if you use the microphone). Only the school sees them, and they are deleted soon after you pass. Leaving full screen or switching apps is a violation; 3 violations submit your exam.</p>
        <button type="button" disabled={!ready || busy} onClick={() => { stop(); onStart(); }} className="cta-btn w-full justify-center disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {ready ? 'Start exam now' : 'Finish the checks above to start'}
        </button>
      </div>
    </div>
  );
}
