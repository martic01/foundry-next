#!/usr/bin/env python3
"""Quadric-error-metric baker: .glb -> small, good-looking triangle list for lib/room3d.

usage: bake-qem.py in.glb out.json TARGET_TRIS [--pose-arms] [--skip-mesh SUBSTR ...]

Unlike scripts/bake-glb.py (grid clustering) this welds the mesh and collapses edges
cheapest-first (Garland-Heckbert), so thin parts, slats and silhouettes survive.
Colours are sampled per vertex from the texture, so detail is kept.
Output: {"b":[lo,hi],"v":[x,y,z,...],"f":[a,b,c,r,g,b,...]}
"""
import sys, json, heapq, io
import numpy as np
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bake_common import load, acc, node_mat, CT, NC  # copied head of bake-glb.py (see repo script)
from PIL import Image

def collect_vertices(j, b, skip):
    imgs = {}
    def image(i):
        if i not in imgs:
            bv = j['bufferViews'][j['images'][i]['bufferView']]
            raw = b[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
            im = Image.open(io.BytesIO(raw)).convert('RGB'); im.thumbnail((512, 512))
            imgs[i] = np.asarray(im, dtype=np.float32) / 255
        return imgs[i]
    Ps, Cs, Fs, off = [], [], [], 0
    def walk(ni, parent):
        nonlocal off
        n = j['nodes'][ni]; M = parent @ node_mat(n)
        if 'mesh' in n and not any(s in (n.get('name') or '') for s in skip):
            for prim in j['meshes'][n['mesh']]['primitives']:
                pos = acc(j, b, prim['attributes']['POSITION']).astype(np.float64)
                pos = (np.c_[pos, np.ones(len(pos))] @ M.T)[:, :3]
                idx = acc(j, b, prim['indices']).ravel() if 'indices' in prim else np.arange(len(pos))
                tri = idx[:len(idx) // 3 * 3].reshape(-1, 3)
                mat = j['materials'][prim['material']] if 'material' in prim else {}
                pm = mat.get('pbrMetallicRoughness', {})
                base = np.clip(np.array(pm.get('baseColorFactor', [1, 1, 1, 1])[:3]), 0, 1)
                tex = pm.get('baseColorTexture')
                if tex is not None and 'TEXCOORD_0' in prim['attributes']:
                    im = image(j['textures'][tex['index']]['source'])
                    uv = acc(j, b, prim['attributes']['TEXCOORD_0']).astype(np.float64) % 1.0
                    h, w = im.shape[:2]
                    col = im[np.clip((uv[:, 1] * h).astype(int), 0, h - 1), np.clip((uv[:, 0] * w).astype(int), 0, w - 1)]
                    if 'baseColorFactor' in pm: col = col * base
                else:
                    col = np.tile(base ** (1 / 2.2), (len(pos), 1))
                Ps.append(pos); Cs.append(col); Fs.append(tri + off); off += len(pos)
        for c in n.get('children', []): walk(c, M)
    for r in j['scenes'][j.get('scene', 0)]['nodes']: walk(r, np.eye(4))
    return np.concatenate(Ps), np.concatenate(Cs), np.concatenate(Fs)

def pose_arms(P):
    """The receptionist is modelled in a T-pose: swing both arms down by bending the mesh."""
    P = P.copy(); lo, hi = P.min(0), P.max(0); H = hi[1] - lo[1]
    ys = lo[1] + H * 0.78                       # shoulder height
    far = P[np.abs(P[:, 0]) > 0.30 * H]
    ysh = np.median(far[:, 1]) if len(far) else ys
    xs = 0.11 * H                               # shoulder x
    for side in (1, -1):
        dx = side * P[:, 0] - xs
        w = np.clip(dx / (0.10 * H), 0, 1); w = w * w * (3 - 2 * w)
        w[P[:, 1] < ysh - 0.16 * H] = 0
        ang = -np.radians(72) * w * side         # rotate about the shoulder, toward the floor
        px = side * xs; py = ysh
        x = P[:, 0] - px; y = P[:, 1] - py
        c, s = np.cos(ang), np.sin(ang)
        nx = x * c - y * s; ny = x * s + y * c
        m = w > 0
        P[m, 0] = px + nx[m]; P[m, 1] = py + ny[m]
    return P

def qem(P, C, F, target):
    n = len(P)
    Q = np.zeros((n, 4, 4))
    e1 = P[F[:, 1]] - P[F[:, 0]]; e2 = P[F[:, 2]] - P[F[:, 0]]
    nr = np.cross(e1, e2); area = np.linalg.norm(nr, axis=1) / 2 + 1e-18
    nr = nr / (2 * area[:, None]); d = -np.sum(nr * P[F[:, 0]], axis=1)
    pl = np.c_[nr, d]; K = pl[:, :, None] * pl[:, None, :] * area[:, None, None]
    for k in range(3): np.add.at(Q, F[:, k], K)
    # boundary edges: a stiff plane through the edge, perpendicular to the face
    from collections import Counter
    cnt = Counter()
    for f in F:
        for a, b2 in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])): cnt[(min(a, b2), max(a, b2))] += 1
    scale = np.sqrt(area.mean())
    for fi, f in enumerate(F):
        for a, b2 in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
            if cnt[(min(a, b2), max(a, b2))] == 1:
                ed = P[b2] - P[a]; L = np.linalg.norm(ed)
                if L < 1e-12: continue
                pn = np.cross(ed / L, nr[fi]); pn /= (np.linalg.norm(pn) + 1e-18)
                p4 = np.r_[pn, -pn @ P[a]]
                Kb = np.outer(p4, p4) * L * L * 50
                Q[a] += Kb; Q[b2] += Kb
    P = P.copy(); C = C.copy()
    alive = np.ones(len(F), bool); F = F.copy()
    vf = [set() for _ in range(n)]
    for fi, f in enumerate(F):
        for v in f: vf[v].add(fi)
    ver = np.zeros(n, int); dead = np.zeros(n, bool)

    def cost_pos(a, b2):
        Qs = Q[a] + Q[b2]
        A = Qs.copy(); A[3] = [0, 0, 0, 1]
        mid = (P[a] + P[b2]) / 2
        best = None
        try:
            if abs(np.linalg.det(A[:3, :3])) > 1e-12 * (np.abs(A[:3, :3]).max() ** 3 + 1e-30):
                x = np.linalg.solve(A, np.array([0, 0, 0, 1.0]))[:3]
                if np.linalg.norm(x - mid) < 1.5 * np.linalg.norm(P[a] - P[b2]) + 1e-12: best = x
        except np.linalg.LinAlgError:
            pass
        cands = [best] if best is not None else []
        cands += [mid, P[a], P[b2]]
        res = None
        for x in cands:
            v = np.r_[x, 1.0]; c = v @ Qs @ v
            if res is None or c < res[0]: res = (c, x)
            if best is not None: break
        return res

    heap = []
    def push(a, b2):
        c, x = cost_pos(a, b2)
        heapq.heappush(heap, (c, a, b2, ver[a], ver[b2]))
    edges = set()
    for f in F:
        for a, b2 in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])): edges.add((min(a, b2), max(a, b2)))
    for a, b2 in edges: push(a, b2)
    nf = len(F)
    def flips(a, b2, x):
        for fi in vf[a] | vf[b2]:
            if not alive[fi]: continue
            f = F[fi]
            if (a in f) and (b2 in f): continue
            old = [P[v] for v in f]
            new = [x if v in (a, b2) else P[v] for v in f]
            n0 = np.cross(old[1] - old[0], old[2] - old[0]); n1 = np.cross(new[1] - new[0], new[2] - new[0])
            l0, l1 = np.linalg.norm(n0), np.linalg.norm(n1)
            if l0 < 1e-14: continue
            if l1 < 1e-14 or (n0 @ n1) / (l0 * l1) < 0.25: return True
        return False
    while nf > target and heap:
        c, a, b2, va, vb = heapq.heappop(heap)
        if dead[a] or dead[b2] or ver[a] != va or ver[b2] != vb: continue
        c2, x = cost_pos(a, b2)
        if flips(a, b2, x): continue
        # collapse b2 into a
        P[a] = x; C[a] = (C[a] + C[b2]) / 2; Q[a] = Q[a] + Q[b2]
        dead[b2] = True; ver[a] += 1
        for fi in list(vf[b2]):
            if not alive[fi]: continue
            f = F[fi]
            if a in f:
                alive[fi] = False; nf -= 1
                for v in f: vf[v].discard(fi)
            else:
                F[fi] = np.where(f == b2, a, f); vf[a].add(fi)
        vf[b2] = set()
        nb = set()
        for fi in vf[a]:
            if alive[fi]: nb.update(int(v) for v in F[fi])
        nb.discard(a)
        for v in nb:
            ver[v] += 0
            push(min(a, v), max(a, v)) if True else None
    Fo = F[alive]
    used = np.unique(Fo); remap = -np.ones(n, int); remap[used] = np.arange(len(used))
    return P[used], C[used], remap[Fo]

