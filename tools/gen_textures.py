"""Procedural, tileable PBR textures for Aritat DOOM.
Run: python3 tools/gen_textures.py  -> writes assets/tex/*.jpg|png
Every map tiles seamlessly (all noise is periodic)."""
import numpy as np, os
from PIL import Image
from scipy import ndimage as ndi

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'tex')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

# ---------------- noise helpers (periodic) ----------------
def pnoise(n, cells, seed=0):
    """Periodic value-noise (smooth) of size n x n with `cells` lattice cells."""
    r = np.random.default_rng(seed)
    g = r.random((cells, cells))
    x = np.arange(n) * cells / n
    i0 = np.floor(x).astype(int); f = x - i0; i1 = (i0 + 1) % cells
    f = f * f * f * (f * (f * 6 - 15) + 10)
    a = g[i0][:, i0]; b = g[i0][:, i1]; c = g[i1][:, i0]; d = g[i1][:, i1]
    fy = f[:, None]; fx = f[None, :]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def fbm(n, base=4, oct=6, seed=0, gain=0.5):
    s = np.zeros((n, n)); amp = 1; tot = 0
    for o in range(oct):
        c = base * 2 ** o
        if c > n: break
        s += amp * pnoise(n, c, seed + o * 31); tot += amp; amp *= gain
    return s / tot

def ridged(n, base=4, oct=5, seed=0):
    s = np.zeros((n, n)); amp = 1; tot = 0
    for o in range(oct):
        c = base * 2 ** o
        if c > n: break
        v = 1 - np.abs(pnoise(n, c, seed + o * 17) * 2 - 1)
        s += amp * v * v; tot += amp; amp *= 0.5
    return s / tot

def voronoi(n, pts, seed=0):
    """periodic F1/F2 distance + cell id"""
    r = np.random.default_rng(seed)
    P = r.random((pts, 2)) * n
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    f1 = np.full((n, n), 1e9, np.float32); f2 = f1.copy(); idc = np.zeros((n, n), np.int32)
    for k, (px, py) in enumerate(P):
        dx = np.abs(xx - px); dx = np.minimum(dx, n - dx)
        dy = np.abs(yy - py); dy = np.minimum(dy, n - dy)
        d = np.sqrt(dx * dx + dy * dy)
        m = d < f1
        f2 = np.where(m, f1, np.minimum(f2, d)); idc = np.where(m, k, idc); f1 = np.where(m, d, f1)
    return f1, f2, idc

def blur(a, s): return ndi.gaussian_filter(a, s, mode='wrap')
def norm01(a): a = a - a.min(); return a / (a.max() + 1e-9)

def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    nx = -dx * strength; ny = dy * strength; nz = np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    n = np.stack([nx / l, ny / l, nz / l], -1)
    return ((n * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8)

def save_rgb(name, rgb, q=88):
    Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, name), quality=q)

def save_png(name, arr):
    # normal maps: high-quality JPG keeps size down for the web
    Image.fromarray(arr).save(os.path.join(OUT, name.replace('.png', '.jpg')), quality=92)

def save_gray(name, g, q=88):
    Image.fromarray((np.clip(g, 0, 1) * 255).astype(np.uint8), 'L').save(os.path.join(OUT, name), quality=q)

def orm(rough, metal=None, ao=None):
    """pack AO(R) Roughness(G) Metal(B) like glTF"""
    n = rough.shape[0]
    ao = np.ones((n, n)) if ao is None else ao
    metal = np.zeros((n, n)) if metal is None else metal
    return np.stack([ao, rough, metal], -1)

def col(hexs):
    h = hexs.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])

def lerp3(a, b, t): return a[None, None, :] * (1 - t[..., None]) + b[None, None, :] * t[..., None]

