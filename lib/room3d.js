// A tiny 3D engine for the home-page "walk into the workspace" scene.
// Plain 2D canvas: no WebGL, no libraries. Everything is built from flat
// coloured polygons (boxes and quads) that are projected, depth-sorted
// (painter's algorithm), shaded and fogged every frame.
//
// World units are metres. x = right, y = up, z = forward (into the room).
// The room is 10 m wide (x -5..5) and 30 m long (z 0..30), 3.2 m high.

const H = 3.2;
const FOG = [208, 199, 184];
const LIGHT = norm([-0.35, 0.85, -0.4]);

function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
const GOLD = [202, 160, 58];
const WALL = [233, 227, 214];
const WALL2 = [226, 219, 205];
const INK = [38, 40, 46];

// ------------------------------------------------------------------ scene
export function buildScene() {
  const faces = []; // { v:[[x,y,z]...], n:[x,y,z], c:[r,g,b], emit, alpha, double, shell }
  const labels = []; // { text, x, y, z, size, color, weight, glow }
  const doors = []; // sliding door leaves: faces that move with `open`

  const quad = (v, n, c, o = {}) => faces.push({ v, n, c, emit: o.emit || 0, alpha: o.alpha ?? 1, double: !!o.double, shell: !!o.shell, door: o.door || 0, pool: o.pool || 0 });

  // Axis-aligned box. skip = faces not to build ('+x','-x','+y','-y','+z','-z').
  function box(x, y, z, dx, dy, dz, c, o = {}) {
    const x1 = x + dx, y1 = y + dy, z1 = z + dz;
    const skip = o.skip || [];
    const F = {
      '+x': [[[x1, y, z], [x1, y, z1], [x1, y1, z1], [x1, y1, z]], [1, 0, 0]],
      '-x': [[[x, y, z1], [x, y, z], [x, y1, z], [x, y1, z1]], [-1, 0, 0]],
      '+y': [[[x, y1, z], [x1, y1, z], [x1, y1, z1], [x, y1, z1]], [0, 1, 0]],
      '-y': [[[x, y, z1], [x1, y, z1], [x1, y, z], [x, y, z]], [0, -1, 0]],
      '+z': [[[x1, y, z1], [x, y, z1], [x, y1, z1], [x1, y1, z1]], [0, 0, 1]],
      '-z': [[[x, y, z], [x1, y, z], [x1, y1, z], [x, y1, z]], [0, 0, -1]]
    };
    for (const k of Object.keys(F)) {
      if (skip.includes(k)) continue;
      const col = o.faceColor?.[k] || c;
      const em = o.faceEmit?.[k] ?? o.emit ?? 0;
      quad(F[k][0], F[k][1], col, { emit: em, alpha: o.alpha, door: o.door });
    }
  }

  // ---------------------------------------------------------- the shell
  // Floor: wood tiles, lit in pools under the ceiling lights.
  for (let z = -4; z < 30; z++) {
    for (let x = -5; x < 5; x++) {
      const outside = z < 0;
      const alt = (x + z) % 2 === 0;
      const c = outside ? (alt ? [70, 72, 80] : [62, 64, 72]) : alt ? [190, 150, 104] : [180, 141, 97];
      quad([[x, 0, z], [x + 1, 0, z], [x + 1, 0, z + 1], [x, 0, z + 1]], [0, 1, 0], c, { shell: true, pool: 1 });
    }
  }
  // Runner carpet down the middle, with gold edges.
  for (let z = 0; z < 30; z++) {
    quad([[-1, 0.01, z], [1, 0.01, z], [1, 0.01, z + 1], [-1, 0.01, z + 1]], [0, 1, 0], z % 2 ? [66, 64, 72] : [60, 58, 66], { shell: true, pool: 1 });
    quad([[-1.06, 0.012, z], [-1, 0.012, z], [-1, 0.012, z + 1], [-1.06, 0.012, z + 1]], [0, 1, 0], GOLD, { shell: true, emit: 0.2 });
    quad([[1, 0.012, z], [1.06, 0.012, z], [1.06, 0.012, z + 1], [1, 0.012, z + 1]], [0, 1, 0], GOLD, { shell: true, emit: 0.2 });
  }
  // Ceiling, with long light panels.
  for (let z = -4; z < 30; z += 2) {
    for (let x = -5; x < 5; x += 2) {
      quad([[x, H, z + 2], [x + 2, H, z + 2], [x + 2, H, z], [x, H, z]], [0, -1, 0], z < 0 ? [50, 52, 58] : [238, 234, 226], { shell: true });
    }
  }
  for (let z = 1.5; z < 29; z += 3.5) {
    for (const lx of [-2.6, 2.6]) {
      quad([[lx - 0.9, H - 0.01, z + 0.4], [lx + 0.9, H - 0.01, z + 0.4], [lx + 0.9, H - 0.01, z - 0.4], [lx - 0.9, H - 0.01, z - 0.4]], [0, -1, 0], [255, 250, 236], { emit: 1 });
    }
  }
  // Left wall (windows over the co-working area and the lounge).
  const winZ = [[2, 10], [12, 20]];
  const inWin = (z0) => winZ.some(([a, b]) => z0 >= a && z0 + 2 <= b);
  for (let z = -4; z < 30; z += 2) {
    const wc = (z / 2) % 2 ? WALL : WALL2;
    const col = z < 0 ? [58, 60, 68] : wc;
    if (z >= 0 && inWin(z)) {
      quad([[-5, 0, z], [-5, 0, z + 2], [-5, 0.9, z + 2], [-5, 0.9, z]], [1, 0, 0], wc, { shell: true });
      quad([[-5, 2.6, z], [-5, 2.6, z + 2], [-5, H, z + 2], [-5, H, z]], [1, 0, 0], wc, { shell: true });
      // sky: three bands, brighter at the top
      const bands = [[0.9, 1.45, [200, 222, 248]], [1.45, 2.0, [214, 232, 252]], [2.0, 2.6, [232, 243, 255]]];
      for (const [a, b, c] of bands) quad([[-5.001, a, z], [-5.001, a, z + 2], [-5.001, b, z + 2], [-5.001, b, z]], [1, 0, 0], c, { emit: 1, shell: true });
      box(-5, 0.9, z, 0.08, 1.7, 0.06, [60, 56, 50]);
    } else {
      quad([[-5, 0, z], [-5, 0, z + 2], [-5, H, z + 2], [-5, H, z]], [1, 0, 0], col, { shell: true });
    }
  }
  // Right wall, with framed pictures.
  for (let z = -4; z < 30; z += 2) {
    const col = z < 0 ? [58, 60, 68] : (z / 2) % 2 ? WALL : WALL2;
    quad([[5, 0, z + 2], [5, 0, z], [5, H, z], [5, H, z + 2]], [-1, 0, 0], col, { shell: true });
  }
  // Back wall.
  for (let x = -5; x < 5; x += 2) {
    quad([[x + 2, 0, 30], [x, 0, 30], [x, H, 30], [x + 2, H, 30]], [0, 0, -1], ((x + 5) / 2) % 2 ? WALL : WALL2, { shell: true });
  }
  // Skirting boards and a gold line round the room.
  for (let z = 0; z < 30; z += 2) {
    box(-4.99, 0, z, 0.03, 0.12, 2, [150, 120, 86], { skip: ['-x', '-y', '+y'] });
    box(4.96, 0, z, 0.03, 0.12, 2, [150, 120, 86], { skip: ['+x', '-y', '+y'] });
    box(-4.99, 2.62, z, 0.02, 0.03, 2, GOLD, { faceEmit: { '+x': 0.25 } });
    box(4.97, 2.62, z, 0.02, 0.03, 2, GOLD, { faceEmit: { '-x': 0.25 } });
  }
  // Entrance wall (seen from outside first) with a glass double door.
  const OUT = [52, 56, 64];
  quad([[-5, 0, 0], [-1.15, 0, 0], [-1.15, H, 0], [-5, H, 0]], [0, 0, -1], OUT, { shell: true });
  quad([[1.15, 0, 0], [5, 0, 0], [5, H, 0], [1.15, H, 0]], [0, 0, -1], OUT, { shell: true });
  quad([[-1.15, 2.5, 0], [1.15, 2.5, 0], [1.15, H, 0], [-1.15, H, 0]], [0, 0, -1], OUT, { shell: true });
  box(-1.2, 0, -0.06, 0.06, 2.55, 0.12, GOLD);
  box(1.14, 0, -0.06, 0.06, 2.55, 0.12, GOLD);
  box(-1.2, 2.5, -0.06, 2.4, 0.06, 0.12, GOLD);
  for (const side of [-1, 1]) {
    // each leaf slides outward by `door` (set per frame)
    const x0 = side < 0 ? -1.14 : 0.02;
    box(x0, 0.02, -0.03, 1.12, 2.46, 0.03, [170, 205, 235], { alpha: 0.28, door: side });
    box(x0, 0.02, -0.04, 1.12, 0.06, 0.05, GOLD, { door: side });
    box(x0, 2.42, -0.04, 1.12, 0.06, 0.05, GOLD, { door: side });
    box(side < 0 ? -0.1 : 0.04, 0.9, -0.05, 0.06, 0.9, 0.04, GOLD, { door: side });
  }
  labels.push({ text: 'THE FOUNDRY', x: 0, y: 2.88, z: -0.08, size: 0.26, color: GOLD, weight: 800, glow: true, spacing: 0.12 });
  labels.push({ text: 'WORKSPACE', x: 0, y: 2.7, z: -0.08, size: 0.1, color: [235, 230, 220], weight: 600, spacing: 0.3 });
  // outside side walls
  for (let z = -4; z < 0; z += 2) {
    quad([[-5, 0, z], [-5, 0, z + 2], [-5, H, z + 2], [-5, H, z]], [1, 0, 0], [58, 60, 68], { shell: true });
    quad([[5, 0, z + 2], [5, 0, z], [5, H, z], [5, H, z + 2]], [-1, 0, 0], [58, 60, 68], { shell: true });
  }

  // -------------------------------------------------------- furniture
  const WOOD = [168, 124, 84];
  const WALNUT = [98, 68, 46];
  const SCREEN = [120, 170, 235];

  function chair(cx, cz, dir, c = INK) {
    // dir = the way the person faces; the backrest is behind them.
    const f = { '+z': [0, 1], '-z': [0, -1], '+x': [1, 0], '-x': [-1, 0] }[dir];
    const bx = cx - f[0] * 0.21, bz = cz - f[1] * 0.21;
    box(cx - 0.22, 0.44, cz - 0.22, 0.44, 0.07, 0.44, c, { skip: ['-y'] });
    const wide = f[0] ? [0.06, 0.5, 0.44] : [0.44, 0.5, 0.06];
    box(bx - wide[0] / 2, 0.5, bz - wide[2] / 2, wide[0], wide[1], wide[2], c);
    box(cx - 0.03, 0.06, cz - 0.03, 0.06, 0.38, 0.06, [120, 120, 126], { skip: ['-y', '+y'] });
    box(cx - 0.25, 0.02, cz - 0.25, 0.5, 0.04, 0.5, [70, 72, 78], { skip: ['-y'] });
  }
  function plant(x, z, s = 1) {
    box(x - 0.17 * s, 0, z - 0.17 * s, 0.34 * s, 0.34 * s, 0.34 * s, [176, 98, 66], { skip: ['-y'] });
    box(x - 0.24 * s, 0.34 * s, z - 0.24 * s, 0.48 * s, 0.34 * s, 0.48 * s, [58, 128, 72], { skip: ['-y'] });
    box(x - 0.17 * s, 0.68 * s, z - 0.17 * s, 0.34 * s, 0.34 * s, 0.34 * s, [76, 150, 86], { skip: ['-y'] });
    box(x - 0.1 * s, 1.0 * s, z - 0.1 * s, 0.2 * s, 0.22 * s, 0.2 * s, [96, 168, 100], { skip: ['-y'] });
  }
  function desk(cx, z) {
    // long side along x; the person sits on the near (-z) side facing +z
    box(cx - 0.75, 0.72, z, 1.5, 0.04, 0.75, WOOD, { skip: ['-y'] });
    for (const lx of [-0.7, 0.66]) for (const lz of [0.04, 0.67]) box(cx + lx, 0, z + lz, 0.05, 0.72, 0.05, [70, 70, 76], { skip: ['-y', '+y'] });
    // laptop: base + upright lit screen facing the person (-z)
    box(cx - 0.17, 0.76, z + 0.2, 0.34, 0.015, 0.24, [90, 92, 100]);
    box(cx - 0.17, 0.77, z + 0.44, 0.34, 0.22, 0.012, [40, 42, 48], { faceEmit: { '-z': 0 }, faceColor: { '-z': SCREEN }, skip: [] });
    quad([[cx - 0.16, 0.78, z + 0.436], [cx + 0.16, 0.78, z + 0.436], [cx + 0.16, 0.97, z + 0.436], [cx - 0.16, 0.97, z + 0.436]], [0, 0, -1], SCREEN, { emit: 0.95 });
    box(cx + 0.45, 0.76, z + 0.3, 0.07, 0.09, 0.07, [240, 240, 240]); // mug
    chair(cx, z - 0.35, '+z', Math.abs(cx) > 2.7 && z > 5 ? [182, 140, 52] : INK);
  }
  // Co-working: two pods per row on each side, three rows.
  for (const z of [3.2, 6.2, 9.2]) {
    desk(-4.0, z); desk(-2.4, z);
    desk(2.4, z); desk(4.0, z);
  }
  plant(-4.6, 11.2, 1.1); plant(4.6, 11.2, 1.1); plant(-1.5, 1.6); plant(1.5, 1.6);

  // Meeting room (right side, glass walls).
  const GLASS = [170, 205, 235];
  box(1.8, 0, 12, 0.04, 0.9, 8, [120, 120, 128], { skip: [] }); // low panel
  box(1.8, 0.9, 12, 0.03, 1.7, 8, GLASS, { alpha: 0.2 });
  box(1.78, 2.6, 12, 0.08, 0.06, 8, GOLD);
  box(1.78, 0.9, 12, 0.08, 0.04, 8, GOLD);
  for (let z = 12; z <= 20; z += 2) box(1.78, 0.9, z - 0.03, 0.08, 1.7, 0.06, GOLD);
  box(1.8, 0, 20, 3.2, 2.6, 0.03, GLASS, { alpha: 0.2 });
  box(1.8, 0, 12, 0.6, 2.6, 0.03, GLASS, { alpha: 0.2 });
  box(3.4, 0, 12, 1.6, 2.6, 0.03, GLASS, { alpha: 0.2 });
  box(1.8, 2.6, 12, 3.2, 0.06, 0.06, GOLD);
  // table in segments so it sorts well
  for (let z = 13.2; z < 18.8; z += 1.4) box(2.8, 0.72, z, 1.0, 0.06, 1.4, WALNUT, { skip: ['-y'] });
  box(3.15, 0, 13.4, 0.3, 0.72, 0.3, [70, 70, 76], { skip: ['-y'] });
  box(3.15, 0, 17.0, 0.3, 0.72, 0.3, [70, 70, 76], { skip: ['-y'] });
  for (const z of [13.8, 15.2, 16.6, 18.0]) { chair(2.2, z, '+x', [60, 64, 74]); chair(4.4, z, '-x', [60, 64, 74]); }
  // wall screen showing a slide
  box(4.94, 1.0, 14.3, 0.04, 1.3, 3.4, [20, 22, 28]);
  quad([[4.935, 1.05, 17.6], [4.935, 1.05, 14.4], [4.935, 2.25, 14.4], [4.935, 2.25, 17.6]], [-1, 0, 0], [70, 120, 190], { emit: 0.9 });
  quad([[4.934, 1.55, 17.0], [4.934, 1.55, 15.0], [4.934, 1.85, 15.0], [4.934, 1.85, 17.0]], [-1, 0, 0], [245, 215, 120], { emit: 1 });
  // sign over the meeting-room door
  labels.push({ text: 'MEETING ROOM', x: 4.2, y: 2.82, z: 11.96, size: 0.14, color: GOLD, weight: 800, glow: true, spacing: 0.16 });

  // Lounge on the left (windows beside it).
  function sofa(z) {
    box(-4.85, 0.12, z, 0.95, 0.3, 2.0, [76, 82, 98], { skip: ['-y'] });
    box(-4.85, 0.42, z, 0.28, 0.5, 2.0, [66, 72, 88]);
    box(-4.85, 0.42, z, 0.95, 0.28, 0.2, [66, 72, 88]);
    box(-4.85, 0.42, z + 1.8, 0.95, 0.28, 0.2, [66, 72, 88]);
    for (let i = 0; i < 2; i++) box(-4.55, 0.42, z + 0.25 + i * 0.77, 0.6, 0.12, 0.72, [96, 104, 124], { skip: ['-y'] });
  }
  sofa(13.2); sofa(16.8);
  box(-3.5, 0.0, 15.2, 0.7, 0.38, 1.1, WALNUT, { skip: ['-y'] });
  box(-3.3, 0.38, 15.5, 0.2, 0.1, 0.2, GOLD);
  plant(-4.6, 19.2, 1.2); plant(-1.6, 12.4);

  // Reception / virtual office.
  const MAIL = [[168, 172, 182], [150, 155, 166]];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      box(-4.94, 0.5 + r * 0.46, 21.6 + c * 0.42, 0.18, 0.4, 0.38, MAIL[(r + c) % 2], { faceColor: { '+x': (r + c) % 3 === 0 ? [188, 148, 60] : MAIL[(r + c) % 2] } });
    }
  }
  // desk with front panel, 4 segments
  for (let x = -2.4; x < 2.4; x += 1.2) {
    box(x, 0, 26.2, 1.2, 1.08, 0.7, [48, 50, 58], { faceColor: { '-z': (Math.round(x * 2) % 2) ? [58, 60, 70] : [52, 54, 64] } });
    box(x, 1.08, 26.12, 1.2, 0.06, 0.86, WALNUT, { skip: ['-y'] });
  }
  box(-2.4, 0.35, 26.19, 4.8, 0.05, 0.012, GOLD, { faceEmit: { '-z': 0.4 } });
  box(-0.3, 1.14, 26.5, 0.6, 0.012, 0.3, [90, 92, 100]);
  box(-0.28, 1.15, 26.78, 0.56, 0.34, 0.012, [40, 42, 48]);
  quad([[-0.26, 1.17, 26.774], [0.26, 1.17, 26.774], [0.26, 1.46, 26.774], [-0.26, 1.46, 26.774]], [0, 0, -1], SCREEN, { emit: 0.9 });
  chair(0, 27.2, '-z', [182, 140, 52]);
  // lit sign wall behind the desk
  box(-3.0, 0.9, 29.94, 6.0, 1.8, 0.06, [30, 32, 38]);
  box(-3.06, 0.86, 29.92, 6.12, 0.05, 0.1, GOLD, { faceEmit: { '-z': 0.3 } });
  box(-3.06, 2.7, 29.92, 6.12, 0.05, 0.1, GOLD, { faceEmit: { '-z': 0.3 } });
  labels.push({ text: 'VIRTUAL OFFICE', x: 0, y: 2.25, z: 29.9, size: 0.3, color: GOLD, weight: 800, glow: true, spacing: 0.1 });
  labels.push({ text: '__ADDRESS__', x: 0, y: 1.65, z: 29.9, size: 0.2, color: [250, 245, 232], weight: 600, glow: true, spacing: 0.02 });
  labels.push({ text: 'Your business address in Lagos', x: 0, y: 1.2, z: 29.9, size: 0.12, color: [200, 195, 185], weight: 500, spacing: 0.06 });
  // waiting corner on the right
  box(3.4, 0.12, 22.4, 1.5, 0.32, 0.9, [182, 140, 52], { skip: ['-y'] });
  box(3.4, 0.44, 23.2, 1.5, 0.5, 0.18, [160, 122, 44]);
  plant(4.5, 24.6, 1.2); plant(-4.5, 29.4, 1.3); plant(4.5, 29.4, 1.3); plant(-1.8, 25.0);

  return { faces, labels };
}

