// The Workspace: entrance, co-working floor, a meeting room you can walk
// into, a lounge, and a separate virtual office behind its own glass door.
// Room is 10 m wide (x -5..5) and 30 m long (z 0..30), 3.2 m high.
import { createBuilder, GOLD } from './engine';
import chair from '../models/chair.json';
import chairLo from '../models/chair-lo.json';
import ac from '../models/ac.json';
import wallFrame from '../models/wall-frame.json';
import pictureFrame from '../models/picture-frame.json';
import flowerPot from '../models/flower-pot.json';
import flowerPotLo from '../models/flower-pot-lo.json';
import vaseFlowers from '../models/vase-flowers.json';

const H = 3.2;
const WALL = [233, 227, 214];
const WALL2 = [226, 219, 205];
const INK = [38, 40, 46];
const WOOD = [168, 124, 84];
const WALNUT = [98, 68, 46];
const GLASS = [170, 205, 235];
const SCREEN = [120, 170, 235];

export const WORKSPACE_PATH = [
  // p, x, z, yaw, pitch
  [0.0, 0, -3.2, 0, 0.02],
  [0.07, 0, -1.6, 0, 0.02],
  [0.15, 0, 2.6, -0.1, -0.03],
  [0.25, 0, 6.8, -0.5, -0.1],
  [0.33, 0, 10.2, 0.05, -0.04],
  [0.4, 0.3, 13.0, 0.6, -0.05],
  [0.46, 0.7, 15.8, 1.45, -0.06],
  [0.54, 2.3, 15.8, 1.3, -0.1],
  [0.6, 2.4, 15.8, 1.42, -0.08],
  [0.66, 0.6, 15.8, 0.9, -0.05],
  [0.72, 0, 18.4, 0.05, -0.04],
  [0.78, 0, 20.2, 0, -0.03],
  [0.85, 0, 22.4, 0, -0.04],
  [0.93, -0.2, 24.0, -0.62, -0.1],
  [1.0, -0.2, 24.3, -0.72, -0.1]
];

