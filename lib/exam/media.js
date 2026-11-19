// Every camera/microphone stream the exam opens is registered here so it can ALWAYS be switched off
// (exam submitted, auto-submitted, page changed), even if the component that opened it is already gone.
const live = new Set();
export function trackStream(stream) { if (stream) live.add(stream); return stream; }
export function stopStream(stream) {
  try { stream?.getTracks().forEach((t) => { t.onended = null; t.stop(); }); } catch { /* ignore */ }
  live.delete(stream);
}
export function stopAllMedia() { [...live].forEach(stopStream); }

// Camera is always tried first. Only after 3 failed tries is the microphone offered; the choice is remembered for this exam.
export const MAX_CAMERA_TRIES = 3;
const ss = (fn) => { try { return fn(window.sessionStorage); } catch { return null; } };
export const cameraFails = () => Number(ss((s) => s.getItem('exam-cam-fails')) || 0);
export const addCameraFail = () => { const n = cameraFails() + 1; ss((s) => s.setItem('exam-cam-fails', String(n))); return n; };
export const resetCameraFails = () => ss((s) => { s.removeItem('exam-cam-fails'); s.removeItem('exam-media'); });
export const micChosen = () => ss((s) => s.getItem('exam-media')) === 'audio';
export const chooseMic = () => ss((s) => s.setItem('exam-media', 'audio'));