// ----------------------------------------------------------------- camera
const smooth = (t) => t * t * (3 - 2 * t);
function keyframes(p, frames, i) {
  if (p <= frames[0][0]) return frames[0][i];
  for (let k = 0; k < frames.length - 1; k++) {
    const [p0] = frames[k], [p1] = frames[k + 1];
    if (p <= p1) return frames[k][i] + (frames[k + 1][i] - frames[k][i]) * smooth((p - p0) / (p1 - p0));
  }
  return frames[frames.length - 1][i];
}
// progress p (0..1) -> where the camera is and where it looks
const PATH = [
  // p, z, yaw, pitch
  [0.0, -3.2, 0, 0.02],
  [0.1, -1.6, 0, 0.02],
  [0.2, 3.0, -0.12, -0.03],
  [0.32, 7.0, -0.55, -0.1],
  [0.42, 10.6, 0.05, -0.04],
  [0.5, 13.0, 0.35, -0.05],
  [0.62, 16.0, 0.72, -0.1],
  [0.72, 19.8, 0.1, -0.03],
  [0.82, 21.4, -0.2, -0.05],
  [0.94, 23.4, 0, -0.04],
  [1.0, 23.6, 0, -0.04]
];
export function cameraAt(p) {
  return { z: keyframes(p, PATH, 1), yaw: keyframes(p, PATH, 2), pitch: keyframes(p, PATH, 3) };
}