export function buildWorkspace() {
  const lights = [];
  for (let z = 1.5; z < 29; z += 3.5) for (const lx of [-2.6, 2.6]) lights.push([lx, z]);
  const b = createBuilder({ fog: [208, 199, 184], lights, lightR: 3.2, vignette: '20,14,6', vignetteA: 0.42, sky: [[96, 156, 232], [186, 214, 244]], skyHorizon: [226, 236, 246], stars: false });
  const { quad, box, model, laptop, shadow, label, glow } = b;

  // wall strip, 1 m tiles so painter sorting stays right
  const strip = (axis, a0, a1, y0, y1, fixed, n, c, o = {}) => {
    for (let a = a0; a < a1; a += 1) {
      const v = axis === 'x'
        ? [[a + 1, y0, fixed], [a, y0, fixed], [a, y1, fixed], [a + 1, y1, fixed]]
        : [[fixed, y0, a], [fixed, y0, a + 1], [fixed, y1, a + 1], [fixed, y1, a]];
      quad(v, n, c, o);
    }
  };

  // ---------------------------------------------------------- the shell
  for (let z = -4; z < 30; z++) {
    for (let x = -5; x < 5; x++) {
      const alt = (x + z) % 2 === 0;
      const c = z < 0 ? (alt ? [70, 72, 80] : [62, 64, 72]) : z >= 21 ? (alt ? [92, 98, 112] : [84, 90, 104]) : alt ? [190, 150, 104] : [180, 141, 97];
      quad([[x, 0, z], [x + 1, 0, z], [x + 1, 0, z + 1], [x, 0, z + 1]], [0, 1, 0], c, { shell: true, pool: 1 });
    }
  }
  for (let z = 0; z < 21; z++) {
    quad([[-1, 0.01, z], [1, 0.01, z], [1, 0.01, z + 1], [-1, 0.01, z + 1]], [0, 1, 0], z % 2 ? [66, 64, 72] : [60, 58, 66], { shell: true, pool: 1, bias: 1 });
    quad([[-1.06, 0.012, z], [-1, 0.012, z], [-1, 0.012, z + 1], [-1.06, 0.012, z + 1]], [0, 1, 0], GOLD, { shell: true, emit: 0.2, bias: 1.2 });
    quad([[1, 0.012, z], [1.06, 0.012, z], [1.06, 0.012, z + 1], [1, 0.012, z + 1]], [0, 1, 0], GOLD, { shell: true, emit: 0.2, bias: 1.2 });
  }
  for (let z = -4; z < 30; z += 2) {
    for (let x = -5; x < 5; x += 2) {
      quad([[x, H, z + 2], [x + 2, H, z + 2], [x + 2, H, z], [x, H, z]], [0, -1, 0], z < 0 ? [50, 52, 58] : [238, 234, 226], { shell: true });
    }
  }
  for (const [lx, lz] of lights) {
    quad([[lx - 0.9, H - 0.01, lz + 0.4], [lx + 0.9, H - 0.01, lz + 0.4], [lx + 0.9, H - 0.01, lz - 0.4], [lx - 0.9, H - 0.01, lz - 0.4]], [0, -1, 0], [255, 250, 236], { emit: 1 });
    glow(lx, H - 0.25, lz, 1.5, [255, 238, 200], 0.32, lz);
  }
  // ---- the world outside the windows: lawn, trees and a distant skyline
  quad([[-80, -0.02, -20], [-5.02, -0.02, -20], [-5.02, -0.02, 50], [-80, -0.02, 50]].reverse(), [0, 1, 0], [128, 160, 112], { shell: true });
  const SKY = [[8, 14, -30], [10, 11, -24], [14, 9, -17], [12, 15, -10], [16, 12, -3], [9, 10, 4], [13, 14, 11], [11, 8, 18], [15, 13, 25], [10, 11, 33], [14, 9, 41]];
  for (const [bx, bh, bz] of SKY) {
    const wd = 5 + ((bz * 7) % 3), col = [150 + (bh * 3) % 20, 164 + (bh * 2) % 16, 188 + (bh % 10)];
    box(-bx - 28 - wd, 0, bz - wd / 2 - 2, wd, bh, wd + 3, col, { shell: true, skip: ['-y', '+y'] });
  }
  for (let z = -2; z < 30; z += 4) {
    const g = b.group(-15, z, 3, 34);
    const tc = [52 + (z * 5) % 26, 112 + (z * 3) % 28, 66];
    box(-15.12, 0, z - 0.12, 0.24, 1.7, 0.24, [96, 72, 52], { group: g, skip: ['-y'] });
    b.blob(-15, 2.7, z, 1.5, 1.5, 1.5, tc, { group: g });
    b.blob(-15, 3.7, z, 1.0, 0.9, 1.0, [tc[0] + 14, tc[1] + 14, tc[2] + 8], { group: g });
  }
  // wainscot along the right wall
  for (let z = 0; z < 30; z += 1) {
    quad([[4.995, 0.12, z + 1], [4.995, 0.12, z], [4.995, 0.9, z], [4.995, 0.9, z + 1]], [-1, 0, 0], z % 2 ? [196, 186, 168] : [190, 180, 162], { shell: true });
  }
  box(4.97, 0.9, 0, 0.03, 0.04, 30, GOLD, { shell: true, faceEmit: { '-x': 0.2 }, skip: ['+x', '-y', '+y'] });
  // left wall, with windows over the co-working floor and the lounge
  const winZ = [[2, 10], [12, 20]];
  const inWin = (z0) => winZ.some(([a, b2]) => z0 >= a && z0 + 2 <= b2);
  for (let z = -4; z < 30; z += 2) {
    const wc = (z / 2) % 2 ? WALL : WALL2;
    const col = z < 0 ? [58, 60, 68] : wc;
    if (z >= 0 && inWin(z)) {
      quad([[-5, 0, z], [-5, 0, z + 2], [-5, 0.9, z + 2], [-5, 0.9, z]], [1, 0, 0], wc, { shell: true });
      quad([[-5, 2.6, z], [-5, 2.6, z + 2], [-5, H, z + 2], [-5, H, z]], [1, 0, 0], wc, { shell: true });
      quad([[-5.001, 0.9, z], [-5.001, 0.9, z + 2], [-5.001, 2.6, z + 2], [-5.001, 2.6, z]], [1, 0, 0], [170, 205, 235], { alpha: 0.16, emit: 0.4 });
      box(-5, 0.9, z, 0.08, 1.7, 0.06, [60, 56, 50]);
    } else {
      quad([[-5, 0, z], [-5, 0, z + 2], [-5, H, z + 2], [-5, H, z]], [1, 0, 0], col, { shell: true });
    }
  }
  for (let z = -4; z < 30; z += 2) {
    const col = z < 0 ? [58, 60, 68] : (z / 2) % 2 ? WALL : WALL2;
    quad([[5, 0, z + 2], [5, 0, z], [5, H, z], [5, H, z + 2]], [-1, 0, 0], col, { shell: true });
  }
  for (let x = -5; x < 5; x += 2) {
    quad([[x + 2, 0, 30], [x, 0, 30], [x, H, 30], [x + 2, H, 30]], [0, 0, -1], ((x + 5) / 2) % 2 ? WALL : WALL2, { shell: true });
  }
  for (let z = 0; z < 30; z += 2) {
    box(-4.99, 0, z, 0.03, 0.12, 2, [150, 120, 86], { skip: ['-x', '-y', '+y'], shell: true });
    box(4.96, 0, z, 0.03, 0.12, 2, [150, 120, 86], { skip: ['+x', '-y', '+y'], shell: true });
    box(-4.99, 2.62, z, 0.02, 0.03, 2, GOLD, { faceEmit: { '+x': 0.25 }, shell: true });
    box(4.97, 2.62, z, 0.02, 0.03, 2, GOLD, { faceEmit: { '-x': 0.25 }, shell: true });
  }

  // ---------------------------------------------- entrance wall and glass doors
  const OUT = [52, 56, 64];
  quad([[-5, 0, 0], [-1.15, 0, 0], [-1.15, H, 0], [-5, H, 0]], [0, 0, -1], OUT, { shell: true });
  quad([[1.15, 0, 0], [5, 0, 0], [5, H, 0], [1.15, H, 0]], [0, 0, -1], OUT, { shell: true });
  quad([[-1.15, 2.5, 0], [1.15, 2.5, 0], [1.15, H, 0], [-1.15, H, 0]], [0, 0, -1], OUT, { shell: true });
  box(-1.2, 0, -0.06, 0.06, 2.55, 0.12, GOLD);
  box(1.14, 0, -0.06, 0.06, 2.55, 0.12, GOLD);
  box(-1.2, 2.5, -0.06, 2.4, 0.06, 0.12, GOLD);
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -1.14 : 0.02;
    box(x0, 0.02, -0.03, 1.12, 2.46, 0.03, [170, 205, 235], { alpha: 0.28, door: side });
    box(x0, 0.02, -0.04, 1.12, 0.06, 0.05, GOLD, { door: side });
    box(x0, 2.42, -0.04, 1.12, 0.06, 0.05, GOLD, { door: side });
    box(side < 0 ? -0.1 : 0.04, 0.9, -0.05, 0.06, 0.9, 0.04, GOLD, { door: side });
  }
  label({ text: 'THE FOUNDRY', x: 0, y: 2.88, z: -0.08, size: 0.26, color: GOLD, weight: 800, glow: true, spacing: 0.12 });
  label({ text: 'WORKSPACE', x: 0, y: 2.7, z: -0.08, size: 0.1, color: [235, 230, 220], weight: 600, spacing: 0.3 });
  for (let z = -4; z < 0; z += 2) {
    quad([[-5, 0, z], [-5, 0, z + 2], [-5, H, z + 2], [-5, H, z]], [1, 0, 0], [58, 60, 68], { shell: true });
    quad([[5, 0, z + 2], [5, 0, z], [5, H, z], [5, H, z + 2]], [-1, 0, 0], [58, 60, 68], { shell: true });
  }

  // ------------------------------------------------------ co-working floor
  function desk(cx, z) {
    shadow(cx, z + 0.38, 0.86, 0.55, 0.2); shadow(cx, z - 0.42, 0.32, 0.32, 0.22);
    box(cx - 0.75, 0.72, z, 1.5, 0.04, 0.75, WOOD, { skip: ['-y'], bias: -0.8 });
    for (const lx of [-0.7, 0.66]) for (const lz of [0.04, 0.67]) box(cx + lx, 0, z + lz, 0.05, 0.72, 0.05, [70, 70, 76], { skip: ['-y', '+y'] });
    laptop(cx - 0.02, 0.76, z + 0.36, '-z', 0.36, { screen: SCREEN, maxd: 12 });
    box(cx + 0.45, 0.76, z + 0.3, 0.07, 0.09, 0.07, [240, 240, 240]);
    model(chair, { double: true, x: cx, y: 0, z: z - 0.42, face: '+z', height: 1.0, lift: 22, tint: Math.abs(cx) > 2.7 && z > 5 ? [3, 2.4, 1] : [1.2, 1.25, 1.4], maxd: 12 });
  }
  for (const z of [3.2, 6.2, 9.2]) { desk(-4.0, z); desk(-2.4, z); desk(2.4, z); desk(4.0, z); }

  function plant(x, z, s = 1) {
    model(flowerPotLo, { double: true, x, y: 0, z, height: 1.15 * s, maxd: 14 });
  }
  plant(-4.6, 11.2, 1.1); plant(4.6, 11.2, 1.1); plant(-1.5, 1.6); plant(1.5, 1.6);

  // air conditioners high on the walls (+ a status light)
  const air = (x, y, z, face, w = 0.95) => {
    model(ac, { double: true, x, y, z, face, width: w, anchor: 'back', tint: [1.05, 1.05, 1.1], maxd: 22 });
    const dx = face === '-x' ? -0.2 : face === '+x' ? 0.2 : 0, dz = face === '-z' ? -0.2 : face === '+z' ? 0.2 : 0;
    glow(x + dx, y + 0.12, z + dz, 0.07, [90, 255, 140], 0.9, x + z);
  };
  air(4.99, 2.3, 4.5, '-x'); air(4.99, 2.3, 8.8, '-x');
  air(-4.99, 2.55, 11.0, '+x'); // above the window on the left, near the lounge
  air(4.99, 2.3, 22.5, '-x'); air(-4.99, 2.3, 22.5, '+x');

  // pictures on the right wall
  for (const [z, kind] of [[2.4, 0], [6.4, 1], [10.2, 0]]) {
    model(kind ? pictureFrame : wallFrame, { x: 4.975, y: 1.35, z, face: '-x', width: kind ? 0.95 : 0.62, anchor: 'back', maxd: 14 });
  }

  // ------------------------------------------ meeting room (walk-in, glass)
  // glass wall on x=1.8 from z 12..20 with a doorway at z 15.2..16.4
  const gl = (x, y, z, dx, dy, dz) => box(x, y, z, dx, dy, dz, GLASS, { alpha: 0.2 });
  for (const [a, c2] of [[12, 15.2], [16.4, 20]]) {
    for (let z = a; z < c2; z += 1) { const l = Math.min(1, c2 - z); gl(1.8, 0.9, z, 0.03, 1.7, l); box(1.8, 0, z, 0.04, 0.9, l, [120, 120, 128]); }
  }
  box(1.78, 2.6, 12, 0.08, 0.06, 8, GOLD); box(1.78, 0.9, 12, 0.08, 0.04, 3.2, GOLD); box(1.78, 0.9, 16.4, 0.08, 0.04, 3.6, GOLD);
  for (const z of [12, 15.2, 16.4, 20]) box(1.78, 0, z - 0.03, 0.08, 2.65, 0.06, GOLD);
  box(1.78, 2.2, 15.2, 0.08, 0.06, 1.2, GOLD);
  for (let x = 1.8; x < 5; x += 1) { const l = Math.min(1, 5 - x); gl(x, 0, 20, l, 2.6, 0.03); gl(x, 0, 12, l, 2.6, 0.03); }
  box(1.8, 2.6, 12, 3.2, 0.06, 0.06, GOLD); box(1.8, 2.6, 19.94, 3.2, 0.06, 0.06, GOLD);
  shadow(3.5, 16, 0.85, 3.2, 0.2);
  for (const zz of [13.9, 15.2, 16.6, 18.0]) { shadow(2.5, zz, 0.3, 0.3, 0.2); shadow(4.45, zz, 0.3, 0.3, 0.2); }
  for (let z = 13.2; z < 18.8; z += 1.4) box(3.0, 0.72, z, 1.0, 0.06, Math.min(1.4, 18.8 - z), WALNUT, { skip: ['-y'], bias: -0.8 });
  box(3.35, 0, 13.4, 0.3, 0.72, 0.3, [70, 70, 76], { skip: ['-y'] });
  box(3.35, 0, 17.0, 0.3, 0.72, 0.3, [70, 70, 76], { skip: ['-y'] });
  for (const z of [13.9, 15.2, 16.6, 18.0]) {
    model(chairLo, { double: true, x: 2.5, y: 0, z, face: '+x', height: 0.95, lift: 25, tint: [1.1, 1.2, 1.5], maxd: 14 });
    model(chairLo, { double: true, x: 4.45, y: 0, z, face: '-x', height: 0.95, lift: 25, tint: [1.1, 1.2, 1.5], maxd: 14 });
  }
  laptop(3.2, 0.78, 15.2, '-x', 0.34, { screen: SCREEN, maxd: 12 });
  laptop(3.8, 0.78, 16.6, '+x', 0.34, { screen: SCREEN, maxd: 12 });
  box(4.94, 1.0, 14.3, 0.04, 1.3, 3.4, [20, 22, 28]);
  quad([[4.935, 1.05, 17.6], [4.935, 1.05, 14.4], [4.935, 2.25, 14.4], [4.935, 2.25, 17.6]], [-1, 0, 0], [70, 120, 190], { emit: 0.9 });
  quad([[4.934, 1.55, 17.0], [4.934, 1.55, 15.0], [4.934, 1.85, 15.0], [4.934, 1.85, 17.0]], [-1, 0, 0], [245, 215, 120], { emit: 1 });
  label({ text: 'MEETING ROOM', x: 1.74, y: 2.85, z: 15.8, size: 0.14, color: GOLD, weight: 800, glow: true, spacing: 0.16 });
  air(4.99, 2.45, 12.8, '-x', 0.85); air(4.99, 2.45, 19.2, '-x', 0.85);
  glow(3.5, 3.0, 15.8, 2.2, [255, 235, 190], 0.4, 1);

  // ------------------------------------------------------------ lounge
  function sofa(z) {
    shadow(-4.45, z + 1.0, 0.7, 1.15, 0.22);
    box(-4.85, 0.12, z, 0.95, 0.3, 2.0, [76, 82, 98], { skip: ['-y'] });
    box(-4.85, 0.42, z, 0.28, 0.5, 2.0, [66, 72, 88]);
    box(-4.85, 0.42, z, 0.95, 0.28, 0.2, [66, 72, 88]);
    box(-4.85, 0.42, z + 1.8, 0.95, 0.28, 0.2, [66, 72, 88]);
    for (let i = 0; i < 2; i++) box(-4.55, 0.42, z + 0.25 + i * 0.77, 0.6, 0.12, 0.72, [96, 104, 124], { skip: ['-y'] });
  }
  sofa(13.2); sofa(16.8);
  box(-3.5, 0.0, 15.2, 0.7, 0.38, 1.1, WALNUT, { skip: ['-y'] });
  model(vaseFlowers, { double: true, x: -3.15, y: 0.38, z: 15.75, height: 0.4, maxd: 14 });
  plant(-4.6, 19.2, 1.2); plant(-1.6, 12.4);

  // --------------------------- virtual office: its own room, glass door at z 21
  const PART = [226, 219, 205];
  for (const [a0, a1] of [[-5, -1.4], [1.4, 5]]) strip('x', a0, a1, 0, H, 21, [0, 0, -1], PART);
  quad([[-1.4, 2.5, 21], [1.4, 2.5, 21], [1.4, H, 21], [-1.4, H, 21]], [0, 0, -1], PART);
  box(-1.45, 0, 20.94, 0.08, 2.55, 0.12, GOLD); box(1.37, 0, 20.94, 0.08, 2.55, 0.12, GOLD); box(-1.45, 2.5, 20.94, 2.9, 0.06, 0.12, GOLD);
  for (const side of [-2, 2]) {
    const sgn = side < 0 ? -1 : 1, x0 = sgn < 0 ? -1.37 : 0.02;
    box(x0, 0.02, 20.97, 1.35, 2.46, 0.03, GLASS, { alpha: 0.28, door: side });
    box(x0, 0.02, 20.96, 1.35, 0.06, 0.05, GOLD, { door: side });
    box(x0, 2.42, 20.96, 1.35, 0.06, 0.05, GOLD, { door: side });
    box(sgn < 0 ? -0.1 : 0.04, 0.9, 20.95, 0.06, 0.9, 0.04, GOLD, { door: side });
  }
  label({ text: 'VIRTUAL OFFICE', x: 0, y: 2.82, z: 20.9, size: 0.16, color: GOLD, weight: 800, glow: true, spacing: 0.16 });
  // back of the partition (inside)
  for (const [a0, a1] of [[-5, -1.4], [1.4, 5]]) strip('x', a0, a1, 0, H, 21.01, [0, 0, 1], PART);
  // mailboxes on the left wall
  const MAIL = [[168, 172, 182], [150, 155, 166]];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    box(-4.94, 0.5 + r * 0.46, 21.9 + c * 0.42, 0.18, 0.4, 0.38, MAIL[(r + c) % 2], { faceColor: { '+x': (r + c) % 3 === 0 ? [188, 148, 60] : MAIL[(r + c) % 2] } });
  }
  label({ text: 'MAIL & ADDRESS SERVICE', x: -4.9, y: 2.5, z: 23.8, size: 0.1, color: GOLD, weight: 700, spacing: 0.18, glow: true });
  // ---- a private, furnished office (a person works here) ----
  // area rug
  for (let z = 25.4; z < 29.4; z += 1) quad([[-4.4, 0.012, z], [-1.6, 0.012, z], [-1.6, 0.012, z + 1], [-4.4, 0.012, z + 1]].reverse(), [0, 1, 0], z % 2 ? [128, 86, 70] : [118, 78, 64], { shell: true, pool: 1, bias: 1 });
  shadow(-3.1, 27.2, 0.7, 1.15, 0.22); shadow(-4.15, 27.2, 0.4, 0.4, 0.22); shadow(3.9, 27.8, 1.1, 0.6, 0.2);
  // executive desk, side-on: sitter on the -x side, facing +x
  box(-3.55, 0.72, 26.2, 0.9, 0.05, 2.0, WALNUT, { skip: ['-y'], bias: -0.8 });
  box(-3.5, 0.0, 26.25, 0.06, 0.72, 0.06, [60, 52, 46], { skip: ['-y', '+y'] });
  box(-3.5, 0.0, 28.1, 0.06, 0.72, 0.06, [60, 52, 46], { skip: ['-y', '+y'] });
  box(-2.7, 0.0, 26.25, 0.06, 0.72, 0.06, [60, 52, 46], { skip: ['-y', '+y'] });
  box(-2.7, 0.0, 28.1, 0.06, 0.72, 0.06, [60, 52, 46], { skip: ['-y', '+y'] });
  box(-2.72, 0.2, 26.3, 0.04, 0.5, 1.8, [88, 62, 44]); // modesty panel
  laptop(-3.1, 0.77, 27.0, '-x', 0.4, { screen: SCREEN, maxd: 24 });
  box(-3.2, 0.77, 27.75, 0.18, 0.012, 0.28, [235, 232, 222]); // notepad
  box(-3.25, 0.77, 26.45, 0.07, 0.09, 0.07, [240, 240, 240]); // mug
  box(-2.95, 0.77, 26.4, 0.1, 0.02, 0.1, [60, 62, 70]); box(-2.93, 0.79, 26.42, 0.02, 0.28, 0.02, GOLD); box(-3.0, 1.06, 26.36, 0.14, 0.04, 0.08, GOLD, { emit: 0.8 });
  glow(-2.95, 1.0, 26.4, 0.35, [255, 224, 160], 0.7, 5, 70);
  model(chair, { double: true, x: -4.15, y: 0, z: 27.2, face: '+x', height: 1.05, lift: 30, tint: [1.2, 1.1, 1], maxd: 24 });
  // bookshelf and the address sign on the back wall
  box(-2.4, 0, 29.6, 4.8, 1.25, 0.34, [92, 64, 44], { skip: ['-y'] });
  const BOOK = [[150, 50, 60], [60, 90, 140], [200, 170, 80], [70, 120, 90], [220, 215, 205], [120, 80, 130]];
  for (let i = 0; i < 24; i++) {
    box(-2.3 + i * 0.19, 0.08, 29.58, 0.15, 0.34 + (i % 3) * 0.04, 0.2, BOOK[i % 6]);
    box(-2.3 + i * 0.19, 0.62, 29.58, 0.15, 0.3 + ((i + 1) % 3) * 0.05, 0.2, BOOK[(i + 2) % 6]);
  }
  box(-2.2, 1.45, 29.94, 4.4, 1.25, 0.06, [30, 32, 38]);
  box(-2.26, 1.41, 29.92, 4.52, 0.05, 0.1, GOLD, { faceEmit: { '-z': 0.3 } });
  box(-2.26, 2.7, 29.92, 4.52, 0.05, 0.1, GOLD, { faceEmit: { '-z': 0.3 } });
  label({ text: 'VIRTUAL OFFICE', x: 0, y: 2.36, z: 29.9, size: 0.22, color: GOLD, weight: 800, glow: true, spacing: 0.1 });
  label({ text: '__ADDRESS__', x: 0, y: 1.98, z: 29.9, size: 0.15, color: [250, 245, 232], weight: 600, glow: true, spacing: 0.02 });
  label({ text: 'Your own office and business address in Lagos', x: 0, y: 1.68, z: 29.9, size: 0.09, color: [200, 195, 185], weight: 500, spacing: 0.05 });
  glow(0, 2.1, 29.5, 2.2, [255, 220, 150], 0.3, 3, 160);
  // window on the right wall
  for (const [a0, a1, c3] of [[0.9, 1.5, [200, 222, 248]], [1.5, 2.0, [214, 232, 252]], [2.0, 2.5, [232, 243, 255]]]) {
    quad([[4.99, a0, 22.4], [4.99, a0, 25.6], [4.99, a1, 25.6], [4.99, a1, 22.4]], [-1, 0, 0], c3, { emit: 1, shell: true });
  }
  box(4.94, 0.9, 22.35, 0.06, 1.6, 0.06, [60, 56, 50]); box(4.94, 0.9, 25.6, 0.06, 1.6, 0.06, [60, 56, 50]); box(4.94, 0.9, 24.0, 0.04, 1.6, 0.05, [60, 56, 50]);
  // a small lounge corner
  box(3.0, 0.12, 27.2, 1.9, 0.3, 0.9, [182, 140, 52], { skip: ['-y'] });
  box(3.0, 0.42, 27.9, 1.9, 0.5, 0.2, [160, 122, 44]);
  box(1.4, 0, 27.1, 0.7, 0.4, 0.7, WALNUT, { skip: ['-y'] });
  model(vaseFlowers, { double: true, x: 1.4, y: 0.4, z: 27.1, height: 0.38, maxd: 22 });
  model(flowerPot, { double: true, x: 4.4, y: 0, z: 24.6, height: 1.25, maxd: 22 });
  model(flowerPot, { double: true, x: 4.4, y: 0, z: 29.2, height: 1.25, maxd: 22 });
  model(flowerPot, { double: true, x: -4.4, y: 0, z: 29.2, height: 1.25, maxd: 22 });
  model(wallFrame, { x: 4.975, y: 1.35, z: 28.2, face: '-x', width: 0.62, anchor: 'back', maxd: 22 });
  model(pictureFrame, { x: -4.975, y: 1.3, z: 27.2, face: '+x', width: 0.95, anchor: 'back', maxd: 22 });
  model(wallFrame, { x: -4.975, y: 1.5, z: 28.6, face: '+x', width: 0.6, anchor: 'back', maxd: 22 });

  return b;
}
