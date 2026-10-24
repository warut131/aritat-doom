"""Generates skinned cat meshes (SDF -> marching cubes -> decimate -> skin weights).
Output: assets/cats.bin + assets/cats.json
Cat faces +Z, stands on y=0, base scale = 1 (game scales per breed)."""
import numpy as np, json, os, struct
from skimage import measure
import pyfqmr

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
V = np.array

# ---------------- SDF primitives (vectorised over Nx3 points) ----------------
def sd_ellipsoid(p, c, r):
    q = (p - c) / r
    k0 = np.linalg.norm(q, axis=1); k1 = np.linalg.norm(q / r, axis=1)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-9)

def sd_roundcone(p, a, b, r1, r2):
    # capsule with linearly varying radius (good enough approximation)
    ba = b - a; pa = p - a
    h = np.clip((pa @ ba) / (ba @ ba), 0, 1)
    d = np.linalg.norm(pa - h[:, None] * ba, axis=1)
    return d - (r1 + (r2 - r1) * h)

def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)

def chain(p, pts, radii):
    d = np.full(len(p), 1e9)
    for i in range(len(pts) - 1):
        d = smin(d, sd_roundcone(p, V(pts[i]), V(pts[i + 1]), radii[i], radii[i + 1]), 0.02)
    return d

# ---------------- cat shape description ----------------
def cat_params(kind):
    P = dict(
        body_w=1.0, body_h=1.0, leg_len=1.0, leg_th=1.0, head_r=0.155, ear=1.0, ear_w=1.0,
        tail_r=1.0, fluff=0.0, muzzle=1.0, neck=1.0, belly_drop=0.0,
    )
    if kind == 'lean':   # siamese / bat: slim, long legs, big ears
        P.update(body_w=0.86, body_h=0.92, leg_len=1.1, leg_th=0.85, head_r=0.145, ear=1.3, ear_w=1.1, tail_r=0.8, muzzle=1.15, neck=1.1)
    if kind == 'fluffy': # persian / boss: big, fluffy, small ears, flat face
        P.update(body_w=1.25, body_h=1.12, leg_len=0.9, leg_th=1.35, head_r=0.175, ear=0.7, tail_r=1.9, fluff=1.0, muzzle=0.6, belly_drop=0.03)
    if kind == 'dog':    # Thai soi dog: lean, long legs, long snout, big upright ears, curled thin tail
        P.update(body_w=0.92, body_h=0.95, leg_len=1.22, leg_th=1.05, head_r=0.14, ear=1.35, ear_w=1.25, tail_r=0.75, muzzle=2.3, neck=1.15)
    if kind == 'brute':  # korat / black: muscular
        P.update(body_w=1.12, body_h=1.05, leg_len=1.0, leg_th=1.25, head_r=0.16, ear=1.05, tail_r=1.1, muzzle=1.0)
    return P