# ======================== ASPHALT (wet, cracked, puddles) ========================
def asphalt(n=1024):
    base = fbm(n, 8, 7, 1)
    grains = rng.random((n, n)); grains = (grains > 0.7) * rng.random((n, n))
    stones = np.clip(blur(grains, 0.9) * 2.2, 0, 1)
    big = fbm(n, 3, 4, 2)
    # cracks: ridged noise thresholded
    def contour(seed, base, w):
        f = fbm(n, base, 6, seed); r = 1 - np.abs(f * 2 - 1)
        return np.clip((r - (1 - w)) / w, 0, 1) ** 2
    cr = contour(3, 3, 0.035)
    crack = cr * np.clip((fbm(n, 4, 3, 9) - 0.42) * 6, 0, 1)
    lava_pre = np.maximum(contour(3, 3, 0.05), contour(77, 2, 0.04)) * np.clip((fbm(n, 3, 3, 21) - 0.48) * 5, 0, 1)
    # puddles: low frequency blobs
    pud = np.clip((fbm(n, 3, 5, 4) - 0.56) * 7, 0, 1)
    pud = blur(pud, 2)
    h = base * 0.6 + stones * 0.9 - crack * 1.6 - lava_pre * 1.2 - pud * 0.4
    tone = 0.09 + base * 0.06 + stones * 0.16 - crack * 0.06 + (big - 0.5) * 0.06
    tone = tone * (1 - pud * 0.35)
    rgb = np.stack([tone * 1.02, tone * 0.98, tone * 0.97], -1)
    # oil stains
    oil = np.clip((fbm(n, 6, 4, 5) - 0.62) * 4, 0, 1)
    rgb *= (1 - oil[..., None] * 0.35)
    save_rgb('asphalt_c.jpg', rgb)
    save_png('asphalt_n.png', normal_from_height(blur(h, 0.5), 7.0))
    rough = np.clip(0.82 - stones * 0.1 - pud * 0.75 + crack * 0.1 - oil * 0.25, 0.04, 1)
    save_rgb('asphalt_orm.jpg', orm(rough, None, np.clip(1 - crack * 0.6, 0, 1)))
    # emissive crack mask for lava (hell theme)
    lv = np.maximum(contour(3, 3, 0.05), contour(77, 2, 0.04))
    lava = lv * np.clip((fbm(n, 3, 3, 21) - 0.48) * 5, 0, 1)
    lava = np.maximum(lava, blur(lava, 4) * 0.8)
    save_gray('asphalt_lava.jpg', norm01(lava) if lava.max() > 0 else lava)

