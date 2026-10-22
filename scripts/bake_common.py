#!/usr/bin/env python3
"""Bake a heavy .glb into a tiny flat-shaded triangle list for lib/room3d.js.

usage: bake-glb.py in.glb out.json TARGET_TRIS [--skip-mesh NAME_SUBSTR ...]

Applies node transforms, samples texture/material colours per triangle, then
vertex-clusters on a grid (cell size found by search) so the result has about
TARGET_TRIS triangles. Output: {"b":[min xyz,max xyz],"v":[x,y,z,...],"f":[a,b,c,r,g,b,...]}
(positions in metres, glTF axes: y up).
"""
import sys, json, struct, io
import numpy as np
from PIL import Image

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

def load(path):
    d = open(path, 'rb').read()
    jl = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack('<I', d[off:off + 4])[0]
    return j, d[off + 8:off + 8 + bl]

def acc(j, b, i):
    a = j['accessors'][i]
    bv = j['bufferViews'][a['bufferView']]
    n = NC[a['type']]
    dt = np.dtype(CT[a['componentType']])
    stride = bv.get('byteStride') or n * dt.itemsize
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    raw = np.frombuffer(b, dtype=np.uint8, count=stride * (a['count'] - 1) + n * dt.itemsize, offset=start)
    out = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], n * dt.itemsize), strides=(stride, 1)).copy().view(dt).reshape(a['count'], n)
    if a.get('normalized'):
        out = out.astype(np.float32) / np.iinfo(dt).max
    return out

def node_mat(n):
    if 'matrix' in n:
        return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    t = np.array(n.get('translation', [0, 0, 0]))
    q = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = q
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = t
    return M

def collect(j, b, skip):
    imgs = {}
    def image(i):
        if i not in imgs:
            bv = j['bufferViews'][j['images'][i]['bufferView']]
            raw = b[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
            im = Image.open(io.BytesIO(raw)).convert('RGB'); im.thumbnail((256, 256))
            imgs[i] = np.asarray(im, dtype=np.float32) / 255
        return imgs[i]
    P, C = [], []
    def walk(ni, parent):
        n = j['nodes'][ni]; M = parent @ node_mat(n)
        if 'mesh' in n and not any(s in (n.get('name') or '') for s in skip):
            for prim in j['meshes'][n['mesh']]['primitives']:
                pos = acc(j, b, prim['attributes']['POSITION']).astype(np.float64)
                pos = (np.c_[pos, np.ones(len(pos))] @ M.T)[:, :3]
                idx = acc(j, b, prim['indices']).ravel() if 'indices' in prim else np.arange(len(pos))
                tri = idx[:len(idx) // 3 * 3].reshape(-1, 3)
                mat = j['materials'][prim['material']] if 'material' in prim else {}
                pm = mat.get('pbrMetallicRoughness', {})
                base = np.array(pm.get('baseColorFactor', [1, 1, 1, 1])[:3])
                # glTF factors are linear; convert to sRGB-ish for display
                base = np.clip(base, 0, 1) ** (1 / 2.2)
                col = np.tile(base, (len(tri), 1))
                tex = pm.get('baseColorTexture')
                if tex is not None and 'TEXCOORD_0' in prim['attributes']:
                    src = j['textures'][tex['index']]['source']
                    im = image(src); uv = acc(j, b, prim['attributes']['TEXCOORD_0']).astype(np.float64)
                    cuv = uv[tri].mean(axis=1) % 1.0
                    h, w = im.shape[:2]
                    px = im[np.clip((cuv[:, 1] * h).astype(int), 0, h - 1), np.clip((cuv[:, 0] * w).astype(int), 0, w - 1)]
                    col = px * (base if 'baseColorFactor' in pm else 1)
                P.append(pos[tri]); C.append(col)
        for c in n.get('children', []): walk(c, M)
    sc = j['scenes'][j.get('scene', 0)]
    for r in sc['nodes']: walk(r, np.eye(4))
    return np.concatenate(P), np.concatenate(C)