def build_skeleton(P):
    L = P['leg_len']
    sh = 0.6 * L  # shoulder / hip height
    B = []  # name, parent, head pos, tail pos (segment used for weights)
    def add(n, par, h, t): B.append(dict(name=n, parent=par, pos=list(map(float, h)), tail=list(map(float, t))))
    add('root', None, (0, 0, 0), (0, 0.001, 0))
    add('hips', 'root', (0, sh + 0.02, -0.30), (0, sh + 0.03, -0.06))
    add('spine', 'hips', (0, sh + 0.03, -0.06), (0, sh + 0.05, 0.18))
    add('chest', 'spine', (0, sh + 0.05, 0.18), (0, sh + 0.10, 0.36))
    add('neck', 'chest', (0, sh + 0.10, 0.36), (0, sh + 0.28, 0.50))
    add('head', 'neck', (0, sh + 0.30, 0.53), (0, sh + 0.30, 0.70))
    for s, sx in (('L', 1), ('R', -1)):
        x = 0.12 * sx * P['body_w']
        add('ear' + s, 'head', (x * 0.8, sh + 0.42, 0.52), (x * 1.15, sh + 0.58, 0.51))
        # front leg
        add('fUp' + s, 'chest', (x, sh - 0.02, 0.27), (x, sh * 0.52, 0.29))
        add('fLo' + s, 'fUp' + s, (x, sh * 0.52, 0.29), (x, 0.07, 0.30))
        add('fPaw' + s, 'fLo' + s, (x, 0.07, 0.30), (x, 0.02, 0.37))
        # back leg (digitigrade: knee forward, hock back)
        add('bUp' + s, 'hips', (x * 1.05, sh - 0.02, -0.31), (x, sh * 0.58, -0.20))
        add('bMid' + s, 'bUp' + s, (x, sh * 0.58, -0.20), (x, sh * 0.25, -0.36))
        add('bLo' + s, 'bMid' + s, (x, sh * 0.25, -0.36), (x, 0.07, -0.34))
        add('bPaw' + s, 'bLo' + s, (x, 0.07, -0.34), (x, 0.02, -0.27))
    # tail curving up and back
    tp = [(0, sh + 0.06, -0.48), (0, sh + 0.13, -0.62), (0, sh + 0.28, -0.72), (0, sh + 0.46, -0.75), (0, sh + 0.62, -0.71), (0, sh + 0.74, -0.64)]
    par = 'hips'
    for i in range(5):
        add('tail%d' % i, par, tp[i], tp[i + 1]); par = 'tail%d' % i
    return B, tp

def cat_sdf(p, P, B, tp):
    bw, bh = P['body_w'], P['body_h']
    bone = {b['name']: b for b in B}
    sh = bone['hips']['pos'][1] - 0.02
    d = np.full(len(p), 1e9)
    # torso: three masses
    d = smin(d, sd_ellipsoid(p, V((0, sh + 0.01, -0.30)), V((0.165 * bw, 0.175 * bh, 0.21))), 0.08)
    d = smin(d, sd_ellipsoid(p, V((0, sh - 0.01 - P['belly_drop'], -0.06)), V((0.17 * bw, 0.17 * bh, 0.25))), 0.08)
    d = smin(d, sd_ellipsoid(p, V((0, sh + 0.04, 0.19)), V((0.165 * bw, 0.2 * bh, 0.19))), 0.08)
    # neck
    nk = P['neck']
    d = smin(d, sd_roundcone(p, V((0, sh + 0.1, 0.32)), V((0, sh + 0.27 * nk, 0.5)), 0.11 * bw, 0.085), 0.07)
    # head
    hr = P['head_r']; hc = V((0, sh + 0.32, 0.56))
    d = smin(d, sd_ellipsoid(p, hc, V((hr * 1.08, hr * 0.92, hr * 0.98))), 0.05)
    mz = P['muzzle']
    for sx in (1, -1):  # cheeks
        d = smin(d, sd_ellipsoid(p, hc + V((sx * 0.075, -0.05, 0.07)), V((0.085, 0.07, 0.075))), 0.04)
    d = smin(d, sd_ellipsoid(p, hc + V((0, -0.055, 0.12 * mz)), V((0.065, 0.05, 0.05 * mz))), 0.035)  # muzzle
    d = smin(d, sd_ellipsoid(p, hc + V((0, -0.1, 0.09)), V((0.045, 0.03, 0.05))), 0.03)  # chin
    # brow ridge (angry look)
    for sx in (1, -1):
        d = smin(d, sd_ellipsoid(p, hc + V((sx * 0.06, 0.04, 0.115)), V((0.05, 0.022, 0.03))), 0.025)
    # ears: flattened round cones
    for s, sx in (('L', 1), ('R', -1)):
        e = bone['ear' + s]; a = V(e['pos']); b = V(e['tail'])
        b = a + (b - a) * P['ear']
        q = p.copy(); q[:, 2] = a[2] + (q[:, 2] - a[2]) * 2.6  # flatten front/back
        d = smin(d, sd_roundcone(q, a, b, 0.065 * P['ear_w'], 0.008), 0.03)
    # legs
    lt = P['leg_th']
    for s in ('L', 'R'):
        u, lo, pw = bone['fUp' + s], bone['fLo' + s], bone['fPaw' + s]
        d = smin(d, sd_roundcone(p, V(u['pos']) + V((0, 0.05, 0)), V(u['tail']), 0.075 * lt, 0.05 * lt), 0.05)
        d = smin(d, sd_roundcone(p, V(lo['pos']), V(lo['tail']), 0.05 * lt, 0.037 * lt), 0.03)
        d = smin(d, sd_ellipsoid(p, V(pw['pos']) + V((0, -0.035, 0.035)), V((0.05 * lt, 0.032, 0.065))), 0.03)
        u, m, lo, pw = bone['bUp' + s], bone['bMid' + s], bone['bLo' + s], bone['bPaw' + s]
        d = smin(d, sd_ellipsoid(p, V(u['pos']) + V((0, -0.08, 0.03)), V((0.095 * lt, 0.17, 0.14))), 0.06)  # thigh
        d = smin(d, sd_roundcone(p, V(m['pos']), V(m['tail']), 0.055 * lt, 0.04 * lt), 0.03)
        d = smin(d, sd_roundcone(p, V(lo['pos']), V(lo['tail']), 0.038 * lt, 0.034 * lt), 0.02)
        d = smin(d, sd_ellipsoid(p, V(pw['pos']) + V((0, -0.035, 0.03)), V((0.048 * lt, 0.03, 0.065))), 0.03)
    # tail
    tr = P['tail_r']
    d = smin(d, chain(p, tp, [0.05 * tr, 0.045 * tr, 0.042 * tr, 0.038 * tr, 0.034 * tr, 0.02 * tr]), 0.04)
    if P['fluff'] > 0:  # mane + chest fluff + cheek tufts
        f = P['fluff']
        d = smin(d, sd_ellipsoid(p, hc + V((0, -0.12, -0.02)), V((0.21, 0.17, 0.15)) * f), 0.08)
        d = smin(d, sd_ellipsoid(p, V((0, sh - 0.04, 0.27)), V((0.15, 0.17, 0.12)) * f), 0.08)
        for sx in (1, -1):
            d = smin(d, sd_ellipsoid(p, hc + V((sx * 0.14, -0.07, 0.0)), V((0.07, 0.08, 0.07)) * f), 0.05)
    return d