def main():
    src, dst, target = sys.argv[1], sys.argv[2], int(sys.argv[3])
    skip = sys.argv[sys.argv.index('--skip-mesh') + 1:] if '--skip-mesh' in sys.argv else []
    j, b = load(src)
    P, C, F = collect_vertices(j, b, skip)
    if '--pose-arms' in sys.argv: P = pose_arms(P)
    # weld by position
    lo, hi = P.min(0), P.max(0); q = np.round((P - lo) / ((hi - lo).max() * 1e-6)).astype(np.int64)
    key = q[:, 0] * 4_000_000_007 + q[:, 1] * 1_000_003 + q[:, 2]
    uk, first, inv = np.unique(key, return_index=True, return_inverse=True)
    cnt = np.bincount(inv); Pw = P[first]
    Cw = np.stack([np.bincount(inv, weights=C[:, k]) / cnt for k in range(3)], 1)
    F = inv[F]
    ok = (F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2]); F = F[ok]
    print('welded', len(P), '->', len(Pw), 'verts,', len(F), 'tris')
    Po, Co, Fo = qem(Pw, Cw, F, target)
    col = np.clip((Co[Fo[:, 0]] + Co[Fo[:, 1]] + Co[Fo[:, 2]]) / 3, 0, 1)
    lo, hi = Po.min(0), Po.max(0)
    out = {'b': [[round(float(x), 4) for x in lo], [round(float(x), 4) for x in hi]],
           'v': [round(float(x), 4) for x in Po.ravel()], 'f': []}
    for t, c in zip(Fo, col): out['f'] += [int(t[0]), int(t[1]), int(t[2])] + [int(round(float(x) * 255)) for x in c]
    json.dump(out, open(dst, 'w'), separators=(',', ':'))
    print(src.split('/')[-1], '->', len(Fo), 'tris', len(Po), 'verts')

main()
