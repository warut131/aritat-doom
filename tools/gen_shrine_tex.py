"""Level 3 (Yokai shrine) textures: raked gravel, kawara roof tiles, weathered red lacquer.
Run: python3 tools/gen_shrine_tex.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from gen_textures import *  # noqa: F401,F403

def gravel(n=1024):
    # zen garden gravel: fine pebbles + raked parallel furrows, darkened and damp at night
    yy, xx = np.mgrid[0:n, 0:n].astype(float)
    f1, f2, idc = voronoi(n, 2600, 401)
    peb = np.clip((f2 - f1) / 3.5, 0, 1)                      # pebble borders
    r = np.random.default_rng(402); tv = r.random(2600)[idc]
    warp = fbm(n, 2, 4, 403) * 30
    rake = 0.5 + 0.5 * np.sin((yy + warp) / n * np.pi * 2 * 24)
    h = rake * 0.55 + (1 - np.clip(f1 / 6, 0, 1)) * 0.35 + fbm(n, 16, 4, 404) * 0.15
    tone = (0.50 + tv * 0.16 + (fbm(n, 8, 5, 405) - 0.5) * 0.12) * (0.55 + 0.45 * peb) * (0.72 + 0.28 * rake)
    rgb = np.stack([tone * 0.95, tone * 0.96, tone * 1.0], -1)
    moss = np.clip((fbm(n, 4, 5, 406) - 0.62) * 3, 0, 1)
    rgb = rgb * (1 - moss[..., None] * 0.35) + moss[..., None] * np.array([0.05, 0.09, 0.04])
    save_rgb('gravel_c.jpg', rgb)
    save_png('gravel_n.png', normal_from_height(blur(h, 0.8), 3.5))
    save_rgb('gravel_orm.jpg', orm(np.clip(0.88 - rake * 0.08, 0, 1), None, 0.55 + 0.45 * peb))

def kawara(n=512, rows=8, cols=8):
    # interlocking clay roof tiles: rounded ridges (marugawara) over concave channels
    yy, xx = np.mgrid[0:n, 0:n].astype(float)
    cw = n / cols; rh = n / rows
    u = (xx % cw) / cw; v = (yy % rh) / rh
    ridge = np.cos((u - 0.5) * np.pi) ** 2                    # round tile profile
    lap = np.clip((v - 0.82) / 0.18, 0, 1)                    # overlap shadow at row end
    h = ridge * 0.8 + (1 - v) * 0.15 - lap * 0.5
    row = (yy // rh).astype(int); col_ = (xx // cw).astype(int)
    r = np.random.default_rng(411); tv = r.random(rows * cols)[(row * cols + col_) % (rows * cols)]
    tone = (0.26 + tv * 0.06 + (fbm(n, 6, 5, 412) - 0.5) * 0.08) * (0.55 + 0.45 * ridge) * (1 - lap * 0.6)
    rgb = np.stack([tone * 0.92, tone * 0.98, tone * 1.08], -1)
    lich = np.clip((fbm(n, 5, 5, 413) - 0.6) * 3, 0, 1)
    rgb = rgb * (1 - lich[..., None] * 0.3) + lich[..., None] * np.array([0.08, 0.1, 0.05])
    save_rgb('kawara_c.jpg', rgb)
    save_png('kawara_n.png', normal_from_height(blur(h, 0.6), 6))
    save_rgb('kawara_orm.jpg', orm(np.clip(0.55 + (1 - ridge) * 0.25, 0, 1), None, 0.5 + 0.5 * ridge))

def lacquer(n=512):
    # vermilion (shu-iro) lacquered wood, cracked and worn to black at the edges
    yy, xx = np.mgrid[0:n, 0:n].astype(float)
    fib = norm01(blur(np.random.default_rng(421).random((n, n)), (0.5, 30)))
    wear = np.clip((fbm(n, 6, 6, 422) - 0.66) * 2.5, 0, 1) * 0.8
    cr = ridged(n, 8, 4, 423); crack = np.clip((cr - 0.82) * 8, 0, 1) * 0.7
    red = np.array([0.62, 0.09, 0.04]); blk = np.array([0.06, 0.03, 0.025])
    t = np.clip(wear + crack, 0, 1)
    rgb = red[None, None] * (0.85 + fib[..., None] * 0.2) * (1 - t[..., None]) + blk[None, None] * t[..., None]
    rgb *= (0.9 + (fbm(n, 4, 4, 424) - 0.5) * 0.2)[..., None]
    save_rgb('lacq_c.jpg', rgb)
    save_png('lacq_n.png', normal_from_height(blur(fib * 0.25 - crack * 0.6, 0.6), 2.5))
    save_rgb('lacq_orm.jpg', orm(np.clip(0.38 + wear * 0.45 + crack * 0.2, 0, 1)))

if __name__ == '__main__':
    for f in (gravel, kawara, lacquer):
        f(); print('ok', f.__name__)
