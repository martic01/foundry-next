'use client';

import { useEffect, useRef } from 'react';

// A fixed-size image box that never grows/stretches to fit whatever
// image is dropped in -- if the image is taller than the frame, it
// slowly pans from top to bottom on a loop instead, so the whole image
// still gets seen. Ported from the original static-site version (see
// that project's auto-pan.js) since the plain object-contain/cover
// approach either letterboxes or crops portrait images.
export default function AutoPanImage({ src, alt, className = '', frameClassName = '' }) {
  const frameRef = useRef(null);
  const imgRef = useRef(null);
  const cancelledRef = useRef(false);
  const pausedRef = useRef(false);
  const pendingRef = useRef([]); // active timeout ids, so hover can cancel them

  useEffect(() => {
    cancelledRef.current = false;
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function clearPending() {
      pendingRef.current.forEach(clearTimeout);
      pendingRef.current = [];
    }

    function cycle() {
      if (cancelledRef.current || pausedRef.current) return;
      img.style.transition = 'none';
      img.style.transform = 'translateY(0)';
      void img.offsetHeight; // force reflow so the reset actually takes effect

      const renderedH = frame.clientWidth * ((img.naturalHeight / img.naturalWidth) || 1);
      const overflow = Math.round(renderedH - frame.clientHeight);

      if (reduced || !img.naturalWidth || overflow < 4) {
        return; // fits already (or motion is reduced) -- nothing to pan
      }

      const holdMs = 900;
      const panMs = Math.min(6000, Math.max(2200, overflow * 6));

      const t1 = setTimeout(() => {
        if (cancelledRef.current || pausedRef.current) return;
        img.style.transition = `transform ${panMs}ms linear`;
        img.style.transform = `translateY(-${overflow}px)`;
      }, holdMs);
      const t2 = setTimeout(() => {
        if (!cancelledRef.current && !pausedRef.current) cycle();
      }, holdMs + panMs + holdMs);
      pendingRef.current = [t1, t2];
    }

    // Reads the image's CURRENT on-screen Y offset (mid-transition or
    // not) straight from the computed transform matrix, rather than
    // assuming it's at 0 or -overflow -- this is what lets hover freeze
    // it exactly where it is with no visible jump.
    function currentTranslateY() {
      const matrix = window.getComputedStyle(img).transform;
      if (!matrix || matrix === 'none') return 0;
      const match = matrix.match(/matrix\(([^)]+)\)/);
      if (!match) return 0;
      const parts = match[1].split(',').map(Number);
      return parts[5] || 0; // ty is the 6th value in a 2D matrix()
    }

    function pause() {
      if (pausedRef.current) return;
      const y = currentTranslateY();
      clearPending();
      img.style.transition = 'none';
      img.style.transform = `translateY(${y}px)`;
      pausedRef.current = true;
    }

    function resume() {
      if (!pausedRef.current) return;
      pausedRef.current = false;
      const renderedH = frame.clientWidth * ((img.naturalHeight / img.naturalWidth) || 1);
      const overflow = Math.round(renderedH - frame.clientHeight);
      const y = currentTranslateY();

      if (reduced || overflow < 4) return;

      if (y <= -overflow + 1) {
        // Was already at (or essentially at) the bottom when paused --
        // just let the normal loop restart from the top.
        cycle();
        return;
      }
      // Continue the pan from wherever it was frozen, toward the same
      // bottom target, over a proportionally shorter remaining duration.
      const remaining = Math.abs(-overflow - y);
      const panMs = Math.min(6000, Math.max(600, remaining * 6));
      img.style.transition = `transform ${panMs}ms linear`;
      img.style.transform = `translateY(-${overflow}px)`;
      const t = setTimeout(() => {
        if (!cancelledRef.current && !pausedRef.current) cycle();
      }, panMs + 900);
      pendingRef.current = [t];
    }

    frame.addEventListener('mouseenter', pause);
    frame.addEventListener('mouseleave', resume);

    let started = false;
    if (img.complete) {
      started = true;
      cycle();
    } else {
      img.addEventListener('load', () => cycle(), { once: true });
    }

    return () => {
      cancelledRef.current = true;
      clearPending();
      frame.removeEventListener('mouseenter', pause);
      frame.removeEventListener('mouseleave', resume);
    };
  }, [src]);

  return (
    <div ref={frameRef} className={`relative overflow-hidden bg-surfaceMuted ${frameClassName}`}>
      {/* Plain <img>, not next/image -- the pan needs direct control over
          the element's transform, which next/image's wrapper makes
          awkward. These are already-optimized local WebP files. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`absolute left-0 top-0 w-full will-change-transform ${className}`}
      />
    </div>
  );
}
