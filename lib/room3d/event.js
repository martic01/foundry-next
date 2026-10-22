// The Event Center: an open-air, candle- and fairy-lit garden hall for
// small celebrations (birthdays, Valentine dinners, mini events), up to
// 30 guests. Hall is 14 m wide (x -7..7) and 20 m long (z 0..20).
import { createBuilder, GOLD } from './engine';
import djBooth from '../models/dj-booth.json';
import neonSign from '../models/neon-sign.json';
import vaseFlowers from '../models/vase-flowers.json';
import flowerPot from '../models/flower-pot.json';
import flowerPotLo from '../models/flower-pot-lo.json';
import wallFrame from '../models/wall-frame.json';
import pictureFrame from '../models/picture-frame.json';

export const EVENT_PATH = [
  // p, x, z, yaw, pitch
  [0.0, 0, -3.6, 0, 0.04],
  [0.1, 0, -1.4, 0, 0.1],
  [0.2, 0, 2.2, -0.15, 0.02],
  [0.3, -0.6, 5.4, -0.55, 0],
  [0.42, 0.2, 7.6, 0.55, -0.02],
  [0.54, 0, 9.6, 0.0, 0.2],
  [0.64, 0, 10.8, 0.0, 0.26],
  [0.76, 0, 12.8, 0.1, 0.04],
  [0.88, 0, 14.4, 0, 0.0],
  [1.0, 0, 14.9, 0, 0.0]
];

