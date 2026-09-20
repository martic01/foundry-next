'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Raw Three.js instead of <model-viewer> for two reasons, both real
// limitations of model-viewer's public API, not preference:
// 1. The wave trick needs to rotate the robot's actual RightArm node --
//    model-viewer only exposes whole-model orientation and per-material
//    color, never individual node/bone transforms.
// 2. Full control over renderer settings, which is what makes the
//    low-end-GPU handling below possible at all (shadow maps, pixel
//    ratio, antialiasing, frame rate are all model-viewer internals you
//    can't touch from its attribute API).
//
// Every node/material name referenced below (RightArm, Eyes, chestMat,
// etc.) was confirmed by reading the actual GLB's glTF JSON chunk
// directly, not guessed.

const GOLD = 0xf2c94c; // the site's brand gold, as a plain hex number -- three.js Color takes this directly
// Nearly the whole shell, per the reference screenshot -- head, torso,
// arms, hands, antenna all read as one gold robot rather than a gold
// torso with black limbs. Eyes/EyeBorder are deliberately left alone
// (they're meant to glow cyan/white, not gold) and so are the wheels
// (Wheelmat/wheelHolderMAt) -- tires reading as dark rubber still makes
// sense next to an otherwise-gold body.
const BODY_MATERIALS = [
  'Head', 'chestMat', 'hipsMat', 'midSpineMat', 'Neck',
  'ForeArmMat', 'HandCircleMat', 'AfterCircleMat', 'FingersMAt', 'HandMad',
  'Antenna', 'Holder'
];

// Old/weak integrated GPUs this is specifically trying to run
// acceptably on -- Intel HD Graphics 2000/3000/4000 (2011-2012 era,
// no WebGL2, no compute), plus software rasterizers that show up in the
// same "basically no real GPU" bucket.
const WEAK_GPU_PATTERN = /HD Graphics (2000|3000|4000)|Intel.*GMA|SwiftShader|llvmpipe|Microsoft Basic Render/i;

function detectGpuTier() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { supported: false, lowEnd: true };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    const noWebgl2 = !canvas.getContext('webgl2');
    const lowEnd = WEAK_GPU_PATTERN.test(rendererStr) || noWebgl2;
    return { supported: true, lowEnd };
  } catch {
    return { supported: true, lowEnd: true }; // can't tell -- assume the cheap path
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findMesh(root, materialName) {
  let found = null;
  root.traverse((obj) => {
    if (!found && obj.isMesh && obj.material?.name === materialName) found = obj;
  });
  return found;
}

// ---- Trick implementations --------------------------------------------
// Each takes (model, container) and always puts things back exactly
// where they started -- front-facing, centered, glow off -- since the
// robot should read as idle between tricks, not stuck mid-pose.

async function spinTrick(model) {
  const steps = 30;
  for (let i = 1; i <= steps; i++) {
    model.rotation.y = (i / steps) * Math.PI * 2;
    await wait(2200 / steps);
  }
  model.rotation.y = 0;
}

async function jumpTrick(model) {
  const baseY = model.position.y;
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    model.position.y = baseY + Math.sin((i / steps) * Math.PI) * 0.45;
    await wait(42);
  }
  model.position.y = baseY;
}

async function wheelSlideTrick(model) {
  const baseX = model.position.x;
  const from = baseX;
  const left = baseX - 0.9;
  const right = baseX + 0.9;
  async function glide(to, ms) {
    const start = model.position.x;
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      model.position.x = start + (to - start) * (i / steps);
      await wait(ms / steps);
    }
  }
  await glide(left, 900);
  await glide(right, 1300);
  await glide(from, 900);
}

async function scatterTrick(model) {
  // Approximates "scatter and reset" -- worth being upfront about this:
  // even with direct scene-graph access, this model has no rigged
  // explode/scatter animation baked in, and animating every individual
  // limb node outward with correct return-to-rest bookkeeping is a much
  // bigger task than the other tricks here. This is a glitch-style
  // jitter of the whole model instead -- reads as a deliberate
  // "glitching" effect, which fits an AI robot, but it's a stylized
  // substitute, not literal part separation. Kept a bit snappier than
  // the other tricks on purpose -- a slow "glitch" doesn't read as one --
  // but still slower than the original.
  const baseX = model.position.x;
  const baseY = model.position.y;
  const baseRot = model.rotation.z;
  for (let i = 0; i < 7; i++) {
    model.position.x = baseX + (Math.random() - 0.5) * 0.3;
    model.position.y = baseY + (Math.random() - 0.5) * 0.2;
    model.rotation.z = baseRot + (Math.random() - 0.5) * 0.25;
    await wait(80);
  }
  model.position.x = baseX;
  model.position.y = baseY;
  model.rotation.z = baseRot;
}

