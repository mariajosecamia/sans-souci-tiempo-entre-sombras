# Nubes sueltas: pinta 6 nubes distintas (bordes deshilachados que se funden en el cielo) con los colores
# del cielo de la lámina: luces arriba, panza en sombra, grano de papel. Cada nube es un cuadro de 640×240.
# Uso: python3 tools/skydrift.py public/art/jardin-1920.webp [semilla]  → public/art/jardin-1920-clouds.webp (3840×240)
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom
path = sys.argv[1]; base = path[:-5]
rng = np.random.default_rng(int(sys.argv[2]) if len(sys.argv) > 2 else 3)
plate = np.array(Image.open(path).convert('RGB')).astype(np.float32)
fg = np.array(Image.open(base + '-fg.webp').convert('RGBA'))
sky = fg[..., 3] < 20
px = plate[sky]
lum = px.mean(1)
hi = px[lum >= np.percentile(lum, 88)].mean(0) * 1.18   # cara iluminada
mid = px[(lum > np.percentile(lum, 40)) & (lum < np.percentile(lum, 60))].mean(0)
lo = px[lum <= np.percentile(lum, 15)].mean(0) * 0.74   # panza en sombra
FW, FH, N = 640, 240, 6
yy, xx = np.mgrid[0:FH, 0:FW].astype(np.float32)
def fbm(oct=5):
    out = np.zeros((FH, FW), np.float32); a = 1.0
    for o in range(oct):
        c = 3 * 2 ** o
        g = rng.random((max(2, c * FH // FW + 2), c + 2))
        out += a * zoom(g, (FH / g.shape[0], FW / g.shape[1]), order=3)[:FH, :FW]; a *= 0.5
    return (out - out.min()) / (out.max() - out.min())
frames = []
for k in range(N):
    # cuerpo: varios lóbulos elípticos, más anchos que altos, apoyados sobre una base más plana
    d = np.zeros((FH, FW), np.float32)
    n = rng.integers(6, 11)
    cxs = rng.uniform(0.22, 0.78, n) * FW
    for i in range(n):
        cx, cy = cxs[i], FH * rng.uniform(0.38, 0.6) + 0.0015 * (cxs[i] - FW / 2) ** 2 * 0.1
        rx, ry = rng.uniform(70, 160), rng.uniform(45, 85)
        d += np.exp(-(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) * 1.6)
    d = d / d.max()
    d *= 0.45 + 0.9 * fbm()
    d = np.clip((d - 0.22) / 0.5, 0, 1) ** 1.2
    # nada llega al borde del cuadro: así nunca se ve un corte
    edge = np.clip(np.minimum.reduce([xx, FW - 1 - xx, yy * 1.6, (FH - 1 - yy) * 1.6]) / 40, 0, 1)
    d *= edge
    d = gaussian_filter(d, 4.5)
    # luz desde arriba, como aguada: arriba de la nube más clara, la panza más oscura, con manchas
    v = np.clip((yy - FH * 0.3) / (FH * 0.4), 0, 1)
    v = np.clip(v + (fbm() - 0.5) * 0.5, 0, 1)
    tone = 1 - v
    col = np.where(tone[..., None] > 0.5, mid + (hi - mid) * ((tone[..., None] - 0.5) * 2), lo + (mid - lo) * (tone[..., None] * 2))
    col *= (0.96 + 0.08 * gaussian_filter(rng.random((FH, FW)), 1.0))[..., None]
    a = np.clip(d * 1.1, 0, 0.85) ** 1.15
    frames.append(np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8))
Image.fromarray(np.concatenate(frames, 1), 'RGBA').save(base + '-clouds.webp', quality=88)
print(base, 'nubes', N)
