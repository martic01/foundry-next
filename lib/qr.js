// A small QR code generator (no libraries). Byte mode, error correction
// level M, versions 1 to 10 (up to ~210 characters), best of the 8 masks.
// qrMatrix(text) -> array of rows of 0/1 (1 = dark module), no quiet zone.

// [total codewords, EC codewords per block, [blocks, data codewords per block], ...]
const VERSIONS = [
  null,
  [26, 10, [1, 16]],
  [44, 16, [1, 28]],
  [70, 26, [1, 44]],
  [100, 18, [2, 32]],
  [134, 24, [2, 43]],
  [172, 16, [4, 27]],
  [196, 18, [4, 31]],
  [242, 22, [2, 38], [2, 39]],
  [292, 22, [3, 36], [2, 37]],
  [346, 26, [4, 43], [1, 44]]
];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

// --- Galois field 256 (x^8 + x^4 + x^3 + x^2 + 1) ---
const EXP = new Array(512);
const LOG = new Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j];
      next[j + 1] ^= gmul(g[j], EXP[i]);
    }
    g = next;
  }
  return g;
}

function rsRemainder(data, n) {
  const gen = rsGenerator(n);
  const res = new Array(n).fill(0);
  for (const d of data) {
    const factor = d ^ res.shift();
    res.push(0);
    for (let i = 0; i < n; i++) res[i] ^= gmul(gen[i + 1], factor);
  }
  return res;
}

function utf8(text) {
  return Array.from(new TextEncoder().encode(text));
}

function buildCodewords(bytes, version) {
  const [total, ecLen, ...groups] = VERSIONS[version];
  const dataCap = groups.reduce((s, [n, d]) => s + n * d, 0);
  // bit stream: mode 0100, length (8 bits for v1-9, 16 for v10), data, terminator, padding
  const bits = [];
  const push = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  push(0, Math.min(4, dataCap * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; data.length < dataCap; pad ^= 0xec ^ 0x11) data.push(pad);

  // split into blocks, add error correction, interleave
  const blocks = [];
  let at = 0;
  groups.forEach(([n, d]) => {
    for (let i = 0; i < n; i++) {
      const chunk = data.slice(at, at + d);
      at += d;
      blocks.push({ data: chunk, ec: rsRemainder(chunk, ecLen) });
    }
  });
  const out = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) blocks.forEach((b) => { if (i < b.data.length) out.push(b.data[i]); });
  for (let i = 0; i < ecLen; i++) blocks.forEach((b) => out.push(b.ec[i]));
  if (out.length !== total) throw new Error('QR size mismatch');
  return out;
}

function bch(value, poly, bitsLen) {
  let v = value << bitsLen;
  const top = (n) => 31 - Math.clz32(n);
  while (v && top(v) >= top(poly)) v ^= poly << (top(v) - top(poly));
  return v;
}

function formatBits(mask) {
  const data = (0b00 << 3) | mask; // level M = 00
  return ((data << 10) | bch(data, 0b10100110111, 10)) ^ 0b101010000010010;
}
function versionBits(version) {
  return (version << 12) | bch(version, 0b1111100100101, 12);
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

function penalty(m) {
  const n = m.length;
  let p = 0;
  const runs = (get) => {
    for (let i = 0; i < n; i++) {
      let run = 1;
      for (let j = 1; j < n; j++) {
        if (get(i, j) === get(i, j - 1)) run++;
        else { if (run >= 5) p += run - 2; run = 1; }
      }
      if (run >= 5) p += run - 2;
    }
  };
  runs((i, j) => m[i][j]);
  runs((i, j) => m[j][i]);
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const v = m[r][c];
    if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
  }
  const pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const rev = [...pat].reverse();
  const find = (get) => {
    for (let i = 0; i < n; i++) for (let j = 0; j + 11 <= n; j++) {
      let a = true, b = true;
      for (let k = 0; k < 11; k++) { const v = get(i, j + k); if (v !== pat[k]) a = false; if (v !== rev[k]) b = false; }
      if (a || b) p += 40;
    }
  };
  find((i, j) => m[i][j]);
  find((i, j) => m[j][i]);
  let dark = 0;
  m.forEach((row) => row.forEach((v) => { dark += v; }));
  p += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return p;
}