async function pulseGlow(model, materialNames, pulses = 3) {
  const meshes = materialNames.map((n) => findMesh(model, n)).filter(Boolean);
  if (!meshes.length) return;
  const originals = meshes.map((m) => ({
    color: m.material.emissive.clone(),
    intensity: m.material.emissiveIntensity
  }));
  for (let i = 0; i < pulses; i++) {
    meshes.forEach((m) => {
      m.material.emissive.setHex(GOLD);
      m.material.emissiveIntensity = 2.2;
    });
    await wait(480);
    meshes.forEach((m) => {
      m.material.emissiveIntensity = 0.15;
    });
    await wait(480);
  }
  meshes.forEach((m, i) => {
    m.material.emissive.copy(originals[i].color);
    m.material.emissiveIntensity = originals[i].intensity;
  });
}

async function eyesGlowTrick(model) {
  await pulseGlow(model, ['Eyes']);
}

async function bodyGlowTrick(model) {
  await pulseGlow(model, ['light', 'chestMat', 'hipsMat']);
}

async function readBookTrick(model, container) {
  // No 3D book asset exists for this model -- this is a 2D emoji
  // overlay positioned over the canvas near the hand, not real
  // geometry. Same limitation as before; direct scene-graph access
  // doesn't solve "there's no book mesh to show."
  const book = container?.querySelector('.book-emoji');
  if (!book) return;
  book.classList.add('show');
  await wait(2500);
  book.classList.remove('show');
  await wait(350);
}

const TRICKS = [spinTrick, jumpTrick, wheelSlideTrick, scatterTrick, eyesGlowTrick, bodyGlowTrick, readBookTrick];

