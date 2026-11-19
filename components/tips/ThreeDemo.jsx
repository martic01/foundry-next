'use client';

import { useEffect, useRef, useState } from 'react';
import { BUILDERS } from './threeRunners';
import { reducedMotion, StageMessage } from './Stage';

// A small Three.js scene. Three.js itself (a big library) is only downloaded when this card is first on screen.
// When the card leaves the screen the WebGL context is released, so five scenes never hold five contexts at once.
export default function ThreeDemo({ id, active }) {
  const box = useRef(null);
  const run = useRef({ renderer: null, scene: null, camera: null, update: null, THREE: null });
  const [err, setErr] = useState('');
  const [tries, setTries] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = box.current;
    let gone = false;
    setReady(false);
    (async () => {
      try {
        const THREE = await import('three');
        if (gone || !el) return;
        const w = Math.max(160, el.clientWidth), h = Math.max(200, el.clientHeight);
        const small = window.matchMedia?.('(max-width: 699px)').matches;
        const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
        renderer.setSize(w, h);
        renderer.domElement.style.display = 'block';
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
        camera.position.set(0, 0, 6);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const sun = new THREE.DirectionalLight(0xffffff, 2);
        sun.position.set(3, 4, 5); scene.add(sun);
        const update = BUILDERS[id](THREE, scene);
        run.current = { renderer, scene, camera, update, THREE };
        renderer.render(scene, camera);
        setReady(true);
      } catch (e) { console.error('[tips 3d]', e?.message); if (!gone) setErr('This 3D scene could not start. Your device or browser may not support WebGL.'); }
    })();
    const onResize = () => {
      const r = run.current; if (!r.renderer || !el) return;
      const w = Math.max(160, el.clientWidth), h = Math.max(200, el.clientHeight);
      r.renderer.setSize(w, h); r.camera.aspect = w / h; r.camera.updateProjectionMatrix();
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    if (el) ro?.observe(el);
    return () => {
      gone = true; ro?.disconnect();
      const r = run.current;
      try {
        r.scene?.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose?.()); });
        r.renderer?.dispose(); r.renderer?.forceContextLoss?.();
        r.renderer?.domElement?.remove();
      } catch { /* already gone */ }
      run.current = { renderer: null, scene: null, camera: null, update: null, THREE: null };
    };
  }, [id, tries]);

  useEffect(() => {
    if (!ready || !active || reducedMotion()) return undefined;
    let raf;
    const loop = (now) => {
      const r = run.current; if (!r.renderer) return;
      try { r.update(now); r.renderer.render(r.scene, r.camera); } catch (e) { console.error('[tips 3d]', e?.message); setErr('This 3D scene stopped. Please try again.'); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, active]);

  if (err) return <StageMessage onRetry={() => { setErr(''); setTries((n) => n + 1); }}>{err}</StageMessage>;
  return (
    <div ref={box} className="absolute inset-0">
      {!ready && <p className="absolute inset-0 flex items-center justify-center text-xs text-white/60">Loading 3D…</p>}
    </div>
  );
}