export function qrMatrix(text, forceMask = -1) {
  const bytes = utf8(String(text));
  let version = 1;
  const cap = (v) => VERSIONS[v].slice(2).reduce((s, [n, d]) => s + n * d, 0);
  const need = (v) => Math.ceil((4 + (v < 10 ? 8 : 16) + bytes.length * 8) / 8);
  while (version <= 10 && need(version) > cap(version)) version++;
  if (version > 10) throw new Error('Text is too long for this QR generator');

  const n = 17 + version * 4;
  const mod = Array.from({ length: n }, () => new Array(n).fill(0));
  const fn = Array.from({ length: n }, () => new Array(n).fill(false)); // function modules
  const set = (r, c, v) => { if (r >= 0 && r < n && c >= 0 && c < n) { mod[r][c] = v ? 1 : 0; fn[r][c] = true; } };

  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      set(r0 + r, c0 + c, on);
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  for (let i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const pos = ALIGN[version];
  pos.forEach((r) => pos.forEach((c) => {
    if ((r === 6 && c === 6) || (r === 6 && c === pos[pos.length - 1]) || (r === pos[pos.length - 1] && c === 6)) return;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }));
  // reserve format / version areas
  for (let i = 0; i < 9; i++) { if (i !== 6) { set(8, i, 0); set(i, 8, 0); } } // row/column 6 keep their timing pattern
  for (let i = 0; i < 8; i++) { set(8, n - 1 - i, 0); set(n - 1 - i, 8, 0); }
  set(n - 8, 8, 1); // dark module
  if (version >= 7) {
    const vb = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = (vb >> i) & 1, a = Math.floor(i / 3), b = (i % 3) + n - 11;
      set(a, b, bit); set(b, a, bit);
    }
  }

  // place data in the zig-zag
  const cw = buildCodewords(bytes, version);
  const dbits = [];
  cw.forEach((b) => { for (let i = 7; i >= 0; i--) dbits.push((b >> i) & 1); });
  const data = Array.from({ length: n }, () => new Array(n).fill(0));
  let k = 0, up = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < n; i++) {
      const r = up ? n - 1 - i : i;
      for (let c = col; c >= col - 1; c--) {
        if (!fn[r][c]) { data[r][c] = k < dbits.length ? dbits[k] : 0; k++; }
      }
    }
    up = !up;
  }

  let best = null, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    if (forceMask >= 0 && mask !== forceMask) continue;
    const m = mod.map((row) => row.slice());
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!fn[r][c]) m[r][c] = data[r][c] ^ (MASKS[mask](r, c) ? 1 : 0);
    const fb = formatBits(mask);
    for (let i = 0; i < 15; i++) {
      const bit = (fb >> i) & 1;
      // first copy around the top-left finder
      if (i < 6) m[i][8] = bit; else if (i < 8) m[i + 1][8] = bit; else if (i === 8) m[8][7] = bit; else m[8][14 - i] = bit;
      // second copy
      if (i < 8) m[8][n - 1 - i] = bit; else m[n - 15 + i][8] = bit;
    }
    const s = penalty(m);
    if (s < bestScore) { bestScore = s; best = m; }
  }
  return best;
}

// An SVG path (one string) covering every dark module: easy to draw as a single <path>.
export function qrPath(matrix) {
  let d = '';
  matrix.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (row[c]) {
        let e = c;
        while (e < row.length && row[e]) e++;
        d += `M${c} ${r}h${e - c}v1h-${e - c}z`;
        c = e;
      } else c++;
    }
  });
  return d;
}