const PINK = [236, 120, 160], BLUSH = [248, 190, 205], WHITE = [250, 246, 240], RED = [200, 40, 70];
const GOLDL = [236, 196, 90], LILAC = [176, 136, 214], PEACH = [250, 170, 130], LEAF = [52, 124, 70], LEAF2 = [74, 150, 88];
const BLOOMS = [PINK, BLUSH, WHITE, RED, GOLDL, LILAC, PEACH];
const BALLOONS = [PINK, BLUSH, GOLDL, WHITE, [214, 70, 110], LILAC];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildEvent() {
  const R = rng(20261022);
  const lights = [[0, 12.5]];
  const tables = [[-4.2, 5.2], [4.2, 5.2], [-4.6, 9.6], [4.6, 9.6], [0, 4.4]];
  tables.forEach((t) => lights.push(t));
  const b = createBuilder({
    fog: [30, 22, 52], sky: [[8, 8, 30], [70, 42, 96]], lights, lightR: 4.2, dim: 0.8, warm: [1.3, 1.06, 0.82],
    maxDepth: 40, fogNear: 6, fogRange: 30, fogMax: 0.7, vignette: '10,4,24', vignetteA: 0.55, animated: true
  });
  const { quad, box, model, shadow, label, glow } = b;

  // an n-sided column / disc (outward normals)
  function disc(x, y, z, r, h, c, o = {}) {
    const n = o.n || 10, top = [], bot = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      top.push([x + Math.cos(a) * r, y + h, z + Math.sin(a) * r]);
      bot.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]);
    }
    const g = o.group;
    const push = (v, nn, col) => (g ? g.push({ v, n: nn, c: col, emit: o.emit || 0, alpha: 1, shell: false, door: 0, pool: 0 }) : quad(v, nn, col, { emit: o.emit, shell: o.shell, pool: o.pool }));
    push(top.slice().reverse(), [0, 1, 0], o.topColor || c);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, am = ((i + 0.5) / n) * Math.PI * 2;
      push([bot[i], bot[j], top[j], top[i]].reverse(), [Math.cos(am), 0, Math.sin(am)], c);
    }
  }


  // A round-ish ball / bush / balloon: 8 sides, 4 bands (outward normals).
  function ball(g, x, y, z, rx, ry, c, o = {}) {
    const N = 8, rings = [[-1, 0], [-0.6, 0.8], [0, 1], [0.6, 0.8], [1, 0]];
    const pt = (ri, i) => { const a = (i / N) * Math.PI * 2; return [x + Math.cos(a) * rx * rings[ri][1], y + ry * rings[ri][0], z + Math.sin(a) * rx * rings[ri][1]]; };
    const add = (v) => {
      const cx = v.reduce((s2, q) => s2 + q[0], 0) / v.length - x, cy = v.reduce((s2, q) => s2 + q[1], 0) / v.length - y, cz = v.reduce((s2, q) => s2 + q[2], 0) / v.length - z;
      const l = Math.hypot(cx / rx, cy / ry, cz / rx) || 1;
      g.push({ v, n: [cx / rx / l, cy / ry / l, cz / rx / l], c, emit: o.emit || 0, alpha: 1, shell: false, door: 0, pool: 0 });
    };
    for (let r = 0; r < 4; r++) for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const q = r === 0 ? [pt(0, i), pt(1, j), pt(1, i)] : r === 3 ? [pt(3, i), pt(3, j), pt(4, i)] : [pt(r, i), pt(r, j), pt(r + 1, j), pt(r + 1, i)];
      add(q);
    }
  }
  const blob = (x, y, z, rx, ry, rz, c, o) => ball(o.group, x, y, z, Math.max(rx, rz), ry, c, o);
  // A flat flower head (rosette), double-sided, turned by yaw.
  function rosette(g, x, y, z, r, c, yaw = (R() - 0.5) * 1.1) {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const layer = (rad, rot, col, dz, n) => {
      for (const side of [1, -1]) {
        const v = [];
        for (let k = 0; k < n; k++) {
          const a = rot + (k / n) * Math.PI * 2, u = Math.cos(a) * rad, w = Math.sin(a) * rad, d = side * dz;
          v.push([x + u * cs - d * sn, y + w, z - u * sn - d * cs]);
        }
        g.push({ v, n: [-side * sn, 0, -side * cs], c: col, emit: 0, alpha: 1, shell: false, door: 0, pool: 0 });
      }
    };
    layer(r, 0, c, 0.0, 9);
    layer(r * 0.68, 0.35, [Math.min(255, c[0] * 0.82), Math.min(255, c[1] * 0.78), Math.min(255, c[2] * 0.8)], 0.012, 9);
    layer(r * 0.3, 0, [250, 206, 90], 0.024, 6);
  }

  // ------------------------------------------------------------- ground
  quad([[-60, -0.02, -30], [60, -0.02, -30], [60, -0.02, 60], [-60, -0.02, 60]].reverse(), [0, 1, 0], [18, 28, 26], { shell: true });
  for (let z = -6; z < 20; z++) {
    for (let x = -7; x < 7; x++) {
      const outside = z < 0;
      const alt = (x + z) % 2 === 0;
      const c = outside ? (alt ? [62, 58, 74] : [56, 52, 68]) : alt ? [214, 206, 194] : [196, 186, 172];
      quad([[x, 0, z], [x + 1, 0, z], [x + 1, 0, z + 1], [x, 0, z + 1]].reverse(), [0, 1, 0], c, { shell: true, pool: 1 });
    }
  }
  // gold rug down the middle
  for (let z = 0; z < 9; z++) {
    quad([[-1.2, 0.012, z], [1.2, 0.012, z], [1.2, 0.012, z + 1], [-1.2, 0.012, z + 1]].reverse(), [0, 1, 0], z % 2 ? [150, 38, 70] : [140, 32, 64], { shell: true, pool: 1, bias: 1 });
    for (const sx of [-1.28, 1.2]) quad([[sx, 0.014, z], [sx + 0.08, 0.014, z], [sx + 0.08, 0.014, z + 1], [sx, 0.014, z + 1]].reverse(), [0, 1, 0], GOLDL, { shell: true, emit: 0.4, bias: 1.2 });
  }
  // dance floor of colour-cycling tiles
  for (let ix = 0; ix < 6; ix++) {
    for (let iz = 0; iz < 5; iz++) {
      const x = -3 + ix, z = 10 + iz;
      quad([[x, 0.02, z], [x + 1, 0.02, z], [x + 1, 0.02, z + 1], [x, 0.02, z + 1]].reverse(), [0, 1, 0], [120, 120, 200], { shell: true, emit: 0.78, cyc: (ix + iz) / 11, bias: 1 });
    }
  }
  box(-3.08, 0, 9.92, 6.16, 0.04, 0.08, GOLDL, { shell: true, emit: 0.5, bias: 1.2 });

  // -------------------------------------------- the entrance: a flower gate
  const bloomsAt = (g, x, y, z, r, c, yaw) => rosette(g, x, y, z, r * 1.25, c, yaw);
  function floralArch(cz, half, top, withSign) {
    const g = b.group(0, cz, half + 1, 26);
    for (const sx of [-half, half]) {
      box(sx - 0.06, 0, cz - 0.06, 0.12, top - 0.2, 0.12, [240, 236, 228]);
      for (let y = 0.1; y < top - 0.3; y += 0.24) {
        bloomsAt(g, sx + (R() - 0.5) * 0.18, y, cz + (R() - 0.5) * 0.18, 0.12 + R() * 0.07, BLOOMS[Math.floor(R() * BLOOMS.length)]);
        blob(sx + (R() - 0.5) * 0.3, y + 0.05, cz + (R() - 0.5) * 0.2, 0.09, 0.14, 0.09, R() > 0.5 ? LEAF : LEAF2, { group: g });
      }
    }
    for (let i = 0; i <= 22; i++) {
      const a = (i / 22) * Math.PI;
      const px = Math.cos(a) * half, py = top - 0.3 + Math.sin(a) * 0.55;
      bloomsAt(g, -px, py + (R() - 0.5) * 0.08, cz + (R() - 0.5) * 0.15, 0.13 + R() * 0.08, BLOOMS[Math.floor(R() * BLOOMS.length)]);
      blob(-px + (R() - 0.5) * 0.2, py - 0.1, cz + (R() - 0.5) * 0.2, 0.1, 0.15, 0.1, R() > 0.5 ? LEAF : LEAF2, { group: g });
      if (i % 3 === 0) glow(-px, py, cz - 0.15, 0.07, [255, 214, 140], 0.7, i);
    }
    if (withSign) {
      label({ text: 'THE FOUNDRY EVENTS', x: 0, y: top + 0.12, z: cz - 0.2, size: 0.2, color: GOLDL, weight: 800, glow: true, spacing: 0.14 });
      label({ text: 'UP TO 30 GUESTS', x: 0, y: top - 0.18, z: cz - 0.2, size: 0.1, color: [250, 235, 220], weight: 600, glow: true, spacing: 0.3 });
    }
  }
  floralArch(0, 1.7, 2.8, true);
  // balloon clusters beside the gate and the stage
  function balloons(x, z, n = 9, s = 1) {
    const g = b.group(x, z, 1.4, 22);
    for (let i = 0; i < n; i++) {
      const bx = x + (R() - 0.5) * 1.1 * s, bz = z + (R() - 0.5) * 0.9 * s, by = 1.7 + R() * 1.1 * s;
      const col = BALLOONS[Math.floor(R() * BALLOONS.length)];
      blob(bx, by, bz, 0.2, 0.26, 0.2, col, { group: g });
      g.push({ v: [[bx - 0.004, 0, bz], [bx + 0.004, 0, bz], [bx + 0.004, by - 0.26, bz]], n: [0, 0, -1], c: [235, 230, 220], emit: 0, alpha: 1, shell: false, door: 0, pool: 0 });
    }
    box(x - 0.12, 0, z - 0.12, 0.24, 0.1, 0.24, GOLDL);
  }
  balloons(-2.6, 0.8); balloons(2.6, 0.8); balloons(-6.1, 17.4, 10, 1.2); balloons(6.1, 17.4, 10, 1.2);

  // -------------------------------- pillars, hedges and fairy lights (open air)
  const PILLARS = [2, 6, 10, 14, 18];
  for (const z of PILLARS) {
    for (const sx of [-6.6, 6.6]) {
      disc(sx, 0, z, 0.16, 3.4, [244, 240, 232], { n: 8 });
      disc(sx, 3.4, z, 0.22, 0.1, GOLDL, { n: 8 });
      const g = b.group(sx, z, 1, 24);
      for (let y = 0.4; y < 3.2; y += 0.34) {
        const a = y * 7;
        bloomsAt(g, sx + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2, 0.1, BLOOMS[Math.floor(R() * BLOOMS.length)], -a + Math.PI / 2);
      }
      glow(sx, 3.55, z, 0.2, [255, 214, 140], 0.9, z + sx, 70);
    }
  }
  // low flowering hedges along both sides
  for (const sx of [-7.1, 7.1]) {
    for (let z = 0.5; z < 20; z += 1.1) {
      const g = b.group(sx, z, 0.9, 24);
      blob(sx, 0.4, z, 0.5, 0.45, 0.62, R() > 0.5 ? LEAF : LEAF2, { group: g });
      bloomsAt(g, sx + (sx < 0 ? 0.25 : -0.25), 0.7 + R() * 0.2, z + (R() - 0.5) * 0.4, 0.14, BLOOMS[Math.floor(R() * BLOOMS.length)]);
      bloomsAt(g, sx + (sx < 0 ? 0.3 : -0.3), 0.45, z + (R() - 0.5) * 0.5, 0.12, BLOOMS[Math.floor(R() * BLOOMS.length)]);
    }
  }
  // distant garden trees
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, z = 2 + Math.floor(i / 2) * 3;
    const g = b.group(side * 11, z, 4, 40);
    blob(side * (11 + R() * 2), 2.2, z, 1.3, 1.9, 1.3, [20, 46 + R() * 14, 40], { group: g });
    
    glow(side * (9.2 + R() * 1.4), 1.6 + R() * 2, z + R() - 0.5, 0.07, [255, 214, 140], 0.7, i);
  }
  // strands of fairy lights across the hall and along both sides
  const strand = (x0, y0, z0, x1, y1, z1, n, c = [255, 218, 150]) => {
    for (let i = 0; i <= n; i++) {
      const t = i / n, sag = Math.sin(t * Math.PI) * 0.35;
      glow(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - sag, z0 + (z1 - z0) * t, 0.06, c, 0.6, i * 1.3 + z0, 22);
    }
  };
  for (const z of [2, 4, 6, 8, 10, 12, 14, 16, 18]) strand(-6.6, 3.5, z, 6.6, 3.5, z, 18);
  for (const sx of [-6.6, 6.6]) strand(sx, 3.5, 0, sx, 3.5, 20, 30, [255, 190, 210]);
  for (const x of [-3.3, 0, 3.3]) strand(x, 3.6, 2, x, 3.6, 18, 26, [255, 230, 180]);
  // a white pergola over the dance floor with chandeliers
  for (const [px, pz] of [[-3.3, 9.4], [3.3, 9.4], [-3.3, 15.6], [3.3, 15.6]]) { box(px - 0.08, 0, pz - 0.08, 0.16, 3.4, 0.16, [244, 240, 232]); }
  for (const pz of [9.4, 15.6]) box(-3.38, 3.4, pz - 0.06, 6.76, 0.12, 0.12, [244, 240, 232]);
  for (const px of [-3.3, 3.3]) box(px - 0.06, 3.4, 9.4, 0.12, 0.12, 6.2, [244, 240, 232]);
  for (const [cx, cz] of [[0, 11.2], [0, 14]]) {
    box(cx - 0.015, 2.7, cz - 0.015, 0.03, 0.7, 0.03, GOLDL);
    disc(cx, 2.45, cz, 0.3, 0.1, GOLDL, { n: 10, emit: 0.5 });
    glow(cx, 2.45, cz, 1.6, [255, 214, 150], 0.75, cz, 150);
    for (let i = 0; i < 8; i++) { const a = i * 0.785; glow(cx + Math.cos(a) * 0.32, 2.4, cz + Math.sin(a) * 0.32, 0.1, [255, 240, 200], 1, i, 30); }
  }

  // --------------------------------------------------- tables and chairs
  // A small flower arrangement: gold-rimmed vase, leaves, round blooms and flat rosettes.
  function arrangement(g, x, y, z, s = 1) {
    disc(x, y, z, 0.06 * s, 0.17 * s, [244, 240, 232], { n: 8, group: g });
    disc(x, y + 0.17 * s, z, 0.075 * s, 0.02 * s, GOLDL, { n: 8, group: g });
    ball(g, x, y + 0.27 * s, z, 0.17 * s, 0.11 * s, LEAF);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, rr = (0.05 + (i % 3) * 0.06) * s, hh = (0.26 + (i % 3) * 0.045) * s;
      const col = BLOOMS[(i * 3 + 1) % BLOOMS.length];
      if (i % 3 === 0) ball(g, x + Math.cos(a) * rr, y + hh + 0.04 * s, z + Math.sin(a) * rr, 0.06 * s, 0.055 * s, col);
      else rosette(g, x + Math.cos(a) * rr, y + hh + 0.04 * s, z + Math.sin(a) * rr, 0.075 * s, col, a + Math.PI / 2);
    }
    ball(g, x, y + 0.41 * s, z, 0.07 * s, 0.065 * s, PINK);
  }
  function candle(g, x, y, z) {
    disc(x, y, z, 0.04, 0.015, GOLDL, { n: 8, group: g });
    disc(x, y + 0.015, z, 0.022, 0.13, [250, 244, 232], { n: 6, group: g });
    glow(x, y + 0.17, z, 0.1, [255, 190, 110], 0.9, x + z, 38);
  }
  // A white banquet chair with a pink sash; (dx, dz) is the way the guest faces.
  function bchair(g, x, z, dx, dz) {
    const WH = [248, 246, 240];
    box(x - 0.21, 0.44, z - 0.21, 0.42, 0.06, 0.42, WH, { group: g, skip: ['-y'] });
    box(x - 0.18, 0.4, z - 0.18, 0.36, 0.04, 0.36, [220, 214, 204], { group: g, skip: ['-y', '+y'] });
    for (const [lx, lz] of [[-0.19, -0.19], [0.17, -0.19], [-0.19, 0.17], [0.17, 0.17]]) box(x + lx, 0, z + lz, 0.03, 0.44, 0.03, GOLDL, { group: g, skip: ['-y', '+y'] });
    if (Math.abs(dx) > Math.abs(dz)) {
      const bx = x - Math.sign(dx) * 0.2;
      box(bx - 0.025, 0.5, z - 0.21, 0.05, 0.5, 0.42, WH, { group: g });
      box(bx - Math.sign(dx) * 0.0 - (dx > 0 ? -0.03 : 0.06), 0.66, z - 0.215, 0.03, 0.12, 0.43, [226, 112, 150], { group: g, emit: 0.15 });
      rosette(g, x - Math.sign(dx) * 0.14, 0.72, z, 0.06, [226, 112, 150], dx > 0 ? -Math.PI / 2 : Math.PI / 2);
    } else {
      const bz = z - Math.sign(dz) * 0.2;
      box(x - 0.21, 0.5, bz - 0.025, 0.42, 0.5, 0.05, WH, { group: g });
      box(x - 0.215, 0.66, bz - (dz > 0 ? -0.03 : 0.06), 0.43, 0.12, 0.03, [226, 112, 150], { group: g, emit: 0.15 });
      rosette(g, x, 0.72, z - Math.sign(dz) * 0.14, 0.06, [226, 112, 150], dz > 0 ? 0 : Math.PI);
    }
  }
  tables.forEach(([x, z], ti) => {
    shadow(x, z, 1.55, 1.55, 0.2);
    const g = b.group(x, z, 1.9, 20);
    disc(x, 0, z, 0.06, 0.72, [200, 200, 205], { n: 6, group: g });
    disc(x, 0.72, z, 0.8, 0.04, [250, 248, 244], { n: 12, group: g });
    disc(x, 0.46, z, 0.88, 0.28, [252, 250, 246], { n: 12, group: g, topColor: [236, 226, 224] });
    disc(x, 0.765, z, 0.36, 0.006, [236, 150, 180], { n: 12, group: g });
    arrangement(g, x, 0.77, z, 1);
    candle(g, x + 0.46, 0.77, z + 0.12); candle(g, x - 0.46, 0.77, z - 0.12);
    const seats = ti === 4 ? 4 : 6;
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2 + 0.3;
      const cxp = x + Math.cos(a) * 1.18, czp = z + Math.sin(a) * 1.18;
      disc(x + Math.cos(a) * 0.56, 0.766, z + Math.sin(a) * 0.56, 0.13, 0.008, [255, 255, 255], { n: 10, group: g });
      disc(x + Math.cos(a) * 0.56, 0.764, z + Math.sin(a) * 0.56, 0.15, 0.004, GOLDL, { n: 10, group: g });
      bchair(g, cxp, czp, x - cxp, z - czp);
    }
  });
  // cocktail (high) tables: draped cloth, flowers and a candle
  for (const [x, z] of [[-2.8, 8.4], [2.8, 8.4], [-5.8, 13], [5.8, 13], [-5.6, 2.6], [5.6, 2.6]]) {
    shadow(x, z, 0.5, 0.5, 0.22);
    const g = b.group(x, z, 0.7, 18);
    disc(x, 0, z, 0.22, 0.03, GOLDL, { n: 10, group: g });
    disc(x, 0.03, z, 0.2, 0.98, [252, 250, 246], { n: 10, group: g });
    disc(x, 1.0, z, 0.4, 0.035, [252, 250, 246], { n: 12, group: g, topColor: [236, 150, 180] });
    arrangement(g, x, 1.035, z, 0.55);
    candle(g, x + 0.25, 1.035, z);
  }
  // cake table
  box(5.0, 0, 15.6, 1.2, 0.74, 0.8, [250, 248, 244], { bias: -0.8 });
  disc(5.6, 0.74, 16.0, 0.26, 0.2, [250, 214, 224], { n: 10 });
  disc(5.6, 0.94, 16.0, 0.19, 0.18, [250, 238, 240], { n: 10 });
  glow(5.6, 1.18, 16.0, 0.1, [255, 200, 120], 1, 3, 36);
  arrangement(b.group(5.25, 15.85, 0.5, 20), 5.25, 0.74, 15.85, 0.9);

  // -------------------------------------------------- DJ stage and backdrop
  shadow(0, 18.2, 4.8, 1.9, 0.3);
  box(-4.4, 0, 16.6, 8.8, 0.3, 3.2, [36, 30, 52], { skip: ['-y'], bias: -1.5 });
  box(-4.4, 0.3, 16.56, 8.8, 0.03, 0.05, GOLDL, { faceEmit: { '+y': 0.6, '-z': 0.6 } });
  model(djBooth, { x: 0, y: 0.3, z: 18.3, face: '-z', scale: 0.85, maxd: 40, lift: 16 });
  model(neonSign, { double: true, x: 3.4, y: 0.9, z: 19.86, face: '-z', height: 1.9, anchor: 'back', glowAbove: 120, maxd: 40 });
  glow(3.4, 1.8, 19.7, 2.2, [150, 200, 255], 0.4, 2, 160);
  // flower wall behind the stage
  box(-7, 0, 19.9, 14, 3.6, 0.1, [28, 56, 46], { skip: ['-y'], bias: -8 }); // bias: always painted behind the flowers
  const wallG = b.group(0, 19.7, 9, 40);
  for (let x = -6.7; x <= 6.7; x += 0.46) {
    for (let y = 0.4; y < 3.5; y += 0.42) {
      if (Math.abs(x - 3.4) < 0.9 && y > 0.8 && y < 3) continue; // room for the neon sign
      bloomsAt(wallG, x + (R() - 0.5) * 0.2, y + (R() - 0.5) * 0.15, 19.78, 0.2 + R() * 0.1, BLOOMS[Math.floor(R() * BLOOMS.length)]);
      if (R() > 0.5) blob(x + (R() - 0.5) * 0.4, y - 0.15, 19.8, 0.14, 0.2, 0.1, R() > 0.5 ? LEAF : LEAF2, { group: wallG });
    }
  }
  label({ text: 'HAPPY CELEBRATIONS', x: -1.6, y: 2.9, z: 19.7, size: 0.3, color: [255, 236, 190], weight: 800, glow: true, spacing: 0.1 });
  label({ text: 'Birthdays · Valentine · Mini events', x: -1.6, y: 2.52, z: 19.7, size: 0.13, color: [255, 214, 230], weight: 600, glow: true, spacing: 0.1 });
  glow(-1.6, 2.7, 19.6, 3.4, [255, 190, 150], 0.25, 1, 200);
  model(wallFrame, { x: -5.8, y: 1.3, z: 19.84, face: '-z', width: 0.9, anchor: 'back', maxd: 40 });
  model(pictureFrame, { x: -4.4, y: 1.3, z: 19.84, face: '-z', width: 1.1, anchor: 'back', maxd: 40 });
  // stage-side vases and pots
  for (const x of [-4.8, 4.8]) arrangement(b.group(x, 17, 1, 40), x, 0.3, 17.0, 2.4);
  for (const [x, z] of [[-6.1, 6.2], [6.1, 6.2], [-6.1, 11.6], [6.1, 11.6], [-1.9, 1.5], [1.9, 1.5]]) model(flowerPot, { double: true, x, y: 0, z, height: 1.3, maxd: 16 });
  for (const [x, z] of [[-6.1, 3.0], [6.1, 3.0], [-6.1, 15], [6.1, 15]]) model(flowerPotLo, { double: true, x, y: 0, z, height: 1.4, maxd: 16 });
  // spot lights on the stage and floor
  glow(-3, 3.0, 16.8, 1.0, [255, 120, 180], 0.45, 1, 110); glow(3, 3.0, 16.8, 1.0, [120, 160, 255], 0.45, 2, 110);
  glow(0, 0.6, 12.5, 2.4, [255, 120, 220], 0.2, 3, 200);

  return b;
}
