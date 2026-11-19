'use client';
import { useEffect, useState } from 'react';

// Keeps the camera zoomed all the way out (phones sometimes start zoomed in), where the browser lets us.
export function zoomOut(stream) {
  try {
    const track = stream?.getVideoTracks?.()[0];
    const cap = track?.getCapabilities?.();
    if (cap?.zoom && typeof cap.zoom.min === 'number') track.applyConstraints({ advanced: [{ zoom: cap.zoom.min }] }).catch(() => {});
  } catch { /* not supported: nothing to do */ }
}

// Checks, on this device only, whether a face is in the picture (Chrome's built-in face detector, where
// the browser has it). Nothing is sent or stored. { supported, missing, close }:
//  - missing: no face seen for about 8 seconds in a row (the student probably left or turned away)
//  - close: the face fills most of the picture (sit back a little)
export function useFacePresence(videoRef, active) {
  const [st, setSt] = useState({ supported: false, missing: false, close: false });
  useEffect(() => {
    if (!active || typeof window === 'undefined' || !('FaceDetector' in window)) { setSt({ supported: false, missing: false, close: false }); return undefined; }
    let det;
    try { det = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 }); } catch { return undefined; }
    let none = 0, busy = false, stopped = false;
    const id = setInterval(async () => {
      const v = videoRef.current;
      if (busy || stopped || !v || !v.videoWidth || v.paused) return;
      busy = true;
      try {
        const faces = await det.detect(v);
        if (stopped) return;
        none = faces.length ? 0 : none + 1;
        const big = faces[0] ? faces[0].boundingBox.width / v.videoWidth > 0.7 : false;
        setSt({ supported: true, missing: none >= 4, close: big });
      } catch { /* detector failed this round */ }
      busy = false;
    }, 2000);
    return () => { stopped = true; clearInterval(id); };
  }, [videoRef, active]);
  return st;
}