# ---------------- mesh generation ----------------
def make_mesh(kind, res=0.0075, target=6500):
    P = cat_params(kind)
    B, tp = build_skeleton(P)
    lo = V((-0.42, -0.02, -0.95)); hi = V((0.42, 1.55, 0.95))
    n = np.ceil((hi - lo) / res).astype(int) + 1
    xs = [np.linspace(lo[i], lo[i] + res * (n[i] - 1), n[i]) for i in range(3)]
    X, Y, Z = np.meshgrid(*xs, indexing='ij')
    pts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
    d = np.empty(len(pts))
    CH = 400000
    for i in range(0, len(pts), CH):
        d[i:i + CH] = cat_sdf(pts[i:i + CH], P, B, tp)
    d = d.reshape(n)
    verts, faces, _, _ = measure.marching_cubes(d, 0.0, spacing=(res, res, res))
    verts += lo
    verts[:, 1] = np.maximum(verts[:, 1], 0)
    s = pyfqmr.Simplify(); s.setMesh(verts, faces)
    s.simplify_mesh(target_count=target, aggressiveness=5, preserve_border=True, verbose=0)
    verts, faces, _ = s.getMesh()
    verts = verts.astype(np.float64); faces = faces.astype(np.int64)
    # fix winding: marching_cubes from skimage gives outward normals with gradient direction; ensure outward
    nrm = vertex_normals(verts, faces)
    cen = verts.mean(0)
    if np.mean(np.sum((verts - cen) * nrm, 1)) < 0:
        faces = faces[:, ::-1]; nrm = -nrm
    # smooth (taubin-ish) a couple of iterations to remove MC terracing
    verts = laplacian(verts, faces, 2, 0.4)
    nrm = vertex_normals(verts, faces)
    return P, B, tp, verts, faces, nrm, lambda q: cat_sdf(q, P, B, tp)

