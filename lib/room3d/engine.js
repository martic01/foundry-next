// A tiny 3D engine for the "walk-in" sections of the home page.
// Plain 2D canvas: no WebGL, no libraries. Everything is flat-coloured
// polygons (boxes, quads and baked triangle models) that are projected,
// depth-sorted (painter's algorithm), shaded and fogged every frame.
//
// World units are metres. x = right, y = up, z = forward (into the room).

const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const LIGHT = norm([-0.35, 0.85, -0.4]);
const NEAR = 0.12;
export const GOLD = [202, 160, 58];

// ----------------------------------------------------------------- builder
export function createBuilder(env = {}) {
  const faces = []; // static geometry
  const groups = []; // model instances: { x, z, r, maxd, faces }
  const labels = [];
  const glows = [];

  const quad = (v, n, c, o = {}) => (o.group || faces).push({ v, n, c, emit: o.emit || 0, alpha: o.alpha ?? 1, shell: !!o.shell, door: o.door || 0, pool: o.pool || 0, cyc: o.cyc, bias: o.bias || 0 });

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
      quad(F[k][0], F[k][1], o.faceColor?.[k] || c, { emit: o.faceEmit?.[k] ?? o.emit ?? 0, alpha: o.alpha, door: o.door, shell: o.shell, pool: o.pool, group: o.group, bias: o.bias });
    }
  }

  // Low-poly "bloom" / balloon: an octahedron stretched by (rx, ry, rz).
  function blob(x, y, z, rx, ry, rz, c, o = {}) {
    const P = [[x + rx, y, z], [x - rx, y, z], [x, y + ry, z], [x, y - ry, z], [x, y, z + rz], [x, y, z - rz]];
    const T = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
    const grp = o.group || faces;
    for (const t of T) {
      const a = P[t[0]], b = P[t[1]], d = P[t[2]];
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      let n = norm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
      const cx = (a[0] + b[0] + d[0]) / 3 - x, cy = (a[1] + b[1] + d[1]) / 3 - y, cz = (a[2] + b[2] + d[2]) / 3 - z;
      if (n[0] * cx + n[1] * cy + n[2] * cz < 0) n = [-n[0], -n[1], -n[2]]; // always point outward
      grp.push({ v: [a, b, d], n, c, emit: o.emit || 0, alpha: 1, shell: false, door: 0, pool: 0 });
    }
  }

  // Place a baked model (see scripts/bake-glb.py).
  // opts: x,y,z, face ('-z'|'+z'|'+x'|'-x'), height | width | scale, tint, lift,
  //       screen (colour for light-grey faces), glowAbove (emit bright faces),
  //       anchor ('back' = back plane on x/z), maxd, emit
  function model(m, o = {}) {
    const [lo, hi] = m.b;
    const s = o.scale ?? (o.height ? o.height / (hi[1] - lo[1]) : o.width ? o.width / (hi[o.along === 'z' ? 2 : 0] - lo[o.along === 'z' ? 2 : 0]) : 1);
    const a = { '-z': 0, '+z': Math.PI, '+x': -Math.PI / 2, '-x': Math.PI / 2 }[o.face || '-z'] + (o.yaw || 0);
    const ca = Math.cos(a), sa = Math.sin(a);
    const cx = (lo[0] + hi[0]) / 2;
    const czm = o.anchor === 'back' ? -lo[2] : -(lo[2] + hi[2]) / 2; // z after the handedness flip
    const X = o.x || 0, Y = o.y || 0, Z = o.z || 0;
    const tr = (p) => {
      const x = (p[0] - cx) * s, y = (p[1] - lo[1]) * s, z = (-p[2] - czm) * s;
      return [x * ca + z * sa + X, y + Y, -x * sa + z * ca + Z];
    };
    const V = [];
    for (let i = 0; i < m.v.length; i += 3) V.push([m.v[i], m.v[i + 1], m.v[i + 2]]);
    const W = V.map(tr);
    const tint = o.tint || [1, 1, 1], lift = o.lift || 0;
    const out = [];
    for (let i = 0; i < m.f.length; i += 6) {
      const A = V[m.f[i]], B = V[m.f[i + 1]], C = V[m.f[i + 2]];
      const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
      let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      n = norm([n[0], n[1], -n[2]]); // mirror z, then yaw
      n = [n[0] * ca + n[2] * sa, n[1], -n[0] * sa + n[2] * ca];
      let col = [m.f[i + 3], m.f[i + 4], m.f[i + 5]];
      let emit = o.emit || 0;
      const mx = Math.max(col[0], col[1], col[2]), mn = Math.min(col[0], col[1], col[2]);
      if (o.screen && mn > 105 && mx - mn < 22) { col = o.screen; emit = 0.9; }
      else if (o.glowAbove != null && mx > o.glowAbove) emit = 1;
      col = [Math.min(255, col[0] * tint[0] + lift), Math.min(255, col[1] * tint[1] + lift), Math.min(255, col[2] * tint[2] + lift)];
      out.push({ v: [W[m.f[i]], W[m.f[i + 2]], W[m.f[i + 1]]], n, c: col, emit, alpha: 1, shell: false, door: 0, pool: 0, dbl: !!o.double });
    }
    // radius for distance culling
    const ext = Math.max(hi[0] - lo[0], hi[2] - lo[2], hi[1] - lo[1]) * s;
    groups.push({ x: X, z: Z, r: ext * 0.75, maxd: o.maxd || 16, faces: out });
    return out;
  }

  // A group for hand-built decoration (blooms, balloons) so it is distance-culled too.
  function group(x, z, r, maxd = 18) {
    const g = { x, z, r, maxd, faces: [] };
    groups.push(g);
    return g.faces;
  }


  // A laptop built from simple parts so it sits flat on the desk: thin base, keyboard,
  // trackpad and a tilted lid whose lit screen faces `face` (the user's side).
  function laptop(x, y, z, face, w = 0.36, o = {}) {
    const f = { '-z': [0, -1], '+z': [0, 1], '+x': [1, 0], '-x': [-1, 0] }[face || '-z'];
    const r = [-f[1], f[0]];
    const D = w * 0.7, H = w * 0.66, tilt = 0.26; // lid leans back by ~15 degrees
    const g = group(x, z, w, o.maxd || 14);
    const P = (u, yy, d) => [x + r[0] * u + f[0] * d, y + yy, z + r[1] * u + f[1] * d];
    const add = (pts, c, ref, emit = 0) => {
      const e1 = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]], e2 = [pts[2][0] - pts[0][0], pts[2][1] - pts[0][1], pts[2][2] - pts[0][2]];
      let n = norm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
      const cx = (pts[0][0] + pts[2][0]) / 2, cy = (pts[0][1] + pts[2][1]) / 2, cz = (pts[0][2] + pts[2][2]) / 2;
      if (n[0] * (cx - ref[0]) + n[1] * (cy - ref[1]) + n[2] * (cz - ref[2]) < 0) n = [-n[0], -n[1], -n[2]];
      g.push({ v: pts, n, c, emit, alpha: 1, shell: false, door: 0, pool: 0 });
    };
    const solid = (a, c) => { // a: 8 corners [bottom x4 cyclic, top x4 cyclic]
      const ref = [0, 1, 2].map((k) => a.reduce((s2, q) => s2 + q[k], 0) / 8);
      const F = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
      for (const q of F) add(q.map((i) => a[i]), c, ref);
    };
    const hw = w / 2, hd = D / 2, t = 0.016;
    solid([P(-hw, 0, -hd), P(hw, 0, -hd), P(hw, 0, hd), P(-hw, 0, hd), P(-hw, t, -hd), P(hw, t, -hd), P(hw, t, hd), P(-hw, t, hd)], [74, 76, 84]);
    const top = [0, 1, 0].map((_, k) => 0), c0 = [x, y + t, z];
    add([P(-hw * 0.94, t + 0.001, -hd * 0.9), P(hw * 0.94, t + 0.001, -hd * 0.9), P(hw * 0.94, t + 0.001, hd * 0.92), P(-hw * 0.94, t + 0.001, hd * 0.92)], [38, 40, 46], [x, y - 1, z]);
    for (let row = 0; row < 4; row++) {
      const d0 = -hd * 0.78 + row * hd * 0.3;
      add([P(-hw * 0.84, t + 0.002, d0), P(hw * 0.84, t + 0.002, d0), P(hw * 0.84, t + 0.002, d0 + hd * 0.22), P(-hw * 0.84, t + 0.002, d0 + hd * 0.22)], [66, 68, 76], [x, y - 1, z]);
    }
    add([P(-hw * 0.2, t + 0.002, hd * 0.55), P(hw * 0.2, t + 0.002, hd * 0.55), P(hw * 0.2, t + 0.002, hd * 0.86), P(-hw * 0.2, t + 0.002, hd * 0.86)], [96, 98, 108], [x, y - 1, z]);
    // lid: hinge at the back edge, leaning back
    const bk = -hd, topd = bk - H * tilt, lt = 0.008;
    const Lb = (u, yy, dd) => P(u, yy, dd);
    solid([Lb(-hw, t, bk), Lb(hw, t, bk), Lb(hw, t + H, topd), Lb(-hw, t + H, topd), Lb(-hw, t, bk + lt), Lb(hw, t, bk + lt), Lb(hw, t + H, topd + lt), Lb(-hw, t + H, topd + lt)], [88, 90, 98]);
    const sd = (yy) => bk + lt + 0.0008 - (yy - t) * tilt; // screen plane (just in front of the lid)
    const q4 = (u0, u1, y0, y1, c, emit) => add([Lb(u0, y0, sd(y0)), Lb(u1, y0, sd(y0)), Lb(u1, y1, sd(y1)), Lb(u0, y1, sd(y1))], c, [x - f[0] * 5, y + t + H / 2, z - f[1] * 5], emit);
    q4(-hw * 0.97, hw * 0.97, t + 0.004, t + H - 0.004, [18, 20, 26], 0);
    q4(-hw * 0.9, hw * 0.9, t + H * 0.07, t + H * 0.93, o.screen || [120, 170, 235], 0.92);
    q4(-hw * 0.78, hw * 0.3, t + H * 0.55, t + H * 0.6, [240, 245, 255], 0.95);
    q4(-hw * 0.78, hw * 0.55, t + H * 0.43, t + H * 0.47, [190, 215, 250], 0.95);
    q4(-hw * 0.78, hw * 0.1, t + H * 0.33, t + H * 0.37, [190, 215, 250], 0.95);
    void top; void c0;
  }

  // a soft contact shadow on the floor (octagon, translucent black)
  function shadow(x, z, rx, rz = rx, a = 0.22) {
    const v = [];
    for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; v.push([x + Math.cos(t) * rx, 0.006, z + Math.sin(t) * rz]); }
    faces.push({ v, n: [0, 1, 0], c: [0, 0, 0], emit: 0, alpha: a, shell: true, door: 0, pool: 0, bias: 1.4 });
  }
  const glow = (x, y, z, s, c, a = 1, phase = 0, cap = 48) => glows.push({ x, y, z, s, c, a, phase, cap });
  const label = (l) => labels.push(l);

  return { faces, groups, labels, glows, env, quad, box, blob, model, group, laptop, shadow, glow, label };
}