# ======================== SIDEWALK PAVERS ========================
def pavers(n=1024, tiles=4):
    t = n // tiles
    yy, xx = np.mgrid[0:n, 0:n]
    gx = (xx % t); gy = (yy % t)
    edge = np.minimum(np.minimum(gx, t - gx), np.minimum(gy, t - gy)).astype(float)
    groove = np.clip(edge / 6, 0, 1)
    tid = (xx // t) + (yy // t) * tiles
    r = np.random.default_rng(5); tv = r.random(tiles * tiles)[tid]
    dirt = fbm(n, 8, 6, 11)
    h = groove * 0.8 + fbm(n, 16, 5, 12) * 0.3
    tone = 0.36 + tv * 0.08 + (dirt - 0.5) * 0.18
    tone = tone * (0.55 + 0.45 * groove)
    stain = np.clip((fbm(n, 4, 5, 13) - 0.55) * 3, 0, 1)
    rgb = np.stack([tone * 1.0, tone * 0.96, tone * 0.92], -1) * (1 - stain[..., None] * 0.35)
    save_rgb('paver_c.jpg', rgb)
    save_png('paver_n.png', normal_from_height(h, 2.4))
    rough = np.clip(0.78 + (dirt - 0.5) * 0.2 - stain * 0.35, 0.1, 1)
    save_rgb('paver_orm.jpg', orm(rough, None, 0.55 + 0.45 * groove))

# ======================== PLASTER WALL (grayscale, tinted per building) ========================
def plaster(n=1024):
    h = fbm(n, 6, 7, 21)
    blotch = fbm(n, 3, 5, 22)
    # water streaks running down (vertical)
    streak = blur(rng.random((n, n)), (40, 0.8))
    streak = norm01(streak) * fbm(n, 4, 3, 23)
    grime = np.clip(streak * 1.6 - 0.35, 0, 1)
    # cracks
    cr = ridged(n, 4, 5, 24); crack = np.clip((cr - 0.9) * 10, 0, 1)
    # peeled paint patches
    peel = np.clip((fbm(n, 5, 5, 25) - 0.64) * 8, 0, 1)
    tone = 0.78 + (h - 0.5) * 0.12 + (blotch - 0.5) * 0.12
    tone = tone * (1 - grime * 0.45) * (1 - crack * 0.5) * (1 - peel * 0.3)
    rgb = np.stack([tone, tone * 0.985, tone * 0.97], -1)
    save_rgb('plaster_c.jpg', rgb)
    save_png('plaster_n.png', normal_from_height(blur(h * 0.4 - crack * 0.8 - peel * 0.5, 0.8), 2.2))
    rough = np.clip(0.88 - grime * 0.2, 0, 1)
    save_rgb('plaster_orm.jpg', orm(rough, None, 1 - crack * 0.5))

# ======================== CORRUGATED ROLLING SHUTTER ========================
def shutter(n=512):
    yy, xx = np.mgrid[0:n, 0:n]
    rib = 0.5 + 0.5 * np.sin(yy / n * np.pi * 2 * 24)
    h = rib + fbm(n, 8, 4, 31) * 0.1
    rust = np.clip((fbm(n, 4, 6, 32) - 0.5) * 3 + blur(rng.random((n, n)), (30, 1)) * 0.6 - 0.2, 0, 1)
    paint = lerp3(col('#7d8790'), col('#5a3420'), rust)
    paint *= (0.75 + 0.25 * rib)[..., None]
    grime = blur(rng.random((n, n)), (60, 1.2)); grime = norm01(grime)
    paint *= (1 - grime[..., None] * 0.35)
    save_rgb('shutter_c.jpg', paint)
    save_png('shutter_n.png', normal_from_height(h, 9))
    rough = np.clip(0.45 + rust * 0.45, 0, 1); metal = np.clip(0.85 - rust * 0.9, 0, 1)
    save_rgb('shutter_orm.jpg', orm(rough, metal, 0.7 + 0.3 * rib))

# ======================== PAINTED / RUSTY METAL ========================
def metal(n=512):
    h = fbm(n, 8, 6, 41)
    scratches = np.zeros((n, n))
    r = np.random.default_rng(42)
    for _ in range(260):
        x, y = r.integers(0, n, 2); L = r.integers(20, 140); a = r.random() * np.pi
        for t in range(L):
            px = int(x + np.cos(a) * t) % n; py = int(y + np.sin(a) * t) % n
            scratches[py, px] = 1
    scratches = blur(scratches, 0.5)
    rust = np.clip((fbm(n, 5, 6, 43) - 0.55) * 4, 0, 1)
    edgew = np.clip(scratches * 3, 0, 1)
    gray = 0.5 + (h - 0.5) * 0.2
    rgb = np.stack([gray] * 3, -1)
    rgb = rgb * (1 - rust[..., None]) + lerp3(col('#6a3018'), col('#3a1a0c'), fbm(n, 16, 3, 44)) * rust[..., None]
    rgb = rgb * (1 - edgew[..., None]) + np.array([0.75, 0.75, 0.76]) * edgew[..., None]
    save_rgb('metal_c.jpg', rgb)  # grayscale-ish so it can be tinted
    save_png('metal_n.png', normal_from_height(h * 0.3 - scratches * 0.6 + rust * 0.5, 2.5))
    rough = np.clip(0.42 + rust * 0.45 - edgew * 0.25 + (h - 0.5) * 0.1, 0.05, 1)
    met = np.clip(0.15 + edgew * 0.85 - rust * 0.2, 0, 1)
    save_rgb('metal_orm.jpg', orm(rough, met))

# ======================== WOOD PLANKS (crates/pallets) ========================
def wood(n=512, planks=4):
    yy, xx = np.mgrid[0:n, 0:n].astype(float)
    p = n // planks
    pid = (yy // p).astype(int)
    r = np.random.default_rng(51); off = r.random(planks)[pid] * n
    w = fbm(n, 4, 5, 52)
    # long fibres: sinusoid across the plank width, warped slowly along its length
    fib = blur(np.random.default_rng(54).random((n, n)), (0.6, 24)); fib = norm01(fib)
    grain = 0.5 + 0.5 * np.sin((yy % p) / p * np.pi * 2 * 5 + w * 9 + np.sin((xx + off) / n * np.pi * 2) * 2)
    grain = grain ** 4 * 0.7 + fib * 0.5
    gap = np.clip(np.minimum(yy % p, p - yy % p) / 4, 0, 1)
    tone = (0.42 + grain * 0.18 + r.random(planks)[pid] * 0.12) * (0.4 + 0.6 * gap)
    rgb = np.stack([tone * 1.0, tone * 0.72, tone * 0.48], -1)
    dirt = np.clip((fbm(n, 6, 4, 53) - 0.5) * 2, 0, 1)
    rgb *= (1 - dirt[..., None] * 0.4)
    save_rgb('wood_c.jpg', rgb)
    save_png('wood_n.png', normal_from_height(gap * 0.7 + grain * 0.12, 3))
    save_rgb('wood_orm.jpg', orm(np.clip(0.8 - grain * 0.1, 0, 1), None, 0.5 + 0.5 * gap))

# ======================== CONCRETE (poles, curbs, barriers) ========================
def concrete(n=512):
    h = fbm(n, 8, 7, 61)
    pores = (rng.random((n, n)) > 0.985).astype(float); pores = blur(pores, 0.6)
    stain = np.clip((fbm(n, 3, 5, 62) - 0.5) * 2.5, 0, 1)
    tone = 0.55 + (h - 0.5) * 0.15 - pores * 0.3
    tone *= (1 - stain * 0.4)
    rgb = np.stack([tone, tone * 0.98, tone * 0.95], -1)
    save_rgb('concrete_c.jpg', rgb)
    save_png('concrete_n.png', normal_from_height(h * 0.6 - pores * 1.2, 2.2))
    save_rgb('concrete_orm.jpg', orm(np.clip(0.85 - stain * 0.2, 0, 1)))

# ======================== FUR DETAIL (cats) ========================
def fur(n=512):
    # directional hair strands: many short streaks along Y
    s = np.zeros((n, n))
    r = np.random.default_rng(71)
    for _ in range(9000):
        x, y = r.random(2) * n; L = r.integers(6, 18); a = np.pi / 2 + (r.random() - 0.5) * 0.5; v = r.random() * 0.6 + 0.4
        for t in range(L):
            px = int(x + np.cos(a) * t) % n; py = int(y + np.sin(a) * t) % n
            s[py, px] = max(s[py, px], v * (1 - t / L) ** 0.5)
    s = blur(s, 0.6)
    h = norm01(s)
    save_png('fur_n.png', normal_from_height(h, 4))
    save_gray('fur_h.jpg', h)

# ======================== WINDOW ATLAS (4 x 2 interiors) ========================
def windows(n=512):
    """8 window looks: lit warm, lit cool fluorescent, curtained, dark, burning, blinds, shop-lit, red hell"""
    W = n // 4; H = n // 2
    img = np.zeros((n, n, 3)); emi = np.zeros((n, n, 3))
    r = np.random.default_rng(81)
    yy, xx = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]
    def frame(cell, ccol):
        f = (np.minimum(np.minimum(xx, 1 - xx), np.minimum(yy, 1 - yy)) < 0.06) | (np.abs(xx - 0.5) < 0.025) | (np.abs(yy - 0.42) < 0.02)
        cell[f] = ccol
        return f
    looks = []
    for k in range(8):
        c = np.zeros((H, W, 3)); e = np.zeros((H, W, 3))
        g = pnoise(max(W, H), 6, 90 + k)[:H, :W]
        if k == 0:   # warm lit room with silhouette furniture
            e[:] = col('#ffb366') * (0.55 + 0.45 * yy[..., None]); c[:] = 0.05
            sil = (yy > 0.62) & (np.abs(xx - 0.3) < 0.12); e[sil] *= 0.25
        elif k == 1: # cool fluorescent
            e[:] = col('#bfe8ff') * (0.75 + 0.25 * (1 - yy[..., None])); c[:] = 0.05
        elif k == 2: # curtain lit from behind (red/orange)
            folds = 0.6 + 0.4 * np.sin(xx * 40 + g * 3)
            e[:] = col('#d9542a') * folds[..., None] * 0.7; c[:] = 0.06
        elif k == 3: # dark room, faint TV glow
            c[:] = 0.02; e[:] = col('#3a6aff') * 0.05 * (np.exp(-((xx - 0.6) ** 2 + (yy - 0.7) ** 2) * 18))[..., None]
        elif k == 4: # burning
            fire = np.clip(1.2 - yy * 1.1 + (g - 0.5) * 0.8, 0, 1)
            e[:] = (col('#ff4a08') * fire[..., None] + col('#ffd27a') * (fire ** 4)[..., None]) * 1.2; c[:] = 0.02
        elif k == 5: # blinds
            bl = (np.sin(yy * 70) > 0.2).astype(float)
            e[:] = col('#ffd9a0') * (0.15 + 0.6 * bl)[..., None]; c[:] = 0.06
        elif k == 6: # dark with boarded planks
            c[:] = 0.03; planks = (np.abs(((yy * 4) % 1) - 0.5) < 0.32) & (np.abs(xx - 0.5) < 0.48)
            c[planks] = col('#3a2a1c') * 0.8
        else:        # hell red glow
            e[:] = col('#ff1a0a') * (0.4 + 0.6 * g[..., None]); c[:] = 0.02
        f = frame(c, col('#1c1a18')); e[f] = 0
        looks.append((c, e))
    for k, (c, e) in enumerate(looks):
        i, j = k % 4, k // 4
        img[j * H:(j + 1) * H, i * W:(i + 1) * W] = c; emi[j * H:(j + 1) * H, i * W:(i + 1) * W] = e
    save_rgb('win_c.jpg', img); save_rgb('win_e.jpg', np.clip(emi, 0, 1))

# ======================== BLOOD SPLATS (decal atlas 2x2, RGBA) ========================
def splats(n=512):
    out = np.zeros((n, n, 4)); h2 = n // 2
    for k in range(4):
        r = np.random.default_rng(100 + k)
        m = np.zeros((h2, h2))
        yy, xx = np.mgrid[0:h2, 0:h2] - h2 / 2
        rr = np.sqrt(xx * xx + yy * yy); ang = np.arctan2(yy, xx)
        wob = pnoise(h2, 8, 200 + k)
        core = rr < (h2 * 0.2) * (0.8 + 0.5 * wob)
        m[core] = 1
        for _ in range(26 + k * 6):
            a = r.random() * np.pi * 2; d = r.random() * h2 * 0.42; s = r.random() * h2 * 0.05 + 2
            cx = np.cos(a) * d; cy = np.sin(a) * d
            m[(xx - cx) ** 2 + (yy - cy) ** 2 < s * s] = 1
            # streak toward center
            for t in np.linspace(0, 1, 18):
                px, py = cx * t, cy * t; ss = s * 0.55 * (0.4 + t)
                m[(xx - px) ** 2 + (yy - py) ** 2 < ss * ss] = 1
        m = blur(m, 1.2); a_ = np.clip((m - 0.35) * 4, 0, 1)
        thick = blur(a_, 6)
        c = np.stack([0.32 + thick * 0.15, 0.01 + thick * 0.02, 0.01 + thick * 0.02], -1)
        i, j = k % 2, k // 2
        out[j * h2:(j + 1) * h2, i * h2:(i + 1) * h2, :3] = c
        out[j * h2:(j + 1) * h2, i * h2:(i + 1) * h2, 3] = a_
    Image.fromarray((out * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'splat.png'), optimize=True)

if __name__ == '__main__':
    for f in (asphalt, pavers, plaster, shutter, metal, wood, concrete, fur, windows, splats):
        f(); print('ok', f.__name__)