def vertex_normals(v, f):
    n = np.zeros_like(v)
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    for k in range(3): np.add.at(n, f[:, k], fn)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)

def laplacian(v, f, it, lam):
    nv = len(v)
    for _ in range(it):
        acc = np.zeros_like(v); cnt = np.zeros(nv)
        for a, b in ((0, 1), (1, 2), (2, 0)):
            np.add.at(acc, f[:, a], v[f[:, b]]); np.add.at(cnt, f[:, a], 1)
            np.add.at(acc, f[:, b], v[f[:, a]]); np.add.at(cnt, f[:, b], 1)
        avg = acc / np.maximum(cnt, 1)[:, None]
        v = v + lam * (avg - v)
    return v

# ---------------- skinning ----------------
def seg_dist(p, a, b):
    ba = b - a; pa = p - a
    h = np.clip((pa @ ba) / max(ba @ ba, 1e-12), 0, 1)
    return np.linalg.norm(pa - h[:, None] * ba, axis=1), h

def skin(verts, B):
    nb = len(B); nv = len(verts)
    D = np.zeros((nv, nb))
    for i, b in enumerate(B):
        D[:, i], _ = seg_dist(verts, V(b['pos']), V(b['tail']))
    D[:, 0] = 1e3  # root never deforms
    names = [b['name'] for b in B]
    # keep left/right limbs strictly separated by side of the body
    for i, nm in enumerate(names):
        if nm.endswith('L') and (nm.startswith(('f', 'b', 'ear'))): D[verts[:, 0] < -0.01, i] += 1
        if nm.endswith('R') and (nm.startswith(('f', 'b', 'ear'))): D[verts[:, 0] > 0.01, i] += 1
    # legs only influence below the torso
    W = np.exp(-(D / 0.035) ** 2) + 1e-9
    W *= (D < D.min(1, keepdims=True) + 0.09)
    idx = np.argsort(-W, 1)[:, :4]
    w = np.take_along_axis(W, idx, 1)
    w = w / w.sum(1, keepdims=True)
    return idx.astype(np.uint8), w

# ---------------- baked masks ----------------
def masks(verts, nrm, B, sdf, P):
    bone = {b['name']: b for b in B}
    sh = bone['hips']['pos'][1] - 0.02
    y = verts[:, 1]; z = verts[:, 2]; x = verts[:, 0]
    # belly/chest/chin (white underside)
    under = np.clip(-nrm[:, 1] * 1.3 + 0.1, 0, 1) * (y > 0.25)
    chest = np.exp(-((z - 0.32) ** 2) / 0.012 - (x ** 2) / 0.01) * (nrm[:, 2] > -0.2) * (y < sh + 0.25) * (y > sh - 0.25)
    hc = V(bone['head']['pos'])
    muzzle = np.exp(-np.sum((verts - (hc + V((0, -0.08, 0.13)))) ** 2, 1) / 0.004)
    belly = np.clip(np.maximum.reduce([under, chest, muzzle]), 0, 1)
    # extremities (siamese points): distance from torso core
    core = np.minimum.reduce([seg_dist(verts, V(bone['hips']['pos']), V(bone['chest']['tail']))[0]])
    ext = np.clip((core - 0.18) / 0.22, 0, 1)
    face = np.exp(-np.sum((verts - (hc + V((0, -0.04, 0.1)))) ** 2, 1) / 0.006)
    ext = np.clip(np.maximum(ext, face), 0, 1)
    # stripe coordinate: torso -> z, legs -> y, tail -> param along tail
    stripe = z * 1.0 + y * 0.35
    # cavity AO from SDF: sample outward along normal
    occ = np.zeros(len(verts))
    for k, dist in enumerate((0.02, 0.05, 0.1)):
        s = sdf(verts + nrm * dist)
        occ += np.clip((dist - s) / dist, 0, 1) * (0.5 ** k)
    ao = np.clip(1 - occ * 0.7, 0.2, 1)
    return np.stack([belly, ext, (stripe + 1) / 3, ao], 1)