// ----------------------------------------------------------------- render
const NEAR = 0.12;

export function render(ctx, scene, w, h, state) {
  const { z: cz, yaw, pitch, open, time, address, lightsOnly } = state;
  const cx = state.x || 0;
  const cy = 1.55 + Math.sin(cz * 1.7) * 0.018;
  const f = 0.5 * w / Math.tan((w < h ? 1.7 : 1.5) / 2);
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);

  // background = haze
  ctx.fillStyle = `rgb(${FOG[0]},${FOG[1]},${FOG[2]})`;
  ctx.fillRect(0, 0, w, h);

  const toCam = (p, dx) => {
    const x = p[0] + (dx || 0) - cx, y = p[1] - cy, z = p[2] - cz;
    const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw; // yaw
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; // pitch
    return [x1, y2, z2];
  };

  const items = [];
  for (const fc of scene.faces) {
    const dx = fc.door ? fc.door * open * 1.0 : 0;
    // back-face cull (shell and double-sided faces are drawn both ways)
    const v0 = fc.v[0];
    if (!fc.double) {
      const d = (cx - (v0[0] + dx)) * fc.n[0] + (cy - v0[1]) * fc.n[1] + (cz - v0[2]) * fc.n[2];
      if (d <= 0 && fc.alpha >= 1) continue;
      if (d <= 0 && fc.alpha < 1) continue;
    }
    let pts = fc.v.map((p) => toCam(p, dx));
    // near-plane clip (Sutherland–Hodgman)
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ain = a[2] > NEAR, bin = b[2] > NEAR;
      if (ain) out.push(a);
      if (ain !== bin) {
        const t = (NEAR - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
      }
    }
    if (out.length < 3) continue;
    let depth = 0;
    for (const p of out) depth += p[2];
    depth /= out.length;
    if (depth > 36) continue;
    items.push({ t: 0, fc, out, depth, shell: fc.shell });
  }
  for (const lb of scene.labels) {
    const p = toCam([lb.x, lb.y, lb.z]);
    if (p[2] > 0.4 && p[2] < 36) items.push({ t: 1, lb, p, depth: p[2] - 0.05 });
  }
  // shell first (far to near), then objects (far to near)
  items.sort((a, b) => (a.shell === b.shell ? b.depth - a.depth : a.shell ? -1 : 1));

  const poolBoost = (x, z) => {
    // soft pools of light under the ceiling light rows
    let b = 0;
    for (let lz = 1.5; lz < 29; lz += 3.5) {
      for (const lx of [-2.6, 2.6]) {
        const d = Math.hypot(x - lx, z - lz);
        b = Math.max(b, Math.max(0, 1 - d / 3.2));
      }
    }
    return b;
  };

  for (const it of items) {
    if (it.t === 1) {
      const lb = it.lb, p = it.p;
      const sx = w / 2 + (f * p[0]) / p[2], sy = h / 2 - (f * p[1]) / p[2];
      const px = (lb.size * f) / p[2];
      if (px < 5 || sx < -w || sx > 2 * w) continue;
      const fog = Math.min(0.7, Math.max(0, (p[2] - 6) / 34));
      const col = lb.color.map((c, i) => Math.round(c + (FOG[i] - c) * fog));
      ctx.save();
      ctx.font = `${lb.weight || 700} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (lb.spacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${(lb.spacing * px).toFixed(1)}px`;
      if (lb.glow) { ctx.shadowColor = `rgba(${lb.color[0]},${lb.color[1]},${lb.color[2]},0.75)`; ctx.shadowBlur = px * 0.5; }
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.fillText(lb.text === '__ADDRESS__' ? address : lb.text, sx, sy);
      ctx.restore();
      continue;
    }
    const { fc, out, depth } = it;
    // shade
    const lit = 0.6 + 0.4 * Math.max(0, fc.n[0] * LIGHT[0] + fc.n[1] * LIGHT[1] + fc.n[2] * LIGHT[2]);
    let k = fc.emit ? fc.emit + (1 - fc.emit) * lit : lit;
    if (fc.pool) {
      const v = fc.v[0];
      k = Math.min(1.12, k * (0.78 + 0.34 * poolBoost(v[0] + 0.5, v[2] + 0.5)));
    }
    const fog = Math.min(0.62, Math.max(0, (depth - 5) / 36)) * (fc.emit > 0.8 ? 0.4 : 1);
    const r = Math.min(255, fc.c[0] * k) * (1 - fog) + FOG[0] * fog;
    const g = Math.min(255, fc.c[1] * k) * (1 - fog) + FOG[1] * fog;
    const bl = Math.min(255, fc.c[2] * k) * (1 - fog) + FOG[2] * fog;
    const css = fc.alpha < 1 ? `rgba(${r | 0},${g | 0},${bl | 0},${fc.alpha})` : `rgb(${r | 0},${g | 0},${bl | 0})`;
    ctx.beginPath();
    for (let i = 0; i < out.length; i++) {
      const p = out[i];
      const sx = w / 2 + (f * p[0]) / p[2], sy = h / 2 - (f * p[1]) / p[2];
      i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
    }
    ctx.closePath();
    ctx.fillStyle = css;
    ctx.fill();
    if (fc.alpha >= 1) { ctx.strokeStyle = css; ctx.lineWidth = 0.7; ctx.stroke(); }
  }

  // warm vignette + light bloom so it reads as a lit room
  const vg = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,14,6,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  void time; void lightsOnly;
}