// ----------------------------------------------------------------- camera
const smooth = (t) => t * t * (3 - 2 * t);
// path rows: [p, x, z, yaw, pitch]
export function cameraAt(path, p) {
  const at = (i) => {
    if (p <= path[0][0]) return path[0][i];
    for (let k = 0; k < path.length - 1; k++) {
      if (p <= path[k + 1][0]) return path[k][i] + (path[k + 1][i] - path[k][i]) * smooth((p - path[k][0]) / (path[k + 1][0] - path[k][0]));
    }
    return path[path.length - 1][i];
  };
  return { x: at(1), z: at(2), yaw: at(3), pitch: at(4) };
}

// ----------------------------------------------------------------- sprites
const spriteCache = new Map();
function sprite(c) {
  const key = c.join(',');
  let s = spriteCache.get(key);
  if (!s) {
    s = document.createElement('canvas');
    s.width = s.height = 64;
    const g = s.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},1)`);
    gr.addColorStop(0.25, `rgba(${c[0]},${c[1]},${c[2]},0.55)`);
    gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    spriteCache.set(key, s);
  }
  return s;
}

function rainbow(t) {
  const h = ((t % 1) + 1) % 1 * 6, k = Math.floor(h), f = h - k;
  const q = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][k % 6];
  return [60 + q[0] * 195, 60 + q[1] * 195, 60 + q[2] * 195];
}

const STARS = Array.from({ length: 140 }, (_, i) => {
  const r = (n) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  return [r(1), r(2) * 0.62, 0.6 + r(3) * 1.4, r(4) * 6.28];
});

// ----------------------------------------------------------------- render
export function render(ctx, scene, w, h, state) {
  const env = scene.env;
  const FOG = env.fog;
  const { x: cx, z: cz, yaw, pitch, open = 0, time = 0 } = state;
  const O = state.opens || [0, open, open];
  const cy = 1.55 + Math.sin(cz * 1.7 + cx) * 0.018;
  const f = 0.5 * w / Math.tan((w < h ? 1.7 : 1.5) / 2);
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const maxDepth = env.maxDepth || 36;
  const fogNear = env.fogNear ?? 5, fogRange = env.fogRange || 36, fogMax = env.fogMax ?? 0.62;

  // background: haze, or a night sky with stars and a moon
  if (env.sky) {
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, `rgb(${env.sky[0]})`);
    gr.addColorStop(0.55, `rgb(${env.sky[1]})`);
    gr.addColorStop(1, `rgb(${env.skyHorizon || FOG})`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    const ox = -yaw * f * 0.9, oy = pitch * f * 0.9;
    ctx.fillStyle = '#fff';
    if (env.stars !== false) for (const s of STARS) {
      const sx = (((s[0] * w * 2 + ox) % (w * 2)) + w * 2) % (w * 2);
      if (sx > w) continue;
      const sy = s[1] * h + oy;
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(time / 500 + s[3]);
      ctx.fillRect(sx, sy, s[2], s[2]);
    }
    ctx.globalAlpha = 1;
    const mx = (((0.72 * w * 2 + ox) % (w * 2)) + w * 2) % (w * 2);
    if (env.stars !== false && mx < w) {
      const my = h * 0.16 + oy;
      ctx.drawImage(sprite([255, 244, 214]), mx - 70, my - 70, 140, 140);
      ctx.fillStyle = '#fff6dc';
      ctx.beginPath(); ctx.arc(mx, my, 15, 0, 6.3); ctx.fill();
    }
  } else {
    ctx.fillStyle = `rgb(${FOG})`;
    ctx.fillRect(0, 0, w, h);
  }

  const toCam = (p, dx) => {
    const x = p[0] + (dx || 0) - cx, y = p[1] - cy, z = p[2] - cz;
    const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    return [x1, y2, z2];
  };

  const items = [];
  const consider = (fc) => {
    const dx = fc.door ? Math.sign(fc.door) * O[Math.abs(fc.door)] : 0;
    const v0 = fc.v[0];
    const d = (cx - (v0[0] + dx)) * fc.n[0] + (cy - v0[1]) * fc.n[1] + (cz - v0[2]) * fc.n[2];
    let nrm = fc.n;
    if (d <= 0) {
      if (!fc.dbl) return;
      nrm = [-fc.n[0], -fc.n[1], -fc.n[2]]; // seen from behind: light it as the back side
    }
    const pts = fc.v.map((p) => toCam(p, dx));
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
    if (out.length < 3) return;
    let depth = 0;
    for (const p of out) depth += p[2];
    depth /= out.length;
    if (depth > maxDepth) return;
    if (fc.bias === undefined) fc.bias = 0;
    items.push({ t: 0, fc, out, depth: depth - fc.bias, shell: fc.shell, n: nrm });
  };
  for (const fc of scene.faces) consider(fc);
  for (const g of scene.groups) {
    if (Math.hypot(g.x - cx, g.z - cz) - g.r > g.maxd) continue;
    for (const fc of g.faces) consider(fc);
  }
  for (const lb of scene.labels) {
    const p = toCam([lb.x, lb.y, lb.z]);
    if (p[2] > 0.4 && p[2] < maxDepth) items.push({ t: 1, lb, p, depth: p[2] - 0.05 });
  }
  for (const g of scene.glows) {
    const p = toCam([g.x, g.y, g.z]);
    if (p[2] > 0.3 && p[2] < maxDepth * 0.8) items.push({ t: 2, g, p, depth: p[2] });
  }
  items.sort((a, b) => (a.shell === b.shell ? b.depth - a.depth : a.shell ? -1 : 1));

  const lights = env.lights, lightR = env.lightR || 3.2;
  const poolBoost = (x, z) => {
    let b = 0;
    for (const L of lights) b = Math.max(b, 1 - Math.hypot(x - L[0], z - L[1]) / lightR);
    return Math.max(0, b);
  };
  const dim = env.dim ?? 1, warm = env.warm;

  for (const it of items) {
    if (it.t === 2) {
      const g = it.g, p = it.p;
      const sx = w / 2 + (f * p[0]) / p[2], sy = h / 2 - (f * p[1]) / p[2];
      const px = Math.min(g.cap || 48, (g.s * f) / p[2]);
      if (px < 2 || sx < -px || sx > w + px || sy < -px || sy > h + px) continue;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, g.a * (0.78 + 0.22 * Math.sin(time / 320 + g.phase)));
      ctx.drawImage(sprite(g.c), sx - px, sy - px, px * 2, px * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      continue;
    }
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
      if (lb.glow) { ctx.shadowColor = `rgba(${lb.color[0]},${lb.color[1]},${lb.color[2]},0.8)`; ctx.shadowBlur = px * 0.55; }
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.fillText(lb.text === '__ADDRESS__' ? state.address : lb.text, sx, sy);
      ctx.restore();
      continue;
    }
    const { fc, out } = it;
    const depth = it.depth + fc.bias;
    const nn = it.n;
    const lit = 0.58 + 0.42 * Math.max(0, nn[0] * LIGHT[0] + nn[1] * LIGHT[1] + nn[2] * LIGHT[2]);
    let c = fc.c;
    if (fc.cyc !== undefined) c = rainbow(time / 2600 + fc.cyc);
    let k = fc.emit ? fc.emit + (1 - fc.emit) * lit : lit * dim;
    let wr = 1, wg = 1, wb = 1;
    if (lights && fc.pool) {
      const v = fc.v[0];
      const b = poolBoost(v[0] + 0.5, v[2] + 0.5);
      k = Math.min(1.15, k * (0.78 + 0.34 * b));
      if (warm) { wr = 1 + (warm[0] - 1) * b; wg = 1 + (warm[1] - 1) * b; wb = 1 + (warm[2] - 1) * b; }
    }
    const fog = Math.min(fogMax, Math.max(0, (depth - fogNear) / fogRange)) * (fc.emit > 0.8 ? 0.4 : 1);
    const r = Math.min(255, c[0] * k * wr) * (1 - fog) + FOG[0] * fog;
    const g = Math.min(255, c[1] * k * wg) * (1 - fog) + FOG[1] * fog;
    const bl = Math.min(255, c[2] * k * wb) * (1 - fog) + FOG[2] * fog;
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

  // vignette so it reads as a lit room
  const vg = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(${env.vignette || '20,14,6'},${env.vignetteA ?? 0.42})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  if (state.hands && state.handsAlpha > 0.01) drawHands(ctx, state.hands, w, h, f, state);
}

// First-person arms, drawn in camera space at the bottom of the screen.
function drawHands(ctx, m, w, h, f, state) {
  const s = 0.01, rise = state.handsRise ?? 0;
  const V = [];
  for (let i = 0; i < m.v.length; i += 3) {
    V.push([m.v[i] * s, m.v[i + 1] * s - 0.42 - rise + Math.sin((state.time || 0) / 420) * 0.008, -m.v[i + 2] * s + 0.05]);
  }
  const items = [];
  for (let i = 0; i < m.f.length; i += 6) {
    const A = V[m.f[i]], B = V[m.f[i + 1]], C = V[m.f[i + 2]];
    const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const cxm = (A[0] + B[0] + C[0]) / 3, cym = (A[1] + B[1] + C[1]) / 3, czm = (A[2] + B[2] + C[2]) / 3;
    // mirrored z flips winding: a face is visible when its normal points AWAY from the eye
    if (n[0] * -cxm + n[1] * -cym + n[2] * -czm >= 0) continue;
    items.push([i, czm, n]);
  }
  items.sort((a, b) => b[1] - a[1]);
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.handsAlpha);
  for (const [i, , n] of items) {
    const nl = Math.hypot(n[0], n[1], n[2]) || 1;
    const sh = 0.62 + 0.38 * Math.abs(n[2]) / nl;
    ctx.beginPath();
    for (let q = 0; q < 3; q++) {
      const P = V[m.f[i + q]];
      const sx = w / 2 + (f * P[0]) / P[2], sy = h / 2 - (f * P[1]) / P[2];
      q ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
    }
    ctx.closePath();
    const css = `rgb(${Math.min(255, m.f[i + 3] * sh) | 0},${Math.min(255, m.f[i + 4] * sh) | 0},${Math.min(255, m.f[i + 5] * sh) | 0})`;
    ctx.fillStyle = css; ctx.fill(); ctx.strokeStyle = css; ctx.lineWidth = 0.6; ctx.stroke();
  }
  ctx.restore();
}