def surface_point(sdf, origin, direction):
    """march from outside toward origin along direction to find surface point"""
    d = V(direction, dtype=float); d /= np.linalg.norm(d)
    p = V(origin, dtype=float) + d * 0.4
    for _ in range(200):
        s = sdf(p[None])[0]
        if abs(s) < 1e-4: break
        p = p - d * s * 0.8
    return p

def attachments(P, B, sdf):
    bone = {b['name']: b for b in B}
    hc = V(bone['head']['pos']) + V((0, 0.02, 0.03))
    A = {}
    for s, sx in (('L', 1), ('R', -1)):
        e = surface_point(sdf, hc + V((sx * 0.06, 0.02, 0)), (sx * 0.38, 0.12, 1))
        A['eye' + s] = list(map(float, e - V((sx * 0.004, 0, 0.012))))
        f = surface_point(sdf, hc + V((sx * 0.025, -0.08, 0.05)), (sx * 0.15, -0.25, 1))
        A['fang' + s] = list(map(float, f))
        h = surface_point(sdf, hc + V((sx * 0.07, 0.06, 0)), (sx * 0.5, 1, 0.15))
        A['horn' + s] = list(map(float, h))
    A['nose'] = list(map(float, surface_point(sdf, hc + V((0, -0.03, 0.05)), (0, 0.15, 1))))
    A['crown'] = list(map(float, surface_point(sdf, hc, (0, 1, -0.1))))
    A['back'] = list(map(float, surface_point(sdf, V(bone['spine']['pos']), (0, 1, 0))))
    A['shoulder'] = list(map(float, surface_point(sdf, V(bone['chest']['pos']), (0, 1, 0))))
    A['headR'] = float(P['head_r'])
    return A

def main():
    import sys
    only = sys.argv[1:]
    meta = {}; blob = bytearray()
    if only:  # append to the existing pack
        meta = json.load(open(os.path.join(OUT, 'cats.json'))); blob = bytearray(open(os.path.join(OUT, 'cats.bin'), 'rb').read())
    def push(arr):
        nonlocal blob
        while len(blob) % 4: blob.append(0)
        off = len(blob); blob += arr.tobytes(); return off
    kinds = (('base', 6500), ('lean', 6000), ('fluffy', 7500), ('brute', 6800), ('dog', 6800))
    for kind, tgt in [k for k in kinds if not only or k[0] in only]:
        P, B, tp, v, f, n, sdf = make_mesh(kind, target=tgt)
        idx, w = skin(v, B)
        M = masks(v, n, B, sdf, P)
        A = attachments(P, B, sdf)
        pos = v.astype(np.float32); nrm = (n * 127).round().clip(-127, 127).astype(np.int8)
        nrm4 = np.concatenate([nrm, np.zeros((len(nrm), 1), np.int8)], 1)
        wq = (w * 255).round().astype(np.int32)
        wq[:, 0] += 255 - wq.sum(1)  # exact sum to 255
        wq = wq.clip(0, 255).astype(np.uint8)
        mq = (M.clip(0, 1) * 255).round().astype(np.uint8)
        ind = f.astype(np.uint16 if len(v) < 65535 else np.uint32)
        meta[kind] = dict(
            count=int(len(v)), index=int(ind.size), index32=bool(ind.dtype == np.uint32),
            pos=push(pos), nrm=push(nrm4), skinI=push(idx), skinW=push(wq), mask=push(mq), ind=push(ind),
            bones=[dict(name=b['name'], parent=b['parent'], pos=b['pos']) for b in B], att=A)
        print(kind, len(v), 'verts', len(f), 'tris')
    open(os.path.join(OUT, 'cats.bin'), 'wb').write(bytes(blob))
    json.dump(meta, open(os.path.join(OUT, 'cats.json'), 'w'))
    print('bytes', len(blob))

if __name__ == '__main__':
    main()
