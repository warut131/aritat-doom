"""Level 2 (Roman underworld) textures: marble, ashlar stone blocks, forum flagstones (+ glowing crack mask).
Run: python3 tools/gen_rome_tex.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from gen_textures import *  # noqa: F401,F403  (helpers + OUT)

def marble(n=1024):
    # turbulent veins: sin of (x + warp) gives the classic marble look
    yy, xx = np.mgrid[0:n, 0:n] / n
    w = fbm(n, 2, 6, 301) * 2.2 + fbm(n, 4, 5, 302) * 0.6
    v = np.abs(np.sin((xx * 2 + yy * 1 + w) * np.pi * 2))
    vein = np.clip((0.06 - v) * 18, 0, 1) * np.clip((fbm(n, 3, 3, 305) - 0.3) * 3, 0, 1)
    v2 = np.abs(np.sin((xx * 1 - yy * 3 + w * 1.6) * np.pi * 2))
    vein = np.maximum(vein, np.clip((0.025 - v2) * 40, 0, 1) * 0.5)
    vein = blur(vein, 0.8)
    cloud = fbm(n, 4, 6, 303)
    tone = 0.86 + (cloud - 0.5) * 0.1 - vein * 0.42
    rgb = np.stack([tone * 1.0, tone * 0.985, tone * 0.955], -1)
    dirt = np.clip((fbm(n, 3, 5, 304) - 0.55) * 2.5, 0, 1)
    rgb *= (1 - dirt[..., None] * 0.25)
    save_rgb('marble_c.jpg', rgb)
    save_png('marble_n.png', normal_from_height(blur(cloud * 0.2 - vein * 0.3 - dirt * 0.2, 1.0), 1.2))
    save_rgb('marble_orm.jpg', orm(np.clip(0.28 + dirt * 0.45 + vein * 0.1, 0, 1)))

def ashlar(n=1024, rows=6, cols=3):
    # big running-bond stone blocks with chipped edges (tinted per use: travertine / tuff / dark basalt)
    yy, xx = np.mgrid[0:n, 0:n]
    bh = n // rows; bw = n // cols
    row = yy // bh; off = (row % 2) * (bw // 2)
    gx = (xx + off) % bw; gy = yy % bh
    edge = np.minimum(np.minimum(gx, bw - gx), np.minimum(gy, bh - gy)).astype(float)
    chip = fbm(n, 16, 5, 311) * 10
    groove = np.clip((edge - chip * 0.6) / 7, 0, 1)
    bid = ((xx + off) // bw) + row * 97
    r = np.random.default_rng(312); tv = r.random(rows * 97 + cols + 2)[bid % (rows * 97 + cols + 2)]
    pores = blur((rng.random((n, n)) > 0.992).astype(float), 0.8)
    h = groove * 0.9 + fbm(n, 12, 6, 313) * 0.25 - pores * 0.6
    tone = (0.62 + tv * 0.12 + (fbm(n, 6, 6, 314) - 0.5) * 0.18 - pores * 0.25) * (0.45 + 0.55 * groove)
    stain = np.clip(blur(rng.random((n, n)), (30, 1)) * 0, 0, 1) + np.clip((fbm(n, 3, 5, 315) - 0.6) * 3, 0, 1)
    rgb = np.stack([tone, tone * 0.96, tone * 0.9], -1) * (1 - stain[..., None] * 0.3)
    save_rgb('ashlar_c.jpg', rgb)
    save_png('ashlar_n.png', normal_from_height(blur(h, 0.7), 3.0))
    save_rgb('ashlar_orm.jpg', orm(np.clip(0.86 - stain * 0.15, 0, 1), None, 0.5 + 0.5 * groove))

def jvor(n, g, seed):
    # periodic voronoi on a jittered grid (no duplicate seeds)
    r = np.random.default_rng(seed); c = n / g
    P = [((i + 0.15 + r.random() * 0.7) * c, (j + 0.15 + r.random() * 0.7) * c) for j in range(g) for i in range(g)]
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    f1 = np.full((n, n), 1e9, np.float32); f2 = f1.copy(); idc = np.zeros((n, n), np.int32)
    for k, (px, py) in enumerate(P):
        dx = np.abs(xx - px); dx = np.minimum(dx, n - dx); dy = np.abs(yy - py); dy = np.minimum(dy, n - dy)
        d = np.sqrt(dx * dx + dy * dy); m = d < f1
        f2 = np.where(m, f1, np.minimum(f2, d)); idc = np.where(m, k, idc); f1 = np.where(m, d, f1)
    return f1, f2, idc

def flagstone(n=1024):
    # irregular forum slabs (voronoi) with cracks; mask of the deepest cracks glows like the underworld
    f1, f2, idc = jvor(n, 7, 321)
    border = np.clip(((f2 - f1) - 3) / 5, 0, 1)
    r = np.random.default_rng(322); tv = r.random(64)[idc % 64]
    wear = fbm(n, 6, 6, 323)
    cr = ridged(n, 5, 5, 324); crack = np.clip((cr - 0.88) * 9, 0, 1) * np.clip((fbm(n, 4, 3, 325) - 0.45) * 4, 0, 1)
    h = border * 0.9 + wear * 0.25 - crack * 0.8
    tone = (0.46 + tv * 0.14 + (wear - 0.5) * 0.16) * (0.35 + 0.65 * border) * (1 - crack * 0.6)
    moss = np.clip((fbm(n, 5, 5, 326) - 0.58) * 3, 0, 1) * (1 - border * 0.7)
    rgb = np.stack([tone * 1.0, tone * 0.95, tone * 0.86], -1)
    rgb = rgb * (1 - moss[..., None] * 0.4)
    save_rgb('flag_c.jpg', rgb)
    save_png('flag_n.png', normal_from_height(blur(h, 0.6), 4.0))
    save_rgb('flag_orm.jpg', orm(np.clip(0.8 + (wear - 0.5) * 0.2, 0, 1), None, 0.45 + 0.55 * border))
    glow = np.maximum((1 - border) ** 3 * np.clip((fbm(n, 3, 3, 327) - 0.5) * 4, 0, 1), crack)
    glow = np.maximum(glow, blur(glow, 3) * 0.7)
    save_gray('flag_glow.jpg', norm01(glow))

if __name__ == '__main__':
    for f in (marble, ashlar, flagstone):
        f(); print('ok', f.__name__)