export default function Robot3D() {
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const { supported, lowEnd } = detectGpuTier();
    if (!supported) {
      setFailed(true);
      return undefined;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let cancelled = false;
    let renderer, scene, camera, model, rightArm;
    let frameId;
    let resizeObserver, intersectionObserver;
    let isVisible = true;
    let hovering = false;
    let trickTimerId;
    let lastTrick = null;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !lowEnd,
      powerPreference: lowEnd ? 'low-power' : 'default'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowEnd ? 1 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Shadow mapping is skipped entirely, on every tier -- one of the
    // most expensive things you can turn on for a purely decorative
    // model, with little visual payoff here.
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    // Cheap direct lighting instead of a full HDRI -- an
    // environment/reflection source is still added just below on
    // capable hardware (metals need SOMETHING to reflect or they read
    // as flat/dark, not shiny), but skipped entirely on the low-end
    // path to keep that tier exactly as cheap as before.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x33334d, 1.15));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(2, 3, 2.5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2, 1, -2);
    scene.add(fillLight);

    // RoomEnvironment is a small procedurally-generated cubemap (not an
    // external HDR file to fetch) -- this is a ONE-TIME cost at load
    // (baking a handful of small mipmaps), not a per-frame cost; ongoing
    // rendering only ever does a cheap texture sample against it. That's
    // what makes it worth the visual payoff for the gold metal look even
    // with the low-end tier in mind -- it's just skipped there entirely,
    // and GOLD_METALNESS below is tuned lower on that path so the
    // material still looks reasonable (not flat black) with plain lights
    // alone.
    if (!lowEnd) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    }
    const GOLD_METALNESS = lowEnd ? 0.45 : 0.9;
    const GOLD_ROUGHNESS = lowEnd ? 0.5 : 0.32;

    function resize() {
      if (!mount) return;
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    function frameCameraToModel(root) {
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      root.position.x -= center.x;
      root.position.y -= box.min.y; // stand on y=0 instead of floating at its raw export origin
      root.position.z -= center.z;
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      camera.position.set(0, size.y * 0.62, maxDim * 1.85);
      camera.lookAt(0, size.y * 0.5, 0);
    }

    const loader = new GLTFLoader();
    loader.load(
      '/models/ai-robot.glb',
      (gltf) => {
        if (cancelled) return;
        model = gltf.scene;

        // Body shell -> gold, to match the site's brand theme. Eyes and
        // wheels intentionally keep their original colors -- turning the
        // whole model one flat color would lose all contrast/detail.
        // metalness/roughness are pushed toward "polished metal" too --
        // the plain color swap alone reads as gold-painted plastic, not
        // an actual metal robot, since these materials' original
        // metalness/roughness values were tuned for their original
        // (mostly matte) colors.
        model.traverse((obj) => {
          if (obj.isMesh && BODY_MATERIALS.includes(obj.material?.name)) {
            obj.material.color.setHex(GOLD);
            obj.material.metalness = GOLD_METALNESS;
            obj.material.roughness = GOLD_ROUGHNESS;
          }
        });

        rightArm = model.getObjectByName('RightArm') || null;

        scene.add(model);
        frameCameraToModel(model);
        resize();
        startTrickLoop();
      },
      undefined,
      () => {
        if (!cancelled) setFailed(true);
      }
    );

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    // Pauses rendering entirely off-screen -- saves GPU cycles when
    // scrolled away, which matters most on exactly the hardware this is
    // trying to be considerate of.
    intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    intersectionObserver.observe(mount);

    let lastFrameTime = 0;
    const frameInterval = lowEnd ? 1000 / 30 : 1000 / 60; // caps to 30fps on weak GPUs, roughly halving render cost

    function animate(time) {
      frameId = requestAnimationFrame(animate);
      if (!isVisible || !renderer) return;
      if (time - lastFrameTime < frameInterval) return;
      lastFrameTime = time;
      // Gentle idle float, applied every frame directly to position.y
      // rather than a CSS animation -- there's no DOM element to animate
      // here, the canvas is just pixels.
      if (model && !reducedMotion) {
        model.position.y += Math.sin(time / 900) * 0.0009;
      }
      renderer.render(scene, camera);
    }
    frameId = requestAnimationFrame(animate);

    // ---- Trick scheduling ----
    function pickTrick() {
      if (TRICKS.length === 1) return TRICKS[0];
      let choice;
      do {
        choice = TRICKS[Math.floor(Math.random() * TRICKS.length)];
      } while (choice === lastTrick);
      lastTrick = choice;
      return choice;
    }

    function scheduleTrick() {
      const delay = 6000 + Math.random() * 7000;
      trickTimerId = setTimeout(async () => {
        if (cancelled || hovering || !model) return;
        try {
          await pickTrick()(model, mount);
        } catch {
          // one trick failing should never stop the loop
        }
        if (!cancelled) scheduleTrick();
      }, delay);
    }

    function startTrickLoop() {
      if (reducedMotion) return;
      scheduleTrick();
    }

    // ---- Wave on hover: rotates the REAL RightArm node -------------
    // Note on the axis/sign below: the model's rig orientation wasn't
    // visually verified (no way to render/preview the GLB from here) --
    // rotation.z with a positive target is the most common convention
    // for "raise arm outward" on rigs like this, but if the wave looks
    // wrong in the browser (arm goes the wrong way, or too close to/far
    // from the head), this angle is the one to retune.
    //
    // On fingers specifically: the hand's fingers (RightArm_FingersMAt_0)
    // are ONE mesh in this model, not five separately-rigged finger
    // bones -- there's nothing to individually spread. That's a modeling/
    // rigging limitation, not something animatable from here; a spread-
    // fingers pose would need the model itself rebuilt with finger
    // joints.
    const ARM_RAISE_ANGLE = -Math.PI / 3.2; // ~-56deg -- leaves clear space between hand and head, rather than the hand ending up right beside it
    const BODY_LEAN_ANGLE = 0.1; // ~6deg lean into the wave
    let waveRunning = false;

    async function waveLoop() {
      if (!rightArm || waveRunning) return;
      waveRunning = true;
      const restArmZ = rightArm.rotation.z;
      const restBodyZ = model.rotation.z;
      const steps = 16;
      // Raise arm + lean body together
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        rightArm.rotation.z = restArmZ + ARM_RAISE_ANGLE * t;
        model.rotation.z = restBodyZ + BODY_LEAN_ANGLE * t;
        await wait(28);
      }
      // Wave side to side while still hovering
      while (hovering && !cancelled) {
        rightArm.rotation.z = restArmZ + ARM_RAISE_ANGLE + 0.16;
        await wait(220);
        if (!hovering || cancelled) break;
        rightArm.rotation.z = restArmZ + ARM_RAISE_ANGLE - 0.16;
        await wait(220);
      }
      // Lower arm + straighten body back together
      const currentArmZ = rightArm.rotation.z;
      const currentBodyZ = model.rotation.z;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        rightArm.rotation.z = currentArmZ + (restArmZ - currentArmZ) * t;
        model.rotation.z = currentBodyZ + (restBodyZ - currentBodyZ) * t;
        await wait(28);
      }
      rightArm.rotation.z = restArmZ;
      model.rotation.z = restBodyZ;
      waveRunning = false;
    }

    function onEnter() {
      hovering = true;
      clearTimeout(trickTimerId);
      waveLoop();
    }
    function onLeave() {
      hovering = false;
      if (!cancelled) scheduleTrick();
    }
    mount.addEventListener('mouseenter', onEnter);
    mount.addEventListener('mouseleave', onLeave);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      clearTimeout(trickTimerId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      mount.removeEventListener('mouseenter', onEnter);
      mount.removeEventListener('mouseleave', onLeave);
      scene?.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material?.dispose();
        }
      });
      scene?.environment?.dispose();
      renderer?.dispose();
      if (renderer?.domElement?.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-line bg-surfaceMuted text-sm text-inkdim">
        3D preview unavailable on this device
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      <span className="book-emoji" aria-hidden="true">
        📖
      </span>
      <style jsx global>{`
        .book-emoji {
          position: absolute;
          left: 60%;
          top: 40%;
          font-size: 2rem;
          opacity: 0;
          pointer-events: none;
          transform: translateY(6px) scale(0.8);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .book-emoji.show {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      `}</style>
    </div>
  );
}
