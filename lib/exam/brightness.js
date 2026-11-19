'use client';
import { useEffect, useState } from 'react';

// Measures how bright the camera picture is (0 black .. 255 white) a few times a second on a tiny canvas.
// Nothing is sent or stored. Returns { dark, level } - dark turns true only after several dark readings in a row.
export const DARK_BELOW = 60;

export function useBrightness(videoRef, active) {
  const [state, setState] = useState({ dark: false, level: null });
  useEffect(() => {
    if (!active) { setState({ dark: false, level: null }); return undefined; }
    const c = document.createElement('canvas');
    c.width = 32; c.height = 24;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    let low = 0, high = 0;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth || v.paused) return;
      try {
        ctx.drawImage(v, 0, 0, 32, 24);
        const d = ctx.getImageData(0, 0, 32, 24).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const level = Math.round(sum / (d.length / 4));
        low = level < DARK_BELOW ? low + 1 : 0;
        high = level >= DARK_BELOW + 15 ? high + 1 : 0;
        setState((s) => ({ level, dark: low >= 3 ? true : high >= 2 ? false : s.dark }));
      } catch { /* ignore */ }
    }, 1000);
    return () => clearInterval(id);
  }, [videoRef, active]);
  return state;
}
